import type { Metadata } from 'next'

import { Card } from '@/components/ui/card'
import { formatLimit } from '@/lib/plan-copy'
import { getPlan, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('plan').maybeSingle()

  // An unrecognised or missing plan degrades to free rather than breaking the
  // page — see toPlanId.
  const plan = getPlan(toPlanId(profile?.plan))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your bots</h1>
        <p className="mt-1 text-muted-foreground">
          Upload what you already have, then put the widget on your site.
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Current plan</p>
        <p className="mt-1 text-lg font-semibold">{plan.name}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {formatLimit(plan.limits.bots)} bots · {formatLimit(plan.limits.answersPerMonth)} answers
          a month
        </p>
      </Card>
    </div>
  )
}
