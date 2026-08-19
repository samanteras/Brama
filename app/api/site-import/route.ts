import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { crawlSite, pagesToDocumentText } from '@/lib/ingest/crawl'
import { contentHash } from '@/lib/ingest/hash'
import { CHARS_PER_TEXT_PAGE, parsePlainText } from '@/lib/ingest/parse'
import { saveDocument } from '@/lib/ingest/save-document'
import { getPlan, isWithinLimit, toPlanId } from '@/lib/plans'
import { normalizeDomain } from '@/lib/security/origin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Imports the customer's own website into the bot's knowledge base.
 *
 * The domain must already be on the bot's allow-list — this route never
 * fetches an address the customer has not first claimed as theirs, which
 * keeps it from being a generic "download any URL" endpoint. The crawl adds
 * the network-level checks on top (see lib/security/url-guard).
 *
 * Re-importing the same domain replaces the previous import: sites change,
 * and "delete the old one first" is bookkeeping a customer should not have to
 * know about. If nothing changed, the content hash catches it and the old
 * document stays.
 */

// The crawl is a dozen sequential fetches with real-world latencies; the
// platform default would cut it off mid-walk.
export const maxDuration = 60

const bodySchema = z.object({
  botId: z.uuid(),
  domain: z.string().min(1).max(255),
})

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

  const domain = normalizeDomain(parsedBody.data.domain)

  if (domain === null || domain.startsWith('*.')) {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400 })
  }

  // Reading the bot through the user's own client is the authorization check:
  // row level security makes another tenant's bot simply absent.
  const { data: bot } = await supabase
    .from('bots')
    .select('id, allowed_domains')
    .eq('id', parsedBody.data.botId)
    .maybeSingle()

  if (!bot) {
    return NextResponse.json({ error: 'Бот не найден.' }, { status: 404 })
  }

  if (!bot.allowed_domains.includes(domain)) {
    return NextResponse.json(
      { error: 'Сначала добавьте этот домен в разрешённые домены бота.' },
      { status: 403 },
    )
  }

  const admin = createAdminClient()

  const [{ data: profile }, { count: documentCount }, { data: previousImport }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot.id),
    admin
      .from('documents')
      .select('id, content_hash')
      .eq('bot_id', bot.id)
      .eq('source_type', 'website')
      .eq('filename', domain)
      .maybeSingle(),
  ])

  const plan = getPlan(toPlanId(profile?.plan))

  // A replacement frees its own slot, so only a first import can hit the cap.
  if (
    !previousImport &&
    !isWithinLimit(documentCount ?? 0, plan.limits.documentsPerBot)
  ) {
    return NextResponse.json(
      {
        error: `Тариф ${plan.name} позволяет ${plan.limits.documentsPerBot} документов на бота. Удалите один или перейдите на тариф выше.`,
      },
      { status: 403 },
    )
  }

  const { pages } = await crawlSite(domain)

  if (pages.length === 0) {
    return NextResponse.json({ error: 'site-unreachable' }, { status: 422 })
  }

  // Trimmed to the plan's page budget rather than rejected: the customer
  // cannot shorten their website the way they could split a PDF, so "import
  // what fits" is the only version of this that ends in a working bot.
  const maxChars = plan.limits.pagesPerDocument * CHARS_PER_TEXT_PAGE
  const fullText = pagesToDocumentText(pages)
  const clippedText = fullText.length > maxChars ? fullText.slice(0, maxChars) : fullText

  const result = parsePlainText(clippedText, { maxPages: plan.limits.pagesPerDocument })

  if (!result.ok) {
    return NextResponse.json({ error: result.failure.code, details: result.failure }, { status: 422 })
  }

  if (previousImport && previousImport.content_hash === contentHash(result.document.text)) {
    return NextResponse.json({ error: 'site-unchanged' }, { status: 409 })
  }

  // Deleting before inserting means a failed insert can lose the previous
  // import. Accepted: the recovery is one click on the same button, whereas
  // insert-then-delete would trip over the (bot_id, content_hash) unique
  // constraint precisely when a site has not changed enough.
  if (previousImport) {
    await admin.from('documents').delete().eq('id', previousImport.id)
  }

  const saved = await saveDocument(admin, {
    botId: bot.id,
    filename: domain,
    sourceType: 'website',
    text: result.document.text,
    pageCount: result.document.pageCount,
  })

  if (!saved.ok) {
    const status = saved.error === 'empty-document' ? 422 : saved.error === 'duplicate-document' ? 409 : 500
    return NextResponse.json({ error: saved.error }, { status })
  }

  return NextResponse.json({
    documentId: saved.documentId,
    totalChunks: saved.totalChunks,
    pageCount: result.document.pageCount,
    pagesCrawled: pages.length,
    replaced: Boolean(previousImport),
  })
}
