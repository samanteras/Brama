import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { appUrl } from '@/lib/env'
import { effectiveOrigin } from '@/lib/security/embed-origin'
import { checkOrigin } from '@/lib/security/origin'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Captures a visitor's contact details.
 *
 * The most valuable request this product handles, so it is deliberately
 * forgiving: one field, no format rules beyond "looks like a way to reach
 * someone". Rejecting a phone number because it had a space in it would lose
 * the lead the whole system exists to catch.
 */

const bodySchema = z.object({
  botId: z.uuid(),
  conversationId: z.uuid().nullable().optional(),
  contact: z.string().trim().min(3).max(120),
  name: z.string().trim().max(120).optional(),
  hostSite: z.string().max(255).nullable().optional(),
  context: z
    .object({
      reason: z.string().max(64).optional(),
      summary: z.string().max(2000).optional(),
      unanswered_question: z.string().max(2000).optional(),
    })
    .optional(),
})

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_SECONDS = 60

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const headers = corsHeaders(origin)

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректный запрос.' }, { status: 400, headers })
  }

  const admin = createAdminClient()

  const { data: bot } = await admin
    .from('bots')
    .select('id, allowed_domains, is_active')
    .eq('id', parsed.data.botId)
    .maybeSingle()

  if (!bot || !bot.is_active) {
    return NextResponse.json({ error: 'Недоступно.' }, { status: 404, headers })
  }

  if (!checkOrigin(effectiveOrigin(origin, parsed.data.hostSite, appUrl()), bot.allowed_domains).allowed) {
    return NextResponse.json({ error: 'Недоступно на этом сайте.' }, { status: 403, headers })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  const { data: limit } = await admin.rpc('check_rate_limit', {
    p_key: `lead:${bot.id}:${ip}`,
    p_max: RATE_LIMIT_MAX,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  })

  if (limit?.[0] && !limit[0].allowed) {
    return NextResponse.json({ error: 'Слишком много попыток.' }, { status: 429, headers })
  }

  // The conversation must belong to this bot, or a caller could attach their
  // lead to somebody else's conversation and read its context back later.
  let conversationId: string | null = null

  if (parsed.data.conversationId) {
    const { data: conversation } = await admin
      .from('conversations')
      .select('id')
      .eq('id', parsed.data.conversationId)
      .eq('bot_id', bot.id)
      .maybeSingle()

    conversationId = conversation?.id ?? null
  }

  const contact = parsed.data.contact.trim()
  // A single field, split on the only signal that reliably distinguishes the
  // two. Asking the visitor to pick would be one more thing between them and
  // being contacted.
  const isEmail = contact.includes('@')

  const { error } = await admin.from('leads').insert({
    bot_id: bot.id,
    conversation_id: conversationId,
    name: parsed.data.name && parsed.data.name !== '' ? parsed.data.name : null,
    email: isEmail ? contact : null,
    phone: isEmail ? null : contact,
    context: parsed.data.context ?? {},
  })

  if (error) {
    return NextResponse.json({ error: 'Не получилось сохранить.' }, { status: 500, headers })
  }

  return NextResponse.json({ saved: true }, { headers })
}
