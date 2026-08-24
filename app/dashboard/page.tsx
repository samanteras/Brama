import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, MessageSquare } from 'lucide-react'

import { CreateBotDialog } from './create-bot-dialog'
import { Card } from '@/components/ui/card'
import { botAllowanceMessage, formatLimit, pluralizeRu } from '@/lib/plan-copy'
import { getPlan, isWithinLimit, remainingOf, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Ваши боты',
}

/** Calendar month key matching the `usage.period` column. */
function currentPeriod(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: profile }, { data: bots }, { data: usage }] = await Promise.all([
    supabase.from('profiles').select('plan').maybeSingle(),
    supabase
      .from('bots')
      .select('id, name, created_at, documents(count), conversations(count)')
      .order('created_at', { ascending: true }),
    supabase.from('usage').select('messages_used').eq('period', currentPeriod()).maybeSingle(),
  ])

  const plan = getPlan(toPlanId(profile?.plan))
  const botCount = bots?.length ?? 0
  const canCreate = isWithinLimit(botCount, plan.limits.bots)
  const answersUsed = usage?.messages_used ?? 0

  const limitMessage = botAllowanceMessage(plan)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ваши боты</h1>
          <p className="mt-1 text-muted-foreground">
            Загрузите то, что у вас уже есть, и поставьте виджет на сайт.
          </p>
        </div>

        {botCount > 0 ? (
          <div className="flex flex-col items-end gap-1.5">
            <CreateBotDialog canCreate={canCreate} limitMessage={limitMessage} />
            {/* Spelled out rather than hidden in a tooltip: a disabled button
                with no visible reason reads as a broken one. */}
            {!canCreate ? (
              <p className="text-sm text-muted-foreground">
                {limitMessage} Удалите одного, чтобы освободить место.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <UsageSummary
        planName={plan.name}
        botCount={botCount}
        botLimit={plan.limits.bots}
        answersUsed={answersUsed}
        answersLimit={plan.limits.answersPerMonth}
      />

      {botCount === 0 ? (
        <EmptyState canCreate={canCreate} limitMessage={limitMessage} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {bots?.map((bot) => (
            <li key={bot.id}>
              <Link href={`/dashboard/bots/${bot.id}`} className="block">
                <Card className="gap-0 p-5 transition-colors hover:border-primary/50">
                  <p className="font-semibold">{bot.name}</p>

                  <div className="mt-3 flex gap-5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-4" aria-hidden />
                      {pluralizeRu(bot.documents?.[0]?.count ?? 0, ['документ', 'документа', 'документов'])}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="size-4" aria-hidden />
                      {pluralizeRu(bot.conversations?.[0]?.count ?? 0, ['диалог', 'диалога', 'диалогов'])}
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function UsageSummary({
  planName,
  botCount,
  botLimit,
  answersUsed,
  answersLimit,
}: {
  planName: string
  botCount: number
  botLimit: number
  answersUsed: number
  answersLimit: number
}) {
  const answersLeft = remainingOf(answersUsed, answersLimit) ?? 0

  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Тариф</p>
            <p className="mt-0.5 font-semibold">{planName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Боты</p>
            <p className="mt-0.5 font-semibold">
              {botCount} из {formatLimit(botLimit)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ответы в этом месяце</p>
            <p className="mt-0.5 font-semibold">
              {answersUsed.toLocaleString('ru-RU')} из {formatLimit(answersLimit)}
            </p>
          </div>
        </div>

        {answersLeft === 0 ? (
          <p className="text-sm font-medium text-destructive">
            Ответы закончились — посетители всё ещё могут оставить контакты.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function EmptyState({ canCreate, limitMessage }: { canCreate: boolean; limitMessage: string }) {
  return (
    <Card className="items-center gap-0 p-12 text-center">
      <h2 className="text-lg font-semibold">Создайте первого бота</h2>
      <p className="mt-2 max-w-md text-muted-foreground text-pretty">
        Дайте ему свой прайс и условия, затем вставьте одну строку на сайт. Всё занимает около
        десяти минут.
      </p>
      <div className="mt-6">
        <CreateBotDialog canCreate={canCreate} limitMessage={limitMessage} />
      </div>
    </Card>
  )
}
