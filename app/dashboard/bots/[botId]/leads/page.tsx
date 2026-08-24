import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LeadCard } from './lead-card'
import { Card } from '@/components/ui/card'
import { pluralizeRu } from '@/lib/plan-copy'
import { getPlan, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Заявки',
}

export default async function LeadsPage(props: PageProps<'/dashboard/bots/[botId]/leads'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { data: leads }, { data: profile }] = await Promise.all([
    supabase.from('bots').select('id').eq('id', botId).maybeSingle(),
    supabase
      .from('leads')
      .select('id, name, phone, email, context, created_at, conversation_id')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').maybeSingle(),
  ])

  if (!bot) notFound()

  const plan = getPlan(toPlanId(profile?.plan))
  const all = leads ?? []
  const visibleCount = plan.limits.visibleLeads ?? all.length
  const visible = all.slice(0, visibleCount)
  const hidden = all.length - visible.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold">Заявки</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Люди, которые оставили контакты, а не ушли с вашего сайта.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Всего: {all.length}</p>
      </div>

      {all.length === 0 ? (
        <Card className="items-center p-12 text-center">
          <h3 className="text-lg font-semibold">Заявок пока нет</h3>
          <p className="mt-2 max-w-md text-muted-foreground text-pretty">
            Когда бот не знает ответа или посетитель просит связать его с человеком, бот берёт
            номер — и заявка появляется здесь, с уже записанной сутью запроса.
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {visible.map((lead) => (
            <li key={lead.id}>
              <LeadCard lead={lead} botId={botId} />
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <Card className="border-primary/40 p-6 text-center">
          <p className="font-medium">
            Ждёт ещё {pluralizeRu(hidden, ['заявка', 'заявки', 'заявок'])}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty">
            Тариф {plan.name} показывает {visibleCount} последних. Остальные собираются и
            хранятся — перейдите на тариф выше, чтобы их увидеть.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
