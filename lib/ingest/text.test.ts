import { describe, expect, it } from 'vitest'

import { countVisibleCharacters, estimateTokens, normalizeText } from './text'

const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b)
const ZERO_WIDTH_NON_JOINER = String.fromCharCode(0x200c)
const ZERO_WIDTH_JOINER = String.fromCharCode(0x200d)
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)
const NON_BREAKING_SPACE = String.fromCharCode(0x00a0)

describe('normalizeText', () => {
  it('converts Windows line endings', () => {
    expect(normalizeText('first\r\nsecond')).toBe('first\nsecond')
  })

  it('converts classic Mac line endings', () => {
    expect(normalizeText('first\rsecond')).toBe('first\nsecond')
  })

  it('converts a non-breaking space to a plain space', () => {
    // Otherwise "Total: 1000" and "Total: 1000" read as different documents.
    expect(normalizeText(`Total:${NON_BREAKING_SPACE}1000`)).toBe('Total: 1000')
  })

  it.each([
    ['zero-width space', ZERO_WIDTH_SPACE],
    ['zero-width non-joiner', ZERO_WIDTH_NON_JOINER],
    ['zero-width joiner', ZERO_WIDTH_JOINER],
    ['byte order mark', BYTE_ORDER_MARK],
  ])('strips a %s', (_label, character) => {
    expect(normalizeText(`de${character}molition`)).toBe('demolition')
  })

  it('strips several invisible characters at once', () => {
    // Guards the character class itself: a regex built without brackets would
    // only match these four in sequence and quietly leave them all in place.
    const input = `a${ZERO_WIDTH_SPACE}b${BYTE_ORDER_MARK}c${ZERO_WIDTH_JOINER}d`
    expect(normalizeText(input)).toBe('abcd')
  })

  it('removes trailing spaces and tabs from each line', () => {
    expect(normalizeText('first   \nsecond\t\nthird')).toBe('first\nsecond\nthird')
  })

  it('collapses three or more newlines into a paragraph break', () => {
    expect(normalizeText('first\n\n\n\n\nsecond')).toBe('first\n\nsecond')
  })

  it('preserves a single paragraph break', () => {
    // Chunking splits on these, so flattening them would destroy structure.
    expect(normalizeText('first\n\nsecond')).toBe('first\n\nsecond')
  })

  it('preserves a single newline inside a paragraph', () => {
    expect(normalizeText('first\nsecond')).toBe('first\nsecond')
  })

  it('trims the document as a whole', () => {
    expect(normalizeText('\n\n  text  \n\n')).toBe('text')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeText('   \n\n\t  ')).toBe('')
  })

  it('leaves already normalized text untouched', () => {
    const clean = 'Renovation stages\n\nDemolition, then rough work.'
    expect(normalizeText(clean)).toBe(clean)
  })

  it('is idempotent', () => {
    const messy = `first\r\n\r\n\r\n  second${NON_BREAKING_SPACE}${ZERO_WIDTH_SPACE}  `
    expect(normalizeText(normalizeText(messy))).toBe(normalizeText(messy))
  })
})

describe('countVisibleCharacters', () => {
  it('ignores all whitespace', () => {
    expect(countVisibleCharacters(' a b\tc\nd ')).toBe(4)
  })

  it('returns zero for whitespace only', () => {
    expect(countVisibleCharacters('  \n\t ')).toBe(0)
  })

  it('returns zero for an empty string', () => {
    expect(countVisibleCharacters('')).toBe(0)
  })
})

describe('estimateTokens', () => {
  it('returns zero for an empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('rounds up to whole tokens', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
  })

  it('never returns zero for non-empty text', () => {
    expect(estimateTokens('a')).toBeGreaterThan(0)
  })

  it('grows with length', () => {
    expect(estimateTokens('a'.repeat(4000))).toBeGreaterThan(estimateTokens('a'.repeat(400)))
  })
})
