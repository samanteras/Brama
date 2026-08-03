/**
 * Single source of truth for pricing.
 *
 * The landing page, the dashboard and every server-side limit check read from
 * here. That is deliberate: the most likely — and most embarrassing — bug in a
 * product like this is a landing page promising 1000 answers while the code
 * cuts users off at 500. Keeping the numbers in one place makes that drift
 * impossible rather than merely unlikely.
 *
 * Note there is no human-facing copy in this module. Marketing text lives with
 * the rest of the copy and is derived from these numbers, so a limit can never
 * be changed in one place and forgotten in the other.
 */

export const PLAN_IDS = ['free', 'pro', 'business'] as const

export type PlanId = (typeof PLAN_IDS)[number]

/** A quantity cap, where `null` means "no limit". */
export type Limit = number | null

export type PlanLimits = {
  /** How many bots the account may have at once. */
  bots: number
  /** How many knowledge documents each bot may hold. */
  documentsPerBot: Limit
  /** Rejected at upload time — guards against one huge file eating the quota. */
  pagesPerDocument: number
  /** Bot answers per calendar month, counted across every bot in the account. */
  answersPerMonth: number
  /**
   * How many of the collected leads are actually readable.
   *
   * Free deliberately still *collects* leads: gating the core value entirely
   * means a user never sees it work and never has a reason to upgrade. They see
   * the leads arriving, but only the most recent few.
   */
  visibleLeads: Limit
}

export type PlanFeatures = {
  /** Free widgets carry a "powered by" link. */
  watermark: boolean
  /** Restricting the widget to the customer's own domains. */
  customDomains: boolean
}

export type Plan = {
  id: PlanId
  /** Product-facing plan name. Not translated. */
  name: string
  monthlyPriceCents: number
  /**
   * Name of the env var holding this plan's Stripe price id, or `null` for
   * plans that are never checked out.
   *
   * The id itself is not inlined here because it differs per Stripe account,
   * and because reading it at module load would make the landing page — which
   * needs prices but not Stripe — fail to build without Stripe configured.
   */
  stripePriceIdEnvVar: string | null
  limits: PlanLimits
  features: PlanFeatures
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPriceCents: 0,
    stripePriceIdEnvVar: null,
    limits: {
      bots: 1,
      documentsPerBot: 1,
      pagesPerDocument: 30,
      // Deliberately small. The public deployment carries a real API bill, and
      // a free account is the one thing anybody can create, so the free tier is
      // sized to demonstrate the product rather than to run on it.
      answersPerMonth: 5,
      visibleLeads: 3,
    },
    features: {
      watermark: true,
      customDomains: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyPriceCents: 2900,
    stripePriceIdEnvVar: 'STRIPE_PRICE_ID_PRO',
    limits: {
      bots: 3,
      documentsPerBot: 20,
      pagesPerDocument: 200,
      answersPerMonth: 1000,
      visibleLeads: null,
    },
    features: {
      watermark: false,
      customDomains: true,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    monthlyPriceCents: 9900,
    stripePriceIdEnvVar: 'STRIPE_PRICE_ID_BUSINESS',
    limits: {
      bots: 10,
      documentsPerBot: null,
      pagesPerDocument: 500,
      answersPerMonth: 5000,
      visibleLeads: null,
    },
    features: {
      watermark: false,
      customDomains: true,
    },
  },
}

/** Plans in display order, cheapest first. */
export const PLAN_LIST: readonly Plan[] = PLAN_IDS.map((id) => PLANS[id])

/** The plan a brand new account starts on. */
export const DEFAULT_PLAN_ID: PlanId = 'free'

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value)
}

/**
 * Resolves a plan id coming from the database.
 *
 * Falls back to the free plan rather than throwing: an unrecognised value (a
 * typo, a plan we retired) should degrade a user to the safest tier, not break
 * their dashboard.
 */
export function toPlanId(value: unknown): PlanId {
  return isPlanId(value) ? value : DEFAULT_PLAN_ID
}

export function getPlan(id: PlanId): Plan {
  return PLANS[id]
}

/**
 * Whether one more unit fits under the cap.
 *
 * `used` is how many are already consumed, so this answers "may I add one?".
 */
export function isWithinLimit(used: number, limit: Limit): boolean {
  if (limit === null) return true
  return used < limit
}

/** How many units are left, or `null` when uncapped. Never negative. */
export function remainingOf(used: number, limit: Limit): number | null {
  if (limit === null) return null
  return Math.max(0, limit - used)
}

/**
 * Reads the Stripe price id for a paid plan.
 *
 * Throws a specific error instead of returning undefined: a missing price id
 * means checkout silently sends the user to a broken Stripe page, which is far
 * harder to diagnose than a loud failure at the call site.
 */
export function resolveStripePriceId(
  id: PlanId,
  env: Record<string, string | undefined> = process.env,
): string {
  const plan = getPlan(id)

  if (plan.stripePriceIdEnvVar === null) {
    throw new Error(`Plan "${id}" is not purchasable and has no Stripe price.`)
  }

  const priceId = env[plan.stripePriceIdEnvVar]

  if (priceId === undefined || priceId.trim() === '') {
    throw new Error(
      `Missing Stripe price id for plan "${id}". Set ${plan.stripePriceIdEnvVar} in the environment.`,
    )
  }

  return priceId
}
