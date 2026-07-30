import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CHARS_PER_TEXT_PAGE,
  evaluateExtraction,
  MIN_VISIBLE_CHARS_PER_PAGE,
  parsePdf,
  parsePlainText,
  type ParseResult,
} from './parse'

const extractText = vi.hoisted(() => vi.fn())

vi.mock('unpdf', () => ({ extractText }))

/** Narrows a result to its failure, so tests read as assertions not casts. */
function failureOf(result: ParseResult) {
  if (result.ok) throw new Error('expected a failure, got a parsed document')
  return result.failure
}

/** Narrows a result to its document. */
function documentOf(result: ParseResult) {
  if (!result.ok) throw new Error(`expected a document, got ${result.failure.code}`)
  return result.document
}

describe('evaluateExtraction', () => {
  const base = {
    maxPages: 200,
    emptyAs: 'scanned-pdf',
    applyScanHeuristic: true,
  } as const

  it('accepts a page with plenty of text', () => {
    const result = evaluateExtraction({ ...base, text: 'a'.repeat(500), pageCount: 1 })
    expect(documentOf(result).pageCount).toBe(1)
  })

  it('reports the normalized text', () => {
    const result = evaluateExtraction({ ...base, text: `  ${'word '.repeat(60)}  `, pageCount: 1 })
    expect(documentOf(result).text.startsWith('word')).toBe(true)
    expect(documentOf(result).text.endsWith('word')).toBe(true)
  })

  it('counts visible characters excluding whitespace', () => {
    const result = evaluateExtraction({ ...base, text: 'ab '.repeat(100), pageCount: 1 })
    expect(documentOf(result).visibleCharacters).toBe(200)
  })

  it.each([
    ['zero pages', 0],
    ['a negative page count', -1],
  ])('treats %s as unreadable', (_label, pageCount) => {
    const result = evaluateExtraction({ ...base, text: 'a'.repeat(500), pageCount })
    expect(failureOf(result).code).toBe('unreadable-pdf')
  })

  it('rejects a document above the page cap', () => {
    const result = evaluateExtraction({ ...base, text: 'a'.repeat(50_000), pageCount: 312, maxPages: 200 })
    expect(failureOf(result)).toEqual({ code: 'too-many-pages', pageCount: 312, maxPages: 200 })
  })

  it('accepts a document exactly at the page cap', () => {
    const result = evaluateExtraction({ ...base, text: 'a'.repeat(50_000), pageCount: 200, maxPages: 200 })
    expect(result.ok).toBe(true)
  })

  it('checks the page cap before the content', () => {
    // An oversized upload must fail for the reason the user can act on, not for
    // whatever its pages happen to contain.
    const result = evaluateExtraction({ ...base, text: '', pageCount: 999, maxPages: 200 })
    expect(failureOf(result).code).toBe('too-many-pages')
  })

  describe('scan heuristic', () => {
    it('rejects a PDF with no text layer at all', () => {
      const result = evaluateExtraction({ ...base, text: '', pageCount: 12 })
      expect(failureOf(result)).toEqual({ code: 'scanned-pdf', pageCount: 12 })
    })

    it('rejects a PDF whose pages carry only stray artefacts', () => {
      // A scan often yields page numbers and nothing else.
      const strayText = Array.from({ length: 20 }, (_, i) => `${i}`).join('\n')
      const result = evaluateExtraction({ ...base, text: strayText, pageCount: 20 })
      expect(failureOf(result).code).toBe('scanned-pdf')
    })

    it('rejects text just below the density threshold', () => {
      const pageCount = 10
      const belowThreshold = 'a'.repeat(pageCount * MIN_VISIBLE_CHARS_PER_PAGE - 1)
      const result = evaluateExtraction({ ...base, text: belowThreshold, pageCount })

      expect(failureOf(result).code).toBe('scanned-pdf')
    })

    it('accepts text exactly at the density threshold', () => {
      const pageCount = 10
      const atThreshold = 'a'.repeat(pageCount * MIN_VISIBLE_CHARS_PER_PAGE)
      const result = evaluateExtraction({ ...base, text: atThreshold, pageCount })

      expect(result.ok).toBe(true)
    })

    it('ignores whitespace when measuring density', () => {
      // A scan padded with newlines must not pass as real text.
      const padded = `${'a'.repeat(10)}${'\n'.repeat(5000)}`
      const result = evaluateExtraction({ ...base, text: padded, pageCount: 10 })

      expect(failureOf(result).code).toBe('scanned-pdf')
    })

    it('does not apply the heuristic when disabled', () => {
      // A short pasted note is legitimate; only PDFs get the density check.
      const result = evaluateExtraction({
        ...base,
        text: 'Pets allowed.',
        pageCount: 1,
        applyScanHeuristic: false,
      })

      expect(result.ok).toBe(true)
    })
  })

  it('uses the configured code for empty content', () => {
    const result = evaluateExtraction({
      ...base,
      text: '   \n\n  ',
      pageCount: 1,
      emptyAs: 'empty-document',
      applyScanHeuristic: false,
    })

    expect(failureOf(result).code).toBe('empty-document')
  })
})

describe('parsePlainText', () => {
  const options = { maxPages: 200 }

  it('accepts ordinary text', () => {
    const result = parsePlainText('Rough work: from $35/m2.', options)
    expect(documentOf(result).text).toBe('Rough work: from $35/m2.')
  })

  it('normalizes line endings', () => {
    expect(documentOf(parsePlainText('first\r\nsecond', options)).text).toBe('first\nsecond')
  })

  it.each([
    ['an empty string', ''],
    ['spaces only', '     '],
    ['newlines only', '\n\n\n'],
  ])('rejects %s as empty', (_label, input) => {
    expect(failureOf(parsePlainText(input, options)).code).toBe('empty-document')
  })

  it('never reports a scan for text sources', () => {
    // A one-line paste is a legitimate knowledge entry.
    expect(parsePlainText('Pets allowed.', options).ok).toBe(true)
  })

  it('counts a short note as one page', () => {
    expect(documentOf(parsePlainText('Short note.', options)).pageCount).toBe(1)
  })

  it('derives page count from length', () => {
    const twoPages = 'a'.repeat(CHARS_PER_TEXT_PAGE + 1)
    expect(documentOf(parsePlainText(twoPages, options)).pageCount).toBe(2)
  })

  it('enforces the page cap on pasted text', () => {
    // Without a length-to-pages conversion a free account could paste a megabyte
    // of text and bypass the plan limit entirely.
    const hugePaste = 'a'.repeat(CHARS_PER_TEXT_PAGE * 40)
    const failure = failureOf(parsePlainText(hugePaste, { maxPages: 30 }))

    expect(failure.code).toBe('too-many-pages')
    expect(failure.maxPages).toBe(30)
  })
})

describe('parsePdf', () => {
  const bytes = new Uint8Array([1, 2, 3])
  const options = { maxPages: 200 }

  beforeEach(() => {
    extractText.mockReset()
  })

  it('joins pages with a blank line so page breaks act as paragraph breaks', async () => {
    extractText.mockResolvedValue({ totalPages: 2, text: ['a'.repeat(300), 'b'.repeat(300)] })

    const result = await parsePdf(bytes, options)

    expect(documentOf(result).text).toBe(`${'a'.repeat(300)}\n\n${'b'.repeat(300)}`)
  })

  it('requests per-page extraction', async () => {
    extractText.mockResolvedValue({ totalPages: 1, text: ['a'.repeat(300)] })

    await parsePdf(bytes, options)

    expect(extractText).toHaveBeenCalledWith(bytes, { mergePages: false })
  })

  it('reports the page count from the PDF itself', async () => {
    extractText.mockResolvedValue({ totalPages: 7, text: [' '.repeat(0), 'a'.repeat(3000)] })

    expect(documentOf(await parsePdf(bytes, options)).pageCount).toBe(7)
  })

  it('detects a scanned PDF', async () => {
    extractText.mockResolvedValue({ totalPages: 12, text: Array.from({ length: 12 }, () => '') })

    expect(failureOf(await parsePdf(bytes, options)).code).toBe('scanned-pdf')
  })

  it('enforces the page cap', async () => {
    extractText.mockResolvedValue({ totalPages: 312, text: ['a'.repeat(200_000)] })

    expect(failureOf(await parsePdf(bytes, { maxPages: 200 })).code).toBe('too-many-pages')
  })

  it.each([
    ['a corrupt file', new Error('Invalid PDF structure')],
    ['an encrypted file', new Error('No password given')],
  ])('reports %s as unreadable', async (_label, error) => {
    extractText.mockRejectedValue(error)

    expect(failureOf(await parsePdf(bytes, options)).code).toBe('unreadable-pdf')
  })

  it('reports a zero-page document as unreadable', async () => {
    extractText.mockResolvedValue({ totalPages: 0, text: [] })

    expect(failureOf(await parsePdf(bytes, options)).code).toBe('unreadable-pdf')
  })

  it('does not throw for any failure mode', async () => {
    // Every one of these is an ordinary thing for a customer to upload, so none
    // of them may surface as a 500.
    extractText.mockRejectedValue(new Error('boom'))

    await expect(parsePdf(bytes, options)).resolves.toMatchObject({ ok: false })
  })
})
