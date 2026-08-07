/**
 * Human-facing wording for plans, derived from `lib/plans.ts`.
 *
 * Every number shown to a visitor is read from the same object the server
 * enforces limits against. This is the whole point of the split: a pricing page
 * that promises 1000 answers while the code cuts users off at 500 is the most
 * likely and most damaging bug a product like this can ship, and deriving the
 * copy makes it unrepresentable rather than merely unlikely.
 */

import { APP_NAME } from './brand'
import type { Limit, Plan, PlanId } from './plans'

/** Formats a whole-dollar price. All plans are priced in whole dollars. */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** Renders a limit, spelling out the uncapped case. */
export function formatLimit(limit: Limit): string {
  return limit === null ? 'Unlimited' : limit.toLocaleString('en-US')
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`
}

/** One-line positioning, chosen per plan rather than derived. */
export const PLAN_TAGLINES: Record<PlanId, string> = {
  free: 'See it answer your own questions before you pay anything.',
  pro: 'For a company running one site and taking enquiries daily.',
  business: 'For firms running several brands or regional sites.',
}

/** The plan a first-time visitor should be nudged towards. */
export const FEATURED_PLAN_ID: PlanId = 'pro'

/**
 * States a plan's bot allowance.
 *
 * Lives here rather than at each call site because the same sentence appears in
 * the dashboard, on a disabled button, and in the error returned when creation
 * is refused — three places that must agree on both the number and the wording.
 */
export function botAllowanceMessage(plan: Plan): string {
  return plan.limits.bots === 1
    ? `The ${plan.name} plan includes one bot.`
    : `The ${plan.name} plan includes ${plan.limits.bots} bots.`
}

/**
 * The bullet list shown on a pricing card.
 *
 * Order matters: capacity first, because that is what a buyer compares, then
 * the qualitative differences that justify moving up a tier.
 */
export function planHighlights(plan: Plan): string[] {
  const { limits, features } = plan

  const highlights = [
    pluralize(limits.bots, 'bot'),
    limits.documentsPerBot === null
      ? 'Unlimited documents'
      : `${pluralize(limits.documentsPerBot, 'document')} per bot`,
    `${limits.answersPerMonth.toLocaleString('en-US')} answers per month`,
    `Up to ${pluralize(limits.pagesPerDocument, 'page')} per document`,
  ]

  highlights.push(
    limits.visibleLeads === null
      ? 'Every lead, with the full conversation'
      : `Your ${limits.visibleLeads} most recent leads`,
  )

  // Domain locking is not listed: every plan has it, so it differentiates
  // nothing. It belongs in the product, not in the price comparison.

  if (features.watermark) {
    highlights.push(`Shows a small ${APP_NAME} badge`)
  }

  return highlights
}
