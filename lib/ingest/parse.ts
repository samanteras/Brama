/**
 * Turns an uploaded file into indexable text, or an explicit, actionable reason
 * why it cannot be indexed.
 *
 * Failures here are expected outcomes, not exceptions: a scanned price list is a
 * perfectly ordinary thing for a customer to upload. They are returned as data
 * so the UI can explain what happened and offer a next step, rather than
 * surfacing as a 500 or — worse — a document that sits at "ready" with zero
 * chunks while the bot silently knows nothing.
 *
 * Only failure *codes* live here. The wording belongs with the rest of the copy,
 * for the same reason pricing numbers and pricing prose are kept apart.
 */

import { countVisibleCharacters, normalizeText } from './text'

export type SourceType = 'pdf' | 'text' | 'markdown' | 'paste'

export type ParseFailureCode =
  /** No text at all, e.g. an empty paste or a blank .txt. */
  | 'empty-document'
  /** A PDF whose pages carry no text layer — almost always a scan or a photo. */
  | 'scanned-pdf'
  /** Corrupt, encrypted, or not actually a PDF. */
  | 'unreadable-pdf'
  /** Longer than the account's plan allows. */
  | 'too-many-pages'

export type ParseFailure = {
  code: ParseFailureCode
  /** Present when known, so the UI can say "312 pages, limit is 200". */
  pageCount?: number
  /** Present for `too-many-pages`, to avoid re-deriving the plan limit in the UI. */
  maxPages?: number
}

export type ParsedDocument = {
  text: string
  pageCount: number
  visibleCharacters: number
}

export type ParseResult =
  | { ok: true; document: ParsedDocument }
  | { ok: false; failure: ParseFailure }

export type ParseOptions = {
  /** From the account's plan; see `PlanLimits.pagesPerDocument`. */
  maxPages: number
}

/**
 * Below this many visible characters per page, a PDF is treated as a scan.
 *
 * Real text runs many hundreds of characters per page, while a scan yields zero
 * or a few stray artefacts, so the threshold sits far from both — chosen to make
 * false positives implausible rather than to be finely tuned.
 */
export const MIN_VISIBLE_CHARS_PER_PAGE = 50

/**
 * Characters treated as one "page" when counting pasted or plain text.
 *
 * Plain text has no pages, but the plan limit is expressed in pages, and without
 * a conversion a free account could paste a megabyte of text and bypass the cap
 * entirely. Roughly one page of prose.
 */
export const CHARS_PER_TEXT_PAGE = 1800

/**
 * Decides whether extracted text is usable.
 *
 * Kept free of any PDF library so the rules that actually matter — the scan
 * heuristic and the page cap — are testable without constructing binary
 * fixtures. The format-specific functions below are thin adapters onto this.
 */
export function evaluateExtraction(input: {
  text: string
  pageCount: number
  maxPages: number
  /** PDFs report empty text as a scan; text sources report it as empty. */
  emptyAs: Extract<ParseFailureCode, 'empty-document' | 'scanned-pdf'>
  /** Only PDFs get the per-page density check. */
  applyScanHeuristic: boolean
}): ParseResult {
  const { pageCount, maxPages, emptyAs, applyScanHeuristic } = input

  if (pageCount <= 0) {
    return { ok: false, failure: { code: 'unreadable-pdf' } }
  }

  // Checked before the content so an oversized upload fails for the reason the
  // user can act on, rather than for whatever its first page happens to contain.
  if (pageCount > maxPages) {
    return { ok: false, failure: { code: 'too-many-pages', pageCount, maxPages } }
  }

  const text = normalizeText(input.text)
  const visibleCharacters = countVisibleCharacters(text)

  if (visibleCharacters === 0) {
    return { ok: false, failure: { code: emptyAs, pageCount } }
  }

  if (applyScanHeuristic && visibleCharacters / pageCount < MIN_VISIBLE_CHARS_PER_PAGE) {
    return { ok: false, failure: { code: 'scanned-pdf', pageCount } }
  }

  return { ok: true, document: { text, pageCount, visibleCharacters } }
}

/**
 * Extracts text from a PDF.
 *
 * Pages are extracted separately and joined with a blank line so chunking sees
 * page boundaries as paragraph boundaries — a heading at the top of a page stays
 * with its own content instead of merging into the previous page's last line.
 */
export async function parsePdf(bytes: Uint8Array, options: ParseOptions): Promise<ParseResult> {
  let extracted: { totalPages: number; text: string[] }

  try {
    const { extractText } = await import('unpdf')
    extracted = await extractText(bytes, { mergePages: false })
  } catch {
    // Corrupt, password-protected, or simply not a PDF. The user gets one clear
    // message either way; the distinction would not change what they do next.
    return { ok: false, failure: { code: 'unreadable-pdf' } }
  }

  return evaluateExtraction({
    text: extracted.text.join('\n\n'),
    pageCount: extracted.totalPages,
    maxPages: options.maxPages,
    emptyAs: 'scanned-pdf',
    applyScanHeuristic: true,
  })
}

/** Handles .txt, .md and text pasted straight into the dashboard. */
export function parsePlainText(raw: string, options: ParseOptions): ParseResult {
  const text = normalizeText(raw)

  // Derived from length rather than reported, since text has no real pages.
  const pageCount = Math.max(1, Math.ceil(text.length / CHARS_PER_TEXT_PAGE))

  return evaluateExtraction({
    text,
    pageCount,
    maxPages: options.maxPages,
    emptyAs: 'empty-document',
    applyScanHeuristic: false,
  })
}
