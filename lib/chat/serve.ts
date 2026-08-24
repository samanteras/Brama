import 'server-only'

import { QUOTA_EXHAUSTED_REPLY, type PromptMessage } from './prompt'
import { runChat } from './run'
import type { CollectLeadArguments } from './tools'
import { getPlan, toPlanId } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Everything around the chat engine: quota, persistence, and the wire format.
 *
 * Both routes funnel through here so the owner testing their bot and a visitor
 * on a customer's website get identical behaviour. The routes differ only in
 * who they let in.
 */

export type ServeChatInput = {
  bot: { id: string; owner_id: string; name: string }
  conversationId: string | null
  source: 'widget' | 'dashboard'
  visitorId: string | null
  question: string
}

/** Calendar month key matching the `usage.period` column. */
export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Streams a reply as newline-delimited JSON.
 *
 * One JSON object per line rather than Server-Sent Events: the client needs
 * structured events (tokens, a lead request, the final verdict) and NDJSON
 * carries them without the framing rules and reconnection semantics of SSE,
 * neither of which this ever needs.
 */
export function serveChat(input: ServeChatInput): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const admin = createAdminClient()

      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }

      let quotaConsumed = false
      const period = currentPeriod()

      try {
        const conversationId =
          input.conversationId ?? (await createConversation(input))

        send({ type: 'conversation', conversationId })

        await admin.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: input.question,
        })

        const { data: profile } = await admin
          .from('profiles')
          .select('plan')
          .eq('id', input.bot.owner_id)
          .maybeSingle()

        const plan = getPlan(toPlanId(profile?.plan))

        const { data: quota } = await admin.rpc('consume_message_quota', {
          p_owner_id: input.bot.owner_id,
          p_period: period,
          p_limit: plan.limits.answersPerMonth,
        })

        const allowed = quota?.[0]?.allowed ?? false

        if (!allowed) {
          // The visitor is told nothing about plans or billing, and is still
          // offered a way to leave their details — a spent allowance costs the
          // customer answers, never leads.
          await finishExhausted(conversationId, send)
          controller.close()
          return
        }

        quotaConsumed = true

        const history = await loadHistory(conversationId)

        let answer = ''
        let answered = true
        let citedChunkIds: string[] = []
        let lead: CollectLeadArguments | null = null

        for await (const event of runChat({
          botId: input.bot.id,
          botName: input.bot.name,
          question: input.question,
          history,
        })) {
          if (event.type === 'token') {
            answer += event.value
            send({ type: 'token', value: event.value })
          } else if (event.type === 'lead-request') {
            lead = event.lead
            send({ type: 'lead-request', lead: event.lead })
          } else {
            answered = event.answered
            citedChunkIds = event.citedChunkIds
          }
        }

        await admin.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: answer,
          cited_chunk_ids: citedChunkIds,
          was_answered: answered,
        })

        send({ type: 'done', answered, collectLead: lead !== null })
      } catch (error) {
        // Charging a customer's allowance for an answer they never received is
        // the kind of small unfairness that erodes trust in a metered product.
        if (quotaConsumed) {
          await createAdminClient().rpc('refund_message_quota', {
            p_owner_id: input.bot.owner_id,
            p_period: period,
          })
        }

        console.error('[chat] failed', error)
        send({ type: 'error', message: 'Что-то пошло не так. Попробуйте ещё раз.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

async function createConversation(input: ServeChatInput): Promise<string> {
  const { data, error } = await createAdminClient()
    .from('conversations')
    .insert({ bot_id: input.bot.id, source: input.source, visitor_id: input.visitorId })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Could not start a conversation: ${error?.message}`)

  return data.id
}

/**
 * Loads earlier turns, oldest first.
 *
 * Fetched newest-first with a limit so the query uses the index, then reversed —
 * ordering ascending would scan the whole conversation.
 */
async function loadHistory(conversationId: string): Promise<PromptMessage[]> {
  const { data } = await createAdminClient()
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(9)

  const rows = (data ?? []).filter((row) => row.role === 'user' || row.role === 'assistant')

  // The last row is the question just written, which is passed separately.
  return rows
    .slice(1)
    .reverse()
    .map((row) => ({ role: row.role as 'user' | 'assistant', content: row.content }))
}

async function finishExhausted(
  conversationId: string,
  send: (event: Record<string, unknown>) => void,
) {
  send({ type: 'token', value: QUOTA_EXHAUSTED_REPLY })
  send({
    type: 'lead-request',
    lead: { reason: 'asked_for_contact', summary: 'Задал вопрос, пока бот был недоступен.' },
  })

  await createAdminClient().from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: QUOTA_EXHAUSTED_REPLY,
    was_answered: false,
  })

  send({ type: 'done', answered: false, collectLead: true })
}
