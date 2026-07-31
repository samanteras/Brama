import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { embedBatch, EMBEDDING_BATCH_SIZE } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Embeds one batch of a document's chunks.
 *
 * Called repeatedly by the browser until `done` comes back true. Each call
 * claims whatever chunks still have no embedding, which makes it idempotent by
 * construction: a retried, duplicated or resumed call simply picks up what is
 * left rather than redoing or double-writing work.
 *
 * That property is what lets an interrupted upload — a closed tab, a dropped
 * connection — resume from a "Continue" button with no bookkeeping.
 */

const bodySchema = z.object({ documentId: z.uuid() })

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  // Authorization: read the document through the user's own client, where row
  // level security scopes it to bots they own. Everything after this point uses
  // the service role, because chunks are deliberately not writable from the
  // browser.
  const { data: document } = await supabase
    .from('documents')
    .select('id, bot_id, total_chunks, status')
    .eq('id', parsedBody.data.documentId)
    .maybeSingle()

  if (!document) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  }

  const admin = createAdminClient()

  const { data: pending, error: pendingError } = await admin
    .from('chunks')
    .select('id, content')
    .eq('document_id', document.id)
    .is('embedding', null)
    .order('chunk_index', { ascending: true })
    .limit(EMBEDDING_BATCH_SIZE)

  if (pendingError) {
    return NextResponse.json({ error: 'Could not read the document.' }, { status: 500 })
  }

  if (pending.length === 0) {
    // Nothing left: publish the document. Until this moment match_chunks has
    // been skipping it entirely.
    await admin
      .from('documents')
      .update({ status: 'ready', indexed_chunks: document.total_chunks, error_code: null })
      .eq('id', document.id)

    return NextResponse.json({ done: true, indexed: document.total_chunks, total: document.total_chunks })
  }

  let embeddings: number[][]

  try {
    embeddings = await embedBatch(pending.map((chunk) => chunk.content))
  } catch (error) {
    // Left in `processing` on purpose rather than marked failed: the batch is
    // safe to retry, and the caller can simply ask again.
    const message = error instanceof Error ? error.message : 'Embedding failed.'
    return NextResponse.json({ error: message, retryable: true }, { status: 502 })
  }

  // Written one row at a time because each carries its own vector; a bulk
  // upsert would need the full row shape and risks overwriting content.
  const writes = await Promise.all(
    pending.map((chunk, index) =>
      admin
        .from('chunks')
        .update({ embedding: JSON.stringify(embeddings[index]) })
        .eq('id', chunk.id),
    ),
  )

  const failed = writes.find((write) => write.error)
  if (failed) {
    return NextResponse.json({ error: 'Could not store embeddings.', retryable: true }, { status: 500 })
  }

  const { count: remaining } = await admin
    .from('chunks')
    .select('id', { count: 'exact', head: true })
    .eq('document_id', document.id)
    .is('embedding', null)

  const stillPending = remaining ?? 0
  const indexed = document.total_chunks - stillPending
  const done = stillPending === 0

  await admin
    .from('documents')
    .update({
      indexed_chunks: indexed,
      ...(done ? { status: 'ready' as const, error_code: null } : {}),
    })
    .eq('id', document.id)

  return NextResponse.json({ done, indexed, total: document.total_chunks })
}
