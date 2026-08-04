import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PLAN_ID,
  getPlan,
  isPlanId,
  isWithinLimit,
  PLAN_IDS,
  PLAN_LIST,
  PLANS,
  remainingOf,
  resolveStripePriceId,
  toPlanId,
  type Limit,
  type PlanId,
} from './plans'

/** Treats an uncapped limit as infinity so tiers can be compared numerically. */
function limitValue(limit: Limit): number {
  return limit === null ? Number.POSITIVE_INFINITY : limit
}

describe('plan catalogue', () => {
  it('exposes every declared plan, in cheapest-first order', () => {
    expect(PLAN_LIST.map((plan) => plan.id)).toEqual([...PLAN_IDS])
  })

  it('keys each plan by its own id', () => {
    for (const id of PLAN_IDS) {
      expect(PLANS[id].id).toBe(id)
    }
  })

  it('starts new accounts on a plan that exists', () => {
    expect(isPlanId(DEFAULT_PLAN_ID)).toBe(true)
  })

  it('starts new accounts on the free plan', () => {
    expect(PLANS[DEFAULT_PLAN_ID].monthlyPriceCents).toBe(0)
  })

  it('prices tiers strictly in ascending order', () => {
    const prices = PLAN_LIST.map((plan) => plan.monthlyPriceCents)

    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1])
    }
  })

  it('never gives a cheaper tier a more generous limit', () => {
    const limitKeys = ['bots', 'documentsPerBot', 'pagesPerDocument', 'answersPerMonth', 'visibleLeads'] as const

    for (let i = 1; i < PLAN_LIST.length; i++) {
      const cheaper = PLAN_LIST[i - 1]
      const pricier = PLAN_LIST[i]

      for (const key of limitKeys) {
        expect(
          limitValue(pricier.limits[key]),
          `${pricier.id}.${key} must not be below ${cheaper.id}.${key}`,
        ).toBeGreaterThanOrEqual(limitValue(cheaper.limits[key]))
      }
    }
  })

  it('declares only positive caps', () => {
    for (const plan of PLAN_LIST) {
      expect(plan.limits.bots).toBeGreaterThan(0)
      expect(plan.limits.pagesPerDocument).toBeGreaterThan(0)
      expect(plan.limits.answersPerMonth).toBeGreaterThan(0)

      for (const limit of [plan.limits.documentsPerBot, plan.limits.visibleLeads]) {
        if (limit !== null) expect(limit).toBeGreaterThan(0)
      }
    }
  })

  it('lets every plan collect leads, including free', () => {
    // Free intentionally collects leads and only caps how many are readable.
    // Gating the core value entirely would mean users never see it work.
    for (const plan of PLAN_LIST) {
      expect(limitValue(plan.limits.visibleLeads)).toBeGreaterThan(0)
    }
  })

  it('watermarks the free plan and only the free plan', () => {
    expect(PLANS.free.features.watermark).toBe(true)

    for (const plan of PLAN_LIST.filter((candidate) => candidate.monthlyPriceCents > 0)) {
      expect(plan.features.watermark).toBe(false)
    }
  })

  it('does not sell domain locking as a feature', () => {
    // It used to be a paid feature. Charging for protection against snippet
    // theft is the wrong thing to put behind an upgrade, so every plan has it
    // and it appears in no tier's feature set.
    for (const plan of PLAN_LIST) {
      expect(plan.features).not.toHaveProperty('customDomains')
    }
  })
  it('gives every paid plan a distinct Stripe price env var', () => {
    const paidPlans = PLAN_LIST.filter((plan) => plan.monthlyPriceCents > 0)
    const envVars = paidPlans.map((plan) => plan.stripePriceIdEnvVar)

    expect(paidPlans.length).toBeGreaterThan(0)
    expect(envVars.every((name) => typeof name === 'string' && name.length > 0)).toBe(true)
    expect(new Set(envVars).size).toBe(envVars.length)
  })

  it('gives free plans no Stripe price env var', () => {
    for (const plan of PLAN_LIST.filter((candidate) => candidate.monthlyPriceCents === 0)) {
      expect(plan.stripePriceIdEnvVar).toBeNull()
    }
  })
})

describe('getPlan', () => {
  it('returns the plan for each id', () => {
    for (const id of PLAN_IDS) {
      expect(getPlan(id)).toBe(PLANS[id])
    }
  })
})

describe('isPlanId', () => {
  it('accepts every declared id', () => {
    for (const id of PLAN_IDS) {
      expect(isPlanId(id)).toBe(true)
    }
  })

  it.each([
    ['unknown string', 'enterprise'],
    ['empty string', ''],
    ['wrong case', 'Pro'],
    ['id with whitespace', ' pro'],
    ['null', null],
    ['undefined', undefined],
    ['number', 1],
    ['object', { id: 'pro' }],
    ['array', ['pro']],
  ])('rejects %s', (_label, value) => {
    expect(isPlanId(value)).toBe(false)
  })
})

describe('toPlanId', () => {
  it('passes through a known id', () => {
    expect(toPlanId('pro')).toBe('pro')
  })

  it.each([['garbage', 'enterprise'], ['null', null], ['undefined', undefined], ['number', 7]])(
    'falls back to the default plan for %s',
    (_label, value) => {
      // Degrading to the safest tier beats breaking the dashboard.
      expect(toPlanId(value)).toBe(DEFAULT_PLAN_ID)
    },
  )
})

describe('isWithinLimit', () => {
  it('always allows more when uncapped', () => {
    expect(isWithinLimit(0, null)).toBe(true)
    expect(isWithinLimit(1_000_000, null)).toBe(true)
  })

  it('allows another unit below the cap', () => {
    expect(isWithinLimit(0, 3)).toBe(true)
    expect(isWithinLimit(2, 3)).toBe(true)
  })

  it('refuses once the cap is reached', () => {
    expect(isWithinLimit(3, 3)).toBe(false)
  })

  it('refuses when the cap is already exceeded', () => {
    // Can happen after a downgrade, so it must not wrap around to allowed.
    expect(isWithinLimit(9, 3)).toBe(false)
  })

  it('refuses everything at a zero cap', () => {
    expect(isWithinLimit(0, 0)).toBe(false)
  })
})

describe('remainingOf', () => {
  it('reports no cap as null', () => {
    expect(remainingOf(42, null)).toBeNull()
  })

  it('counts down from the cap', () => {
    expect(remainingOf(0, 50)).toBe(50)
    expect(remainingOf(20, 50)).toBe(30)
  })

  it('reports zero at the cap', () => {
    expect(remainingOf(50, 50)).toBe(0)
  })

  it('never reports a negative remainder', () => {
    // A downgrade can leave usage above the new cap; the UI must not show "-40 left".
    expect(remainingOf(90, 50)).toBe(0)
  })
})

describe('resolveStripePriceId', () => {
  const paidPlanId: PlanId = 'pro'
  const envVar = PLANS[paidPlanId].stripePriceIdEnvVar as string

  it('returns the configured price id', () => {
    expect(resolveStripePriceId(paidPlanId, { [envVar]: 'price_123' })).toBe('price_123')
  })

  it('throws for a plan that cannot be purchased', () => {
    expect(() => resolveStripePriceId('free', {})).toThrowError(/not purchasable/i)
  })

  it('names the missing env var when it is unset', () => {
    // A vague failure here sends users to a broken Stripe page instead.
    expect(() => resolveStripePriceId(paidPlanId, {})).toThrowError(new RegExp(envVar))
  })

  it.each([
    ['an empty value', ''],
    ['a whitespace-only value', '   '],
  ])('treats %s as missing', (_label, value) => {
    expect(() => resolveStripePriceId(paidPlanId, { [envVar]: value })).toThrowError(
      new RegExp(envVar),
    )
  })

  it('reads from process.env by default', () => {
    const previous = process.env[envVar]
    process.env[envVar] = 'price_from_process_env'

    try {
      expect(resolveStripePriceId(paidPlanId)).toBe('price_from_process_env')
    } finally {
      if (previous === undefined) delete process.env[envVar]
      else process.env[envVar] = previous
    }
  })
})
