import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { parsePdf, parsePlainText, type ParseResult } from '@/lib/ingest/parse'
import { saveDocument } from '@/lib/ingest/save-document'
import { pluralizeRu } from '@/lib/plan-copy'
import { getPlan, isWithinLimit, toPlanId } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Accepts a document and prepares it for indexing.
 *
 * This route does everything except the embeddings: parse, deduplicate, chunk,
 * and write the chunk rows with a null embedding. The expensive part is then
 * driven batch by batch from the browser, which is what keeps a 150-page PDF
 * inside a serverless function's time limit.
 *
 * The document stays in `processing` until the last batch lands, and
 * `match_chunks` only searches documents in `ready` — so a half-indexed upload
 * can never be answered from.
 */

const bodySchema = z.discriminatedUnion('sourceType', [
  z.object({
    botId: z.uuid(),
    sourceType: z.literal('pdf'),
    filename: z.string().min(1).max(255),
    /** Path inside the `documents` bucket, written by the browser. */
    storagePath: z.string().min(1),
  }),
  z.object({
    botId: z.uuid(),
    sourceType: z.enum(['text', 'markdown']),
    filename: z.string().min(1).max(255),
    storagePath: z.string().min(1),
  }),
  z.object({
    botId: z.uuid(),
    sourceType: z.literal('paste'),
    filename: z.string().min(1).max(255),
    text: z.string(),
  }),
])

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Вы не вошли в аккаунт.' }, { status: 401 })
  }

  const parsedBody = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsedBody.success) {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  const body = parsedBody.data

  // Reading the bot through the user's own client is the authorization check:
  // row level security makes another tenant's bot simply absent.
  const { data: bot } = await supabase
    .from('bots')
    .select('id')
    .eq('id', body.botId)
    .maybeSingle()

  if (!bot) {
    return NextResponse.json({ error: 'Бот не найден.' }, { status: 404 })
  }

  const [{ data: profile }, { count: documentCount }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', body.botId),
  ])

  const plan = getPlan(toPlanId(profile?.plan))

  if (!isWithinLimit(documentCount ?? 0, plan.limits.documentsPerBot)) {
    return NextResponse.json(
      {
        error: `Тариф ${plan.name} позволяет ${pluralizeRu(plan.limits.documentsPerBot ?? 0, ['документ', 'документа', 'документов'])} на бота. Удалите один или перейдите на тариф выше.`,
      },
      { status: 403 },
    )
  }

  let result: ParseResult

  if (body.sourceType === 'paste') {
    result = parsePlainText(body.text, { maxPages: plan.limits.pagesPerDocument })
  } else {
    const { data: file, error: downloadError } = await supabase.storage
      .from('documents')
      .download(body.storagePath)

    if (downloadError || !file) {
      return NextResponse.json({ error: 'Не получилось прочитать загруженный файл.' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    result =
      body.sourceType === 'pdf'
        ? await parsePdf(bytes, { maxPages: plan.limits.pagesPerDocument })
        : parsePlainText(new TextDecoder().decode(bytes), {
            maxPages: plan.limits.pagesPerDocument,
          })
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.failure.code, details: result.failure },
      { status: 422 },
    )
  }

  const admin = createAdminClient()

  const saved = await saveDocument(admin, {
    botId: body.botId,
    filename: body.filename,
    sourceType: body.sourceType,
    text: result.document.text,
    pageCount: result.document.pageCount,
    storagePath: 'storagePath' in body ? body.storagePath : null,
  })

  if (!saved.ok) {
    switch (saved.error) {
      case 'empty-document':
        return NextResponse.json({ error: 'empty-document' }, { status: 422 })
      case 'duplicate-document':
        return NextResponse.json({ error: 'duplicate-document' }, { status: 409 })
      case 'chunk-write-failed':
        return NextResponse.json({ error: 'Не получилось сохранить текст документа.' }, { status: 500 })
      default:
        return NextResponse.json({ error: 'Не получилось сохранить документ.' }, { status: 500 })
    }
  }

  return NextResponse.json({
    documentId: saved.documentId,
    totalChunks: saved.totalChunks,
    pageCount: result.document.pageCount,
  })
}
