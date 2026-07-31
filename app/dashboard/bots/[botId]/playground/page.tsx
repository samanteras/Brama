import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ChatWindow } from '@/components/chat/chat-window'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Playground',
}

export default async function PlaygroundPage(
  props: PageProps<'/dashboard/bots/[botId]/playground'>,
) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { count: readyDocuments }] = await Promise.all([
    supabase
      .from('bots')
      .select('id, name, greeting, accent_color')
      .eq('id', botId)
      .maybeSingle(),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', botId)
      .eq('status', 'ready'),
  ])

  if (!bot) notFound()

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
      <Card className="h-[32rem] gap-0 overflow-hidden p-0">
        <ChatWindow
          botId={bot.id}
          botName={bot.name}
          greeting={bot.greeting}
          accentColor={bot.accent_color}
          endpoint="/api/chat"
          // Null on purpose: the owner needs to see the contact form to know
          // what visitors get, but a lead from their own testing would clutter
          // the list they act on.
          leadEndpoint={null}
        />
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">Ask it what your customers ask</h2>
          <p className="mt-1 text-muted-foreground text-pretty">
            This is exactly what a visitor sees, answering from exactly the same documents.
          </p>
        </div>

        {readyDocuments === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground text-pretty">
              No documents are indexed yet, so the bot will say it does not know — which is correct,
              but not useful. Add something under Knowledge first.
            </p>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-sm font-medium">Worth trying</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>A question your price list answers — check it quotes the real number.</li>
              <li>
                A question it cannot answer, like a start date. It should decline and ask for a
                phone number rather than invent one.
              </li>
              <li>
                Something you get asked weekly. If the answer is wrong, the fix is a paragraph in
                your documents, not different wording here.
              </li>
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <p className="text-sm font-medium">Answers you see here are counted</p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Testing uses the same monthly allowance as your visitors, because each answer costs the
            same to produce. Leads captured here are not saved.
          </p>
        </Card>
      </div>
    </div>
  )
}
