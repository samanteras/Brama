'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

import { LeadForm } from './lead-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { APP_NAME } from '@/lib/brand'
import { toPlainText } from '@/lib/chat/plain-text'
import { sendMessage, type ChatStreamEvent } from '@/lib/client/chat-stream'
import { getVisitorId } from '@/lib/client/visitor'
import { cn } from '@/lib/utils'

/**
 * The chat itself.
 *
 * One component for both the owner's tester and the embedded widget. They differ
 * only in which endpoint they call and whether a watermark is shown — everything
 * a visitor experiences is therefore identical to what the owner tested, which
 * is the whole point of having a tester.
 */

export type ChatWindowProps = {
  botId: string
  botName: string
  greeting: string
  accentColor: string
  /** `/api/chat` for the owner, `/api/public/chat` for visitors. */
  endpoint: string
  /** Where a captured contact is posted, or null in the dashboard tester. */
  leadEndpoint: string | null
  /**
   * Whether to attach a visitor id, so a returning visitor's conversations join
   * up. Off in the dashboard, where the owner is already identified.
   */
  trackVisitor?: boolean
  /**
   * Hostname of the page the widget sits on, when running inside the iframe.
   *
   * Needed because requests from the frame carry our origin, not the
   * customer's, so the Origin header cannot distinguish one host site from
   * another.
   */
  hostSite?: string | null
  showWatermark?: boolean
  className?: string
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type LeadRequest = {
  reason: string
  summary: string
  unanswered_question?: string
}

export function ChatWindow({
  botId,
  botName,
  greeting,
  accentColor,
  endpoint,
  leadEndpoint,
  trackVisitor = false,
  hostSite = null,
  showWatermark = false,
  className,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [leadRequest, setLeadRequest] = useState<LeadRequest | null>(null)
  const [leadSaved, setLeadSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Follows the reply as it streams, so the newest text stays in view.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, leadRequest])

  async function submit(question: string) {
    if (question.trim() === '' || busy) return

    setError(null)
    setDraft('')
    setBusy(true)

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: question }
    const replyId = crypto.randomUUID()

    setMessages((current) => [
      ...current,
      userMessage,
      { id: replyId, role: 'assistant', content: '' },
    ])

    function handle(event: ChatStreamEvent) {
      if (event.type === 'conversation') {
        setConversationId(event.conversationId)
      } else if (event.type === 'token') {
        setMessages((current) =>
          current.map((message) =>
            message.id === replyId ? { ...message, content: message.content + event.value } : message,
          ),
        )
      } else if (event.type === 'lead-request') {
        setLeadRequest(event.lead)
        setLeadSaved(false)
      } else if (event.type === 'error') {
        setError(event.message)
      }
    }

    try {
      await sendMessage({
        endpoint,
        botId,
        question,
        conversationId,
        // Read at send time: localStorage does not exist during server
        // rendering, and this is the only moment the value is needed.
        visitorId: trackVisitor ? getVisitorId() : null,
        hostSite,
        onEvent: handle,
      })
    } catch {
      setError('Связь прервалась. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  const started = messages.length > 0

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {greeting.trim() !== '' ? (
          <Bubble role="assistant" accentColor={accentColor}>
            {greeting}
          </Bubble>
        ) : null}

        {!started && greeting.trim() === '' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Задайте вопрос — {botName} ответит.
          </p>
        ) : null}

        {messages.map((message) => (
          <Bubble key={message.id} role={message.role} accentColor={accentColor}>
            {message.content === '' ? <TypingDots /> : toPlainText(message.content)}
          </Bubble>
        ))}

        {leadRequest && !leadSaved ? (
          <LeadForm
            botId={botId}
            conversationId={conversationId}
            context={leadRequest}
            endpoint={leadEndpoint}
            accentColor={accentColor}
            hostSite={hostSite}
            onSaved={() => setLeadSaved(true)}
          />
        ) : null}

        {leadSaved ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {leadEndpoint === null
              ? 'На вашем сайте этот контакт сейчас появился бы в «Заявках» вместе с перепиской.'
              : 'Спасибо! С вами свяжутся.'}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(draft)
        }}
      >
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Спросите про цены, сроки, что входит в стоимость…"
            disabled={busy}
            aria-label="Ваш вопрос"
          />
          <Button type="submit" size="icon" disabled={busy || draft.trim() === ''}>
            <Send />
            <span className="sr-only">Отправить</span>
          </Button>
        </div>

        {showWatermark ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Powered by {APP_NAME}
          </p>
        ) : null}
      </form>
    </div>
  )
}

function Bubble({
  role,
  accentColor,
  children,
}: {
  role: 'user' | 'assistant'
  accentColor: string
  children: React.ReactNode
}) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-muted text-foreground',
        )}
        // The one place the bot's accent colour is applied. Inline because it is
        // per-bot data, not a theme token.
        style={isUser ? { backgroundColor: accentColor } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1" aria-label="Печатает">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  )
}
