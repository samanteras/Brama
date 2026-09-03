import 'server-only'

import { estimateMonthlyRevenueCents } from '@/lib/admin/revenue'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Reads the operator metrics through the service-role RPCs
 * (`admin_overview`, `admin_signups_daily`, `admin_messages_daily`). Every
 * query here crosses tenant boundaries by design, which is why it lives behind
 * the admin gate and runs only on the server.
 */

export type AdminOverview = {
  totalUsers: number
  newUsers30d: number
  totalBots: number
  activeBots: number
  messagesTotal: number
  messagesThisMonth: number
  leadsTotal: number
  leadsThisMonth: number
  planFree: number
  planPro: number
  planBusiness: number
}

export type DailyPoint = { day: string; count: number }

export type AdminMetrics = {
  overview: AdminOverview
  signupsDaily: DailyPoint[]
  messagesDaily: DailyPoint[]
  /** Estimated monthly recurring revenue in cents; see the caveat on the page. */
  estimatedMrrCents: number
}

/** The raw JSON shape returned by `admin_overview()`. */
type OverviewRow = {
  total_users: number
  new_users_30d: number
  total_bots: number
  active_bots: number
  messages_total: number
  messages_this_month: number
  leads_total: number
  leads_this_month: number
  plan_free: number
  plan_pro: number
  plan_business: number
}

function mapOverview(row: OverviewRow): AdminOverview {
  return {
    totalUsers: Number(row.total_users),
    newUsers30d: Number(row.new_users_30d),
    totalBots: Number(row.total_bots),
    activeBots: Number(row.active_bots),
    messagesTotal: Number(row.messages_total),
    messagesThisMonth: Number(row.messages_this_month),
    leadsTotal: Number(row.leads_total),
    leadsThisMonth: Number(row.leads_this_month),
    planFree: Number(row.plan_free),
    planPro: Number(row.plan_pro),
    planBusiness: Number(row.plan_business),
  }
}

export async function fetchAdminMetrics(days = 30): Promise<AdminMetrics> {
  const admin = createAdminClient()

  const [overviewRes, signupsRes, messagesRes] = await Promise.all([
    admin.rpc('admin_overview'),
    admin.rpc('admin_signups_daily', { p_days: days }),
    admin.rpc('admin_messages_daily', { p_days: days }),
  ])

  if (overviewRes.error) throw new Error(`admin_overview: ${overviewRes.error.message}`)
  if (signupsRes.error) throw new Error(`admin_signups_daily: ${signupsRes.error.message}`)
  if (messagesRes.error) throw new Error(`admin_messages_daily: ${messagesRes.error.message}`)

  const overview = mapOverview(overviewRes.data as unknown as OverviewRow)

  const toPoints = (rows: { day: string; count: number }[] | null): DailyPoint[] =>
    (rows ?? []).map((r) => ({ day: r.day, count: Number(r.count) }))

  return {
    overview,
    signupsDaily: toPoints(signupsRes.data as { day: string; count: number }[] | null),
    messagesDaily: toPoints(messagesRes.data as { day: string; count: number }[] | null),
    estimatedMrrCents: estimateMonthlyRevenueCents(overview),
  }
}
