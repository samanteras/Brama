import { chunkText } from './chunk'
import { contentHash } from './hash'
import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * The tail every ingest route shares: hash, chunk, and write the document with
 * its unembedded chunks. Extracted so the upload route and the site importer
 * cannot drift apart in how a document enters the pipeline — the browser-driven
 * embedding loop that follows treats both identically.
 */

type AdminClient = ReturnType<typeof createAdminClient>

export type SaveDocumentParams = {
  botId: string
  filename: string
  sourceType: 'pdf' | 'text' | 'markdown' | 'paste' | 'website'
  /** Normalized text, i.e. a ParseResult document's `text`. */
  text: string
  pageCount: number
  storagePath?: string | null
}

export type SaveDocumentResult =
  | { ok: true; documentId: string; totalChunks: number }
  | { ok: false; error: 'empty-document' | 'duplicate-document' | 'chunk-write-failed' | 'save-failed' }

export async function saveDocument(
  admin: AdminClient,
  params: SaveDocumentParams,
): Promise<SaveDocumentResult> {
  const hash = contentHash(params.text)
  const chunks = chunkText(params.text)

  if (chunks.length === 0) {
    return { ok: false, error: 'empty-document' }
  }

  const { data: document, error: insertError } = await admin
    .from('documents')
    .insert({
      bot_id: params.botId,
      filename: params.filename,
      source_type: params.sourceType,
      content_hash: hash,
      status: 'processing',
      page_count: params.pageCount,
      total_chunks: chunks.length,
      indexed_chunks: 0,
      storage_path: params.storagePath ?? null,
    })
    .select('id')
    .single()

  if (insertError || !document) {
    // The unique constraint on (bot_id, content_hash) is what makes duplicate
    // detection reliable, rather than a check that could race.
    if (insertError?.code === '23505') {
      return { ok: false, error: 'duplicate-document' }
    }

    return { ok: false, error: 'save-failed' }
  }

  const { error: chunkError } = await admin.from('chunks').insert(
    chunks.map((chunk) => ({
      document_id: document.id,
      bot_id: params.botId,
      chunk_index: chunk.index,
      content: chunk.content,
      token_count: chunk.estimatedTokens,
    })),
  )

  if (chunkError) {
    await admin
      .from('documents')
      .update({ status: 'failed', error_code: 'chunk-write-failed' })
      .eq('id', document.id)

    return { ok: false, error: 'chunk-write-failed' }
  }

  return { ok: true, documentId: document.id, totalChunks: chunks.length }
}
