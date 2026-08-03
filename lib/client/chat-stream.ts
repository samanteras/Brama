/**
 * Client-side reader for the chat endpoint's newline-delimited JSON stream.
 *
 * Kept apart from the chat component so the wire format has one implementation
 * shared by the dashboard tester and the embedded widget. Two readers would
 * eventually disagree about what a `done` event means, and the difference would
 * only show up on a customer's website.
 */

export type ChatStreamEvent =
  | { type: 'conversation'; conversationId: string }
  | { type: 'token'; value: string }
  | { type: 'lead-request'; lead: { reason: string; summary: string; unanswered_question?: string } }
  | { type: 'done'; answered: boolean; collectLead: boolean }
  | { type: 'error'; message: string }

export type SendMessageInput = {
  endpoint: string
  botId: string
  question: string
  conversationId: string | null
  visitorId?: string | null
  /** Host page the widget is embedded in; null in the dashboard tester. */
  hostSite?: string | null
  signal?: AbortSignal
  onEvent: (event: ChatStreamEvent) => void
}

export async function sendMessage({
  endpoint,
  botId,
  question,
  conversationId,
  visitorId,
  hostSite,
  signal,
  onEvent,
}: SendMessageInput): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botId, question, conversationId, visitorId, hostSite }),
    signal,
  })

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null)
    onEvent({
      type: 'error',
      message:
        typeof payload?.error === 'string' ? payload.error : 'The assistant is unavailable.',
    })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // A chunk can end mid-line, so the trailing fragment stays in the buffer
    // until its newline arrives. Parsing it early would throw on half a token.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim() === '') continue

      try {
        onEvent(JSON.parse(line) as ChatStreamEvent)
      } catch {
        // A malformed line is not worth interrupting a reply that is otherwise
        // arriving fine.
      }
    }
  }
}
