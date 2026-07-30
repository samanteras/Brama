/**
 * Exercises `parsePdf` against real PDF bytes, with no mocking.
 *
 * The rest of the parser suite mocks `unpdf` to test our rules in isolation.
 * That leaves one thing unproven: whether the library actually works in this
 * runtime. This file closes that gap by assembling a valid PDF at test time
 * rather than committing a binary fixture, so the test stays readable and
 * reviewable — you can see exactly what text is supposed to come back out.
 */

import { describe, expect, it } from 'vitest'

import { parsePdf } from './parse'

/** Escapes the three characters that are special inside a PDF string literal. */
function escapePdfText(text: string): string {
  return text.replace(/([\\()])/g, '\\$1')
}

/**
 * Builds a minimal but structurally valid PDF, one text line per page.
 *
 * Cross-reference offsets are computed from the assembled body, because pdf.js
 * is entitled to reject a file whose xref table lies. Content is kept ASCII so
 * character offsets and byte offsets agree.
 */
function buildPdf(pageTexts: string[]): Uint8Array {
  const CATALOG = 1
  const PAGES = 2
  const FONT = 3
  const FIRST_PAGE = 4

  // Each page consumes two objects: the page itself and its content stream.
  const pageObjectNumbers = pageTexts.map((_, index) => FIRST_PAGE + index * 2)

  const objects: string[] = []
  objects[CATALOG] = `<< /Type /Catalog /Pages ${PAGES} 0 R >>`
  objects[PAGES] =
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}]` +
    ` /Count ${pageTexts.length} >>`
  objects[FONT] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

  pageTexts.forEach((text, index) => {
    const pageObject = pageObjectNumbers[index]
    const contentObject = pageObject + 1

    objects[pageObject] =
      `<< /Type /Page /Parent ${PAGES} 0 R /MediaBox [0 0 612 792]` +
      ` /Resources << /Font << /F1 ${FONT} 0 R >> >> /Contents ${contentObject} 0 R >>`

    // An empty string still produces a page with no text, which is what a scan
    // looks like to an extractor.
    const stream =
      text === '' ? '' : `BT /F1 12 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`

    objects[contentObject] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  })

  let body = '%PDF-1.4\n'
  const offsets: number[] = []

  for (let number = 1; number < objects.length; number++) {
    offsets[number] = body.length
    body += `${number} 0 obj\n${objects[number]}\nendobj\n`
  }

  const xrefOffset = body.length
  const size = objects.length

  body += `xref\n0 ${size}\n`
  body += '0000000000 65535 f \n'
  for (let number = 1; number < size; number++) {
    body += `${String(offsets[number]).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${size} /Root ${CATALOG} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return new TextEncoder().encode(body)
}

/** Long enough to clear the scan-density threshold on its own. */
function longLine(subject: string): string {
  return `${subject} is included in the turnkey price and takes about two weeks to complete.`
}

const options = { maxPages: 200 }

describe('parsePdf against real PDF bytes', () => {
  it('extracts text from a single-page PDF', async () => {
    const result = await parsePdf(buildPdf([longLine('Demolition')]), options)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.document.text).toContain('Demolition')
    expect(result.document.pageCount).toBe(1)
  })

  it('extracts every page of a multi-page PDF', async () => {
    const pdf = buildPdf([longLine('Demolition'), longLine('Plumbing'), longLine('Finishing')])

    const result = await parsePdf(pdf, options)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.document.pageCount).toBe(3)
    expect(result.document.text).toContain('Demolition')
    expect(result.document.text).toContain('Plumbing')
    expect(result.document.text).toContain('Finishing')
  })

  it('separates pages with a blank line', async () => {
    const pdf = buildPdf([longLine('Demolition'), longLine('Plumbing')])

    const result = await parsePdf(pdf, options)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Page breaks must read as paragraph breaks so chunking keeps a page's
    // heading with its own content.
    expect(result.document.text).toContain('\n\n')
  })

  it('treats a PDF with no text layer as a scan', async () => {
    // Structurally valid, pages present, zero extractable text — exactly what a
    // scanned price list looks like.
    const result = await parsePdf(buildPdf(['', '', '']), options)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.failure.code).toBe('scanned-pdf')
  })

  it('enforces the page cap on a real document', async () => {
    const pdf = buildPdf(Array.from({ length: 5 }, (_, i) => longLine(`Stage ${i}`)))

    const result = await parsePdf(pdf, { maxPages: 3 })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.failure).toEqual({ code: 'too-many-pages', pageCount: 5, maxPages: 3 })
  })

  it.each([
    ['random bytes', new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04])],
    ['plain text pretending to be a PDF', new TextEncoder().encode('this is not a pdf')],
    ['an empty buffer', new Uint8Array()],
    ['a truncated PDF header', new TextEncoder().encode('%PDF-1.4\n1 0 obj')],
  ])('reports %s as unreadable instead of throwing', async (_label, bytes) => {
    const result = await parsePdf(bytes, options)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.failure.code).toBe('unreadable-pdf')
  })
})
