import 'server-only'

import type OpenAI from 'openai'

import { CHAT_MODEL, CHAT_TEMPERATURE, openai } from '@/lib/ai/chat-model'
import { buildSystemPrompt, trimHistory, type PromptMessage } from './prompt'
import { retrieve, type RetrievedChunk } from './retrieve'
import { COLLECT_LEAD_TOOL, parseCollectLeadArguments, type CollectLeadArguments } from './tools'

/**
 * The chat engine.
 *
 * Knows nothing about HTTP, sessions or quotas. Both entry points — the owner
 * testing their bot and an anonymous visitor on a customer's website — call
 * this same function, so the two can never drift into answering differently.
 * What differs between them is who is allowed to call it, and that lives in the
 * routes.
 *
 * Emits events as they happen rather than returning a finished string. Roughly
 * one to two seconds pass before the first token — embedding, then search, then
 * generation, all strictly sequential with nothing to parallelise — so the
 * product works on the perception of that wait instead: text starts moving the
 * moment the model produces it.
 */

export type ChatEvent =
  | { type: 'token'; value: string }
  | { type: 'lead-request'; lead: CollectLeadArguments }
  | { type: 'done'; answered: boolean; citedChunkIds: string[] }

export type RunChatInput = {
  botId: string
  botName: string
  question: string
  /** Earlier turns of this conversation, oldest first. */
  history?: PromptMessage[]
}

export async function* runChat(input: RunChatInput): AsyncGenerator<ChatEvent> {
  const chunks = await retrieve(input.botId, input.question)

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt({ botName: input.botName, chunks }) },
    ...trimHistory(input.history ?? []).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: 'user', content: input.question },
  ]

  let toolCall: ToolCall | null = null

  for await (const event of streamTurn(messages, { withTools: true })) {
    if (event.type === 'token') {
      yield { type: 'token', value: event.value }
    } else {
      toolCall = event.call
    }
  }

  if (!toolCall) {
    yield { type: 'done', answered: true, citedChunkIds: citedIds(chunks) }
    return
  }

  const lead = parseCollectLeadArguments(toolCall.arguments)
  yield { type: 'lead-request', lead }

  // Feed the tool result back so the model can write the sentence the visitor
  // actually reads. Without this second turn it would have produced a tool call
  // and no words at all.
  messages.push({
    role: 'assistant',
    tool_calls: [
      {
        id: toolCall.id,
        type: 'function',
        function: { name: toolCall.name, arguments: toolCall.arguments },
      },
    ],
  })

  messages.push({
    role: 'tool',
    tool_call_id: toolCall.id,
    content:
      'A contact form is now shown to the visitor. Tell them briefly why a person needs to follow up, and ask for their phone number. Do not invent an answer to the original question.',
  })

  for await (const event of streamTurn(messages, { withTools: false })) {
    if (event.type === 'token') {
      yield { type: 'token', value: event.value }
    }
  }

  yield {
    type: 'done',
    // Only a genuine knowledge gap counts as unanswered. Someone who asked to be
    // called back was answered perfectly well — counting that as a gap would
    // bury the real ones under noise on the gaps page.
    answered: lead.reason !== 'not_in_documents',
    citedChunkIds: citedIds(chunks),
  }
}

type ToolCall = { id: string; name: string; arguments: string }

type TurnEvent = { type: 'token'; value: string } | { type: 'tool-call'; call: ToolCall }

/**
 * Runs one model turn, yielding text as it streams.
 *
 * Tool call arguments arrive split across many deltas, so they are accumulated
 * by index and only emitted once the stream ends — a half-received JSON payload
 * cannot be parsed, and acting on one would be worse than waiting.
 */
async function* streamTurn(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  { withTools }: { withTools: boolean },
): AsyncGenerator<TurnEvent> {
  const stream = await openai().chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: CHAT_TEMPERATURE,
    stream: true,
    ...(withTools ? { tools: [COLLECT_LEAD_TOOL] } : {}),
  })

  const pendingCalls = new Map<number, ToolCall>()

  for await (const part of stream) {
    const delta = part.choices[0]?.delta
    if (!delta) continue

    if (typeof delta.content === 'string' && delta.content !== '') {
      yield { type: 'token', value: delta.content }
    }

    for (const call of delta.tool_calls ?? []) {
      const existing = pendingCalls.get(call.index) ?? { id: '', name: '', arguments: '' }

      pendingCalls.set(call.index, {
        id: call.id ?? existing.id,
        name: call.function?.name ?? existing.name,
        arguments: existing.arguments + (call.function?.arguments ?? ''),
      })
    }
  }

  const collectLead = [...pendingCalls.values()].find((call) => call.name === 'collect_lead')

  if (collectLead) {
    yield { type: 'tool-call', call: collectLead }
  }
}

function citedIds(chunks: RetrievedChunk[]): string[] {
  return chunks.map((chunk) => chunk.id)
}
