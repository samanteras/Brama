import { describe, expect, it } from 'vitest'

import {
  botAllowanceMessage,
  FEATURED_PLAN_ID,
  formatLimit,
  formatPrice,
  PLAN_TAGLINES,
  PLAN_TAGLINES_RU,
  planHighlights,
  pluralizeRu,
} from './plan-copy'
import { isPlanId, PLAN_IDS, PLAN_LIST, PLANS, type Plan } from './plans'

describe('formatPrice', () => {
  it('defaults to Russian, the dashboard language', () => {
    expect(formatPrice(0)).toBe('Бесплатно')
  })

  it('spells out a zero price in English', () => {
    expect(formatPrice(0, 'en')).toBe('Free')
  })

  it('renders whole dollars without decimals', () => {
    expect(formatPrice(2900, 'en')).toBe('$29')
    expect(formatPrice(9900, 'en')).toBe('$99')
  })

  it('groups thousands', () => {
    expect(formatPrice(120_000, 'en')).toBe('$1,200')
  })
})

describe('formatLimit', () => {
  it('defaults to Russian, the dashboard language', () => {
    expect(formatLimit(null)).toBe('Без ограничений')
  })

  it('spells out an uncapped limit in English', () => {
    expect(formatLimit(null, 'en')).toBe('Unlimited')
  })

  it('groups thousands', () => {
    expect(formatLimit(5000, 'en')).toBe('5,000')
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

describe('pluralizeRu', () => {
  const bots: [string, string, string] = ['бот', 'бота', 'ботов']

  it.each([
    [1, '1 бот'],
    [2, '2 бота'],
    [4, '4 бота'],
    [5, '5 ботов'],
    [10, '10 ботов'],
  ])('handles the basic digit rules: %i', (count, expected) => {
    expect(pluralizeRu(count, bots)).toBe(expected)
  })

  it.each([
    [11, '11 ботов'],
    [12, '12 ботов'],
    [14, '14 ботов'],
  ])('keeps the teens on the many form: %i', (count, expected) => {
    // 11–14 break the last-digit rule — «11 бот» is the classic machine
    // translation give-away this helper exists to prevent.
    expect(pluralizeRu(count, bots)).toBe(expected)
  })

  it.each([
    [21, '21 бот'],
    [22, '22 бота'],
    [25, '25 ботов'],
    [111, '111 ботов'],
    [121, '121 бот'],
  ])('applies last-digit rules past twenty: %i', (count, expected) => {
    expect(pluralizeRu(count, bots)).toBe(expected)
  })

  it('groups thousands the Russian way', () => {
    expect(pluralizeRu(5000, ['ответ', 'ответа', 'ответов'])).toBe(
      `${(5000).toLocaleString('ru-RU')} ответов`,
    )
  })
})

describe('localized formatting', () => {
  it('spells out a zero price in Russian', () => {
    expect(formatPrice(0, 'ru')).toBe('Бесплатно')
  })

  it('keeps the dollar sign for Russian prices', () => {
    expect(formatPrice(2900, 'ru')).toBe('$29')
  })

  it('spells out an uncapped limit in Russian', () => {
    expect(formatLimit(null, 'ru')).toBe('Без ограничений')
  })
})

describe('PLAN_TAGLINES_RU', () => {
  it('covers every plan', () => {
    for (const id of PLAN_IDS) {
      expect(PLAN_TAGLINES_RU[id].length).toBeGreaterThan(0)
    }
  })

  it('says something different about each plan', () => {
    expect(new Set(Object.values(PLAN_TAGLINES_RU)).size).toBe(PLAN_IDS.length)
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
  it('says «один бот» rather than «1 ботов» for a single-bot plan', () => {
    expect(botAllowanceMessage(PLANS.free)).toBe('В тариф Free входит один бот.')
  })

  it('declines the count for a multi-bot plan', () => {
    expect(botAllowanceMessage(PLANS.pro)).toBe('В тариф Pro входит 3 бота.')
  })

  it('tracks the real limit rather than hardcoding it', () => {
    const inflated: Plan = { ...PLANS.pro, limits: { ...PLANS.pro.limits, bots: 12 } }
    expect(botAllowanceMessage(inflated)).toContain('12 ботов')
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
      expect(planHighlights(plan, 'en').length).toBeGreaterThan(0)
    }
  })

  it('never emits an empty bullet', () => {
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan, 'en')) {
        expect(bullet.trim()).not.toBe('')
      }
    }
  })

  it.each(PLAN_IDS)('states the real answer allowance for %s', (id) => {
    const plan = PLANS[id]
    const expected = plan.limits.answersPerMonth.toLocaleString('en-US')

    expect(planHighlights(plan, 'en').some((bullet) => bullet.includes(expected))).toBe(true)
  })

  it.each(PLAN_IDS)('states the real bot allowance for %s', (id) => {
    const plan = PLANS[id]

    expect(
      planHighlights(plan, 'en').some((bullet) => bullet.includes(String(plan.limits.bots))),
    ).toBe(true)
  })

  it('tracks a changed limit instead of hardcoding it', () => {
    // The guarantee that makes this module worth having: change the number the
    // server enforces, and the marketing copy moves with it.
    const inflated: Plan = {
      ...PLANS.pro,
      limits: { ...PLANS.pro.limits, answersPerMonth: 4242 },
    }

    expect(planHighlights(inflated, 'en').some((bullet) => bullet.includes('4,242'))).toBe(true)
  })

  it('singularizes a count of one', () => {
    expect(planHighlights(PLANS.free, 'en')).toContain('1 bot')
  })

  it('pluralizes a count above one', () => {
    expect(planHighlights(PLANS.pro, 'en').some((bullet) => bullet.startsWith('3 bots'))).toBe(true)
  })

  it('spells out unlimited documents rather than printing null', () => {
    const bullets = planHighlights(PLANS.business, 'en')

    expect(bullets).toContain('Unlimited documents')
    expect(bullets.some((bullet) => bullet.includes('null'))).toBe(false)
  })

  it('never leaks a null into any bullet', () => {
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan, 'en')) {
        expect(bullet).not.toContain('null')
        expect(bullet).not.toContain('undefined')
        expect(bullet).not.toContain('NaN')
      }
    }
  })

  it('promises full lead access only where the plan grants it', () => {
    const proBullets = planHighlights(PLANS.pro, 'en').join(' ')
    const freeBullets = planHighlights(PLANS.free, 'en').join(' ')

    expect(proBullets).toContain('Every lead')
    expect(freeBullets).not.toContain('Every lead')
    expect(freeBullets).toContain(String(PLANS.free.limits.visibleLeads))
  })

  it('mentions the badge only on plans that carry it', () => {
    for (const plan of PLAN_LIST) {
      const mentionsBadge = planHighlights(plan, 'en').some((bullet) => bullet.includes('badge'))
      expect(mentionsBadge).toBe(plan.features.watermark)
    }
  })

  it('does not list domain locking at all', () => {
    // Every plan has it, so it differentiates nothing and belongs in the
    // product rather than the price comparison.
    for (const plan of PLAN_LIST) {
      expect(planHighlights(plan, 'en').join(' ').toLowerCase()).not.toContain('domain')
    }
  })
})

describe('planHighlights in Russian', () => {
  it('produces the same number of bullets as the English version', () => {
    // The two locales are the same pricing card; a bullet existing in one
    // language but not the other means the two pages promise different plans.
    for (const plan of PLAN_LIST) {
      expect(planHighlights(plan, 'ru').length).toBe(planHighlights(plan, 'en').length)
    }
  })

  it.each(PLAN_IDS)('states the real bot allowance for %s', (id) => {
    const plan = PLANS[id]

    expect(
      planHighlights(plan, 'ru').some((bullet) => bullet.includes(String(plan.limits.bots))),
    ).toBe(true)
  })

  it('declines the bot count correctly', () => {
    expect(planHighlights(PLANS.free, 'ru')).toContain('1 бот')
    expect(planHighlights(PLANS.pro, 'ru').some((bullet) => bullet.startsWith('3 бота'))).toBe(
      true,
    )
  })

  it('tracks a changed limit instead of hardcoding it', () => {
    const inflated: Plan = {
      ...PLANS.pro,
      limits: { ...PLANS.pro.limits, answersPerMonth: 4242 },
    }

    expect(
      planHighlights(inflated, 'ru').some((bullet) =>
        bullet.includes((4242).toLocaleString('ru-RU')),
      ),
    ).toBe(true)
  })

  it('never leaks a null into any bullet', () => {
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan, 'ru')) {
        expect(bullet).not.toContain('null')
        expect(bullet).not.toContain('undefined')
        expect(bullet).not.toContain('NaN')
      }
    }
  })

  it('contains no leftover English', () => {
    // A single untranslated bullet on the Russian pricing card reads worse
    // than no Russian page at all.
    for (const plan of PLAN_LIST) {
      for (const bullet of planHighlights(plan, 'ru')) {
        expect(bullet).not.toMatch(/\b(bot|document|answer|page|lead|per|month)s?\b/i)
      }
    }
  })

  it('mentions the badge only on plans that carry it', () => {
    for (const plan of PLAN_LIST) {
      const mentionsBadge = planHighlights(plan, 'ru').some((bullet) =>
        bullet.includes('бейдж'),
      )
      expect(mentionsBadge).toBe(plan.features.watermark)
    }
  })
})
