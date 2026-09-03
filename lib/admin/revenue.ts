import { PLANS } from '@/lib/plans'

/**
 * MRR estimated from plan membership, not from Stripe's ledger: it assumes
 * every paid profile is billed the list price for a full month. Good enough for
 * a trend tile, deliberately labelled as an estimate in the UI. Prices come
 * from `lib/plans.ts`, so the estimate tracks any price change automatically.
 */
export function estimateMonthlyRevenueCents(counts: { planPro: number; planBusiness: number }): number {
  return counts.planPro * PLANS.pro.monthlyPriceCents + counts.planBusiness * PLANS.business.monthlyPriceCents
}
