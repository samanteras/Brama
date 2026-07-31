import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

import { serveChat } from '@/lib/chat/serve'
import { createClient } from '@/lib/supabase/server'

/**
 * Chat for the bot's owner, testing it in the dashboard.
 *
 * Deliberately a separate file from the public route rather than one handler
 * with a flag. The two have different authorization models, and folding them
 * together would hide that boundary inside a branch — the kind of place a
 * mistake turns anonymous visitors into account owners. Both are thin and both
 * hand off to the same engine.
 */

const bodySchema = z.object({
  botId: z.uuid(),
  question: z.string().trim().min(1).max(2000),
  conversationId: z.uuid().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  // Reading through the user's own client is the authorization check: row level
  // security makes another tenant's bot simply absent.
  const { data: bot } = await supabase
    .from('bots')
    .select('id, owner_id, name')
    .eq('id', parsed.data.botId)
    .maybeSingle()

  if (!bot) {
    return NextResponse.json({ error: 'Bot not found.' }, { status: 404 })
  }

  return serveChat({
    bot,
    conversationId: parsed.data.conversationId ?? null,
    // Kept apart from widget traffic so the owner testing their own bot does
    // not pollute their lead list or their conversation history.
    source: 'dashboard',
    visitorId: null,
    question: parsed.data.question,
  })
}
