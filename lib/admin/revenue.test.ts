import { describe, expect, it } from 'vitest'

import { estimateMonthlyRevenueCents } from './revenue'
import { PLANS } from '@/lib/plans'

describe('estimateMonthlyRevenueCents', () => {
  it('sums paid plans at their list prices', () => {
    const expected = 2 * PLANS.pro.monthlyPriceCents + 3 * PLANS.business.monthlyPriceCents
    expect(estimateMonthlyRevenueCents({ planPro: 2, planBusiness: 3 })).toBe(expected)
  })

  it('is zero with no paid plans', () => {
    expect(estimateMonthlyRevenueCents({ planPro: 0, planBusiness: 0 })).toBe(0)
  })

  it('ignores free plans by construction (they are not an input)', () => {
    // Only pro/business contribute; a big free base adds nothing.
    expect(estimateMonthlyRevenueCents({ planPro: 1, planBusiness: 0 })).toBe(
      PLANS.pro.monthlyPriceCents,
    )
  })

  it('tracks the price defined in lib/plans.ts rather than a hardcoded number', () => {
    expect(estimateMonthlyRevenueCents({ planPro: 1, planBusiness: 1 })).toBe(
      PLANS.pro.monthlyPriceCents + PLANS.business.monthlyPriceCents,
    )
  })
})
