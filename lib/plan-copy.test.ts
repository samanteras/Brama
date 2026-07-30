import { describe, expect, it } from 'vitest'

import {
  botAllowanceMessage,
  FEATURED_PLAN_ID,
  formatLimit,
  formatPrice,
  PLAN_TAGLINES,
  planHighlights,
} from './plan-copy'
import { isPlanId, PLAN_IDS, PLAN_LIST, PLANS, type Plan } from './plans'

describe('formatPrice', () => {
  it('spells out a zero price', () => {
    expect(formatPrice(0)).toBe('Free')
  })

  it('renders whole dollars without decimals', () => {
    expect(formatPrice(2900)).toBe('$29')
    expect(formatPrice(9900)).toBe('$99')
  })

  it('groups thousands', () => {
    expect(formatPrice(120_000)).toBe('$1,200')
  })
})

describe('formatLimit', () => {
  it('spells out an uncapped limit', () => {
    expect(formatLimit(null)).toBe('Unlimited')
  })

  it('groups thousands', () => {
    expect(formatLimit(5000)).toBe('5,000')
  })

  it('renders a small number plainly', () => {
    expect(formatLimit(3)).toBe('3')
  })
})

describe('PLAN_TAGLINES', () => {
  it('covers every plan', () => {
    for (const id of PLAN_IDS) {
      expect(PLAN_TAGLINES[id].length).toBeGreaterThan(0)
    }
  })

  it('says something different about each plan', () => {
    expect(new Set(Object.values(PLAN_TAGLINES)).size).toBe(PLAN_IDS.length)
  })
})

describe('FEATURED_PLAN_ID', () => {
  it('points at a real plan', () => {
    expect(isPlanId(FEATURED_PLAN_ID)).toBe(true)
  })

  it('is a paid plan', () => {
    // Featuring the free tier would defeat the purpose of featuring one.
    expect(PLANS[FEATURED_PLAN_ID].monthlyPriceCents).toBeGreaterThan(0)
  })
})

describe('botAllowanceMessage', () => {
  it('says "one bot" rather than "1 bots" for a single-bot plan', () => {
    expect(botAllowanceMessage(PLANS.free)).toBe('The Free plan includes one bot.')
  })

  it('pluralizes for a multi-bot plan', () => {
    expect(botAllowanceMessage(PLANS.pro)).toBe('The Pro plan includes 3 bots.')
  })

  it('tracks the real limit rather than hardcoding it', () => {
    const inflated: Plan = { ...PLANS.pro, limits: { ...PLANS.pro.limits, bots: 12 } }
    expect(botAllowanceMessage(inflated)).toContain('12 bots')
  })

  it('names every plan correctly', () => {
    for (const plan of PLAN_LIST) {
      expect(botAllowanceMessage(plan)).toContain(plan.name)
    }
  })
})

describe('planHighlights', () => {
  it('produces bullets for every plan', () => {
    for (const plan of PLAN_LIST) {
      expect(planHighlights(plan).length).toBeGreaterThan(0)
    }
  })

  it('never emits an empty bullet', () => {
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan)) {
        expect(bullet.trim()).not.toBe('')
      }
    }
  })

  it.each(PLAN_IDS)('states the real answer allowance for %s', (id) => {
    const plan = PLANS[id]
    const expected = plan.limits.answersPerMonth.toLocaleString('en-US')

    expect(planHighlights(plan).some((bullet) => bullet.includes(expected))).toBe(true)
  })

  it.each(PLAN_IDS)('states the real bot allowance for %s', (id) => {
    const plan = PLANS[id]

    expect(planHighlights(plan).some((bullet) => bullet.includes(String(plan.limits.bots)))).toBe(
      true,
    )
  })

  it('tracks a changed limit instead of hardcoding it', () => {
    // The guarantee that makes this module worth having: change the number the
    // server enforces, and the marketing copy moves with it.
    const inflated: Plan = {
      ...PLANS.pro,
      limits: { ...PLANS.pro.limits, answersPerMonth: 4242 },
    }

    expect(planHighlights(inflated).some((bullet) => bullet.includes('4,242'))).toBe(true)
  })

  it('singularizes a count of one', () => {
    expect(planHighlights(PLANS.free)).toContain('1 bot')
  })

  it('pluralizes a count above one', () => {
    expect(planHighlights(PLANS.pro).some((bullet) => bullet.startsWith('3 bots'))).toBe(true)
  })

  it('spells out unlimited documents rather than printing null', () => {
    const bullets = planHighlights(PLANS.business)

    expect(bullets).toContain('Unlimited documents')
    expect(bullets.some((bullet) => bullet.includes('null'))).toBe(false)
  })

  it('never leaks a null into any bullet', () => {
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan)) {
        expect(bullet).not.toContain('null')
        expect(bullet).not.toContain('undefined')
        expect(bullet).not.toContain('NaN')
      }
    }
  })

  it('promises full lead access only where the plan grants it', () => {
    const proBullets = planHighlights(PLANS.pro).join(' ')
    const freeBullets = planHighlights(PLANS.free).join(' ')

    expect(proBullets).toContain('Every lead')
    expect(freeBullets).not.toContain('Every lead')
    expect(freeBullets).toContain(String(PLANS.free.limits.visibleLeads))
  })

  it('mentions the badge only on plans that carry it', () => {
    for (const plan of PLAN_LIST) {
      const mentionsBadge = planHighlights(plan).some((bullet) => bullet.includes('badge'))
      expect(mentionsBadge).toBe(plan.features.watermark)
    }
  })

  it('mentions domain locking only on plans that offer it', () => {
    for (const plan of PLAN_LIST) {
      const bullets = planHighlights(plan).join(' ')
      expect(bullets.includes('locked to your own domains')).toBe(plan.features.customDomains)
    }
  })
})
