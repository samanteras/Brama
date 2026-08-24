import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { BotTabs } from './bot-tabs'
import { createClient } from '@/lib/supabase/server'

export default async function BotLayout(props: LayoutProps<'/dashboard/bots/[botId]'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const { data: bot } = await supabase.from('bots').select('id, name').eq('id', botId).maybeSingle()

  // Another tenant's bot reads as absent under row level security, so a missing
  // row and a forbidden one are indistinguishable — which is what we want to
  // tell the caller.
  if (!bot) notFound()

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Все боты
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{bot.name}</h1>

        <BotTabs botId={bot.id} />
      </div>

      {props.children}
    </div>
  )
}
