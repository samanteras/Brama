import type { Metadata } from 'next'

import { DailyBarChart } from '@/components/admin/bar-chart'
import { Card } from '@/components/ui/card'
import { fetchAdminMetrics } from '@/lib/admin/metrics'
import { formatPrice, pluralizeRu } from '@/lib/plan-copy'

export const metadata: Metadata = {
  title: 'Админка',
}

// Always fresh: operator metrics are the kind of thing you refresh to watch,
// not a cached page.
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const { overview, signupsDaily, messagesDaily, estimatedMrrCents } = await fetchAdminMetrics(30)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Обзор</h1>
        <p className="mt-1 text-muted-foreground">Метрики по всем аккаунтам. Обновляется при заходе.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Пользователи"
          value={overview.totalUsers.toLocaleString('ru-RU')}
          sub={`+${pluralizeRu(overview.newUsers30d, ['новый', 'новых', 'новых'])} за 30 дней`}
        />
        <Stat
          label="Боты"
          value={overview.totalBots.toLocaleString('ru-RU')}
          sub={`${overview.activeBots.toLocaleString('ru-RU')} с базой знаний`}
        />
        <Stat
          label="Оценка MRR"
          value={formatPrice(estimatedMrrCents)}
          sub="по тарифам, оценка (не из Stripe)"
        />
        <Stat
          label="Сообщения за месяц"
          value={overview.messagesThisMonth.toLocaleString('ru-RU')}
          sub={`${overview.messagesTotal.toLocaleString('ru-RU')} всего`}
        />
        <Stat
          label="Заявки за месяц"
          value={overview.leadsThisMonth.toLocaleString('ru-RU')}
          sub={`${overview.leadsTotal.toLocaleString('ru-RU')} всего`}
        />
        <Stat
          label="Тарифы"
          value={`${overview.planPro + overview.planBusiness} платных`}
          sub={`Free ${overview.planFree} · Pro ${overview.planPro} · Business ${overview.planBusiness}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Регистрации, 30 дней</h2>
          <DailyBarChart data={signupsDaily} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Сообщения, 30 дней</h2>
          <DailyBarChart data={messagesDaily} />
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="gap-0 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-sm text-muted-foreground text-pretty">{sub}</p> : null}
    </Card>
  )
}
