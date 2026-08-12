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

/**
 * The landing page exists in English and Russian; the dashboard is English
 * only, so every function defaults to 'en' and no dashboard call site changes.
 */
export type CopyLocale = 'en' | 'ru'

/** Formats a whole-dollar price. All plans are priced in whole dollars. */
export function formatPrice(cents: number, locale: CopyLocale = 'en'): string {
  if (cents === 0) return locale === 'ru' ? 'Бесплатно' : 'Free'
  return `$${(cents / 100).toLocaleString(NUMBER_LOCALE[locale], { maximumFractionDigits: 0 })}`
}

/** Renders a limit, spelling out the uncapped case. */
export function formatLimit(limit: Limit, locale: CopyLocale = 'en'): string {
  if (limit === null) return locale === 'ru' ? 'Без ограничений' : 'Unlimited'
  return limit.toLocaleString(NUMBER_LOCALE[locale])
}

/** ru-RU groups thousands with a non-breaking space rather than a comma. */
const NUMBER_LOCALE: Record<CopyLocale, string> = { en: 'en-US', ru: 'ru-RU' }

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`
}

/**
 * Russian needs three plural forms, chosen by the last digits: 1 бот,
 * 2 бота, 5 ботов — and the teens are always the "many" form (11 ботов).
 * Getting this wrong is the fastest way for a page to read as translated
 * by a machine.
 */
export function pluralizeRu(count: number, [one, few, many]: [string, string, string]): string {
  const number = count.toLocaleString('ru-RU')
  const lastTwo = count % 100
  const last = count % 10

  if (last === 1 && lastTwo !== 11) return `${number} ${one}`
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${number} ${few}`
  return `${number} ${many}`
}

/** One-line positioning, chosen per plan rather than derived. */
export const PLAN_TAGLINES: Record<PlanId, string> = {
  free: 'See it answer your own questions before you pay anything.',
  pro: 'For a company running one site and taking enquiries daily.',
  business: 'For firms running several brands or regional sites.',
}

/** The same positioning for the Russian landing. */
export const PLAN_TAGLINES_RU: Record<PlanId, string> = {
  free: 'Проверьте на собственных вопросах, прежде чем платить.',
  pro: 'Для компании с одним сайтом и ежедневным потоком заявок.',
  business: 'Для тех, кто ведёт несколько брендов или региональных сайтов.',
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
export function planHighlights(plan: Plan, locale: CopyLocale = 'en'): string[] {
  if (locale === 'ru') return planHighlightsRu(plan)

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

function planHighlightsRu(plan: Plan): string[] {
  const { limits, features } = plan

  const highlights = [
    pluralizeRu(limits.bots, ['бот', 'бота', 'ботов']),
    limits.documentsPerBot === null
      ? 'Документы — без ограничений'
      : `${pluralizeRu(limits.documentsPerBot, ['документ', 'документа', 'документов'])} на бота`,
    `${pluralizeRu(limits.answersPerMonth, ['ответ', 'ответа', 'ответов'])} в месяц`,
    // After «до» the counted noun goes to the genitive: до 150 страниц, до 21 страницы.
    `До ${limits.pagesPerDocument.toLocaleString('ru-RU')} ${genitivePages(limits.pagesPerDocument)} в документе`,
  ]

  highlights.push(
    limits.visibleLeads === null
      ? 'Все заявки, с полной перепиской'
      : pluralizeRu(limits.visibleLeads, [
          'последняя заявка',
          'последние заявки',
          'последних заявок',
        ]),
  )

  if (features.watermark) {
    highlights.push(`Показывает небольшой бейдж ${APP_NAME}`)
  }

  return highlights
}

function genitivePages(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? 'страницы' : 'страниц'
}
