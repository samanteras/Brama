/**
 * Human-facing wording for indexing failures.
 *
 * Separate from `lib/ingest/parse.ts`, which deals only in codes, for the same
 * reason pricing numbers and pricing prose are kept apart: the rules and the
 * words they produce change for different reasons and at different times.
 *
 * Each message answers the only question the customer actually has — what do I
 * do now — rather than describing what went wrong internally.
 */

import type { ParseFailureCode } from './ingest/parse'

type FailureCode =
  | ParseFailureCode
  | 'duplicate-document'
  | 'chunk-write-failed'
  | 'site-unreachable'
  | 'site-unchanged'
  | 'unknown'

const MESSAGES: Record<FailureCode, string> = {
  'scanned-pdf':
    'В этом PDF нет текста — похоже, это скан или фотографии страниц. Экспортируйте его как текстовый PDF или вставьте текст напрямую.',
  'unreadable-pdf':
    'Файл не удалось открыть. Если он защищён паролем, снимите пароль и попробуйте ещё раз.',
  'empty-document': 'В этом документе не нашлось текста.',
  'too-many-pages': 'Документ длиннее, чем позволяет ваш тариф. Разделите его или перейдите на тариф выше.',
  'duplicate-document':
    'Этот документ уже есть в базе знаний. Если хотите заменить его — сначала удалите старую копию.',
  'chunk-write-failed': 'Не получилось сохранить текст. Попробуйте загрузить ещё раз.',
  'site-unreachable':
    'На сайте не нашлось читаемых страниц. Проверьте, что он открывается, и попробуйте ещё раз.',
  'site-unchanged': 'Сайт не изменился с прошлого импорта, поэтому ничего не заменяли.',
  unknown: 'Что-то пошло не так. Попробуйте загрузить ещё раз.',
}

export function ingestFailureMessage(code: string | null | undefined): string {
  if (code && code in MESSAGES) return MESSAGES[code as FailureCode]
  return MESSAGES.unknown
}

/**
 * Adds the specifics a generic message cannot carry, such as the actual page
 * count against the actual limit.
 */
export function pageLimitMessage(pageCount?: number, maxPages?: number): string {
  if (pageCount === undefined || maxPages === undefined) return MESSAGES['too-many-pages']

  return `В документе ${pageCount.toLocaleString('ru-RU')} страниц, а тариф позволяет ${maxPages.toLocaleString('ru-RU')}. Разделите его или перейдите на тариф выше.`
}
