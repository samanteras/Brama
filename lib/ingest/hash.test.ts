import { describe, expect, it } from 'vitest'

import { contentHash } from './hash'

const PRICE_LIST = 'Turnkey renovation\n\nRough work: from $35/m2.\nFinishing: from $60/m2.'

describe('contentHash', () => {
  it('produces a 64-character lowercase hex digest', () => {
    expect(contentHash(PRICE_LIST)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable across calls', () => {
    expect(contentHash(PRICE_LIST)).toBe(contentHash(PRICE_LIST))
  })

  it('ignores line-ending differences', () => {
    // The same file exported on Windows and macOS must not read as two uploads.
    expect(contentHash('first\r\nsecond')).toBe(contentHash('first\nsecond'))
  })

  it('ignores trailing whitespace', () => {
    expect(contentHash('first   \nsecond')).toBe(contentHash('first\nsecond'))
  })

  it('ignores leading and trailing blank lines', () => {
    expect(contentHash('\n\n  text  \n\n')).toBe(contentHash('text'))
  })

  it('ignores invisible characters', () => {
    const withZeroWidth = `de${String.fromCharCode(0x200b)}molition`
    expect(contentHash(withZeroWidth)).toBe(contentHash('demolition'))
  })

  it('distinguishes genuinely different content', () => {
    expect(contentHash('Rough work: from $35/m2.')).not.toBe(contentHash('Rough work: from $45/m2.'))
  })

  it('distinguishes a single changed digit', () => {
    // A price list differing by one number is a different document.
    expect(contentHash(PRICE_LIST)).not.toBe(contentHash(PRICE_LIST.replace('$35', '$36')))
  })

  it('treats a paragraph break as meaningful', () => {
    expect(contentHash('first\nsecond')).not.toBe(contentHash('first\n\nsecond'))
  })

  it('hashes empty and whitespace-only input identically', () => {
    expect(contentHash('   \n\t ')).toBe(contentHash(''))
  })
})
