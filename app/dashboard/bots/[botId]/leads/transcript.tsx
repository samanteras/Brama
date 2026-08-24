import { toPlainText } from '@/lib/chat/plain-text'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

/**
 * The conversation behind a lead.
 *
 * A server component nested inside the details element, so the messages are
 * only fetched for leads whose transcript is actually opened rather than for
 * every card on the page.
 */
export async function Transcript({
  conversationId,
  botId,
}: {
  conversationId: string
  botId: string
}) {
  const supabase = await createClient()

  // Scoped by bot as well as conversation: the RLS policy already restricts
  // this, but naming the bot means a mistake shows up as missing data rather
  // than as somebody else's conversation.
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('bot_id', botId)
    .maybeSingle()

  if (!conversation) return null

  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, was_answered')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Сообщений не записано.</p>
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <p
            className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
              message.role === 'user'
                ? 'rounded-br-sm bg-primary text-primary-foreground'
                : 'rounded-bl-sm bg-background',
              // Marks the exact turn where the bot ran out of knowledge, which
              // is usually the paragraph the price list is missing.
              message.was_answered === false && 'ring-1 ring-destructive/40',
            )}
          >
            {toPlainText(message.content)}
          </p>
        </div>
      ))}
    </div>
  )
}
