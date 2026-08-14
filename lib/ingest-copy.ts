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
    'This PDF has no text in it — it looks like a scan or photos of pages. Export it as a text PDF, or paste the text in directly.',
  'unreadable-pdf':
    'This file could not be opened. If it is password-protected, remove the password and try again.',
  'empty-document': 'There was no text to read in this document.',
  'too-many-pages': 'This document is longer than your plan allows. Split it, or upgrade.',
  'duplicate-document':
    'This document is already in the knowledge base. Delete the old copy first if you meant to replace it.',
  'chunk-write-failed': 'Something went wrong while saving the text. Try uploading it again.',
  'site-unreachable':
    'No readable pages were found on this site. Check that it is online and try again.',
  'site-unchanged': 'The site has not changed since the last import, so nothing was replaced.',
  unknown: 'Something went wrong. Try uploading it again.',
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

  return `This document is ${pageCount.toLocaleString('en-US')} pages, and your plan allows ${maxPages.toLocaleString('en-US')}. Split it, or upgrade.`
}
