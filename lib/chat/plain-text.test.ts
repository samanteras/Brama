import { describe, expect, it } from 'vitest'

import { toPlainText } from './plain-text'

describe('toPlainText', () => {
  it('unwraps bold', () => {
    // The reported case, verbatim from the widget.
    expect(toPlainText('Rough work is **from 520 EUR/m²**.')).toBe(
      'Rough work is from 520 EUR/m².',
    )
  })

  it('unwraps underscored bold', () => {
    expect(toPlainText('Rough work is __from 520 EUR__.')).toBe('Rough work is from 520 EUR.')
  })

  it('unwraps italics', () => {
    expect(toPlainText('That is *usually* the case.')).toBe('That is usually the case.')
    expect(toPlainText('That is _usually_ the case.')).toBe('That is usually the case.')
  })

  it('unwraps inline code', () => {
    expect(toPlainText('Ask for `turnkey` pricing.')).toBe('Ask for turnkey pricing.')
  })

  it('keeps a link label and drops its target', () => {
    expect(toPlainText('See [our terms](https://example.com/terms).')).toBe('See our terms.')
  })

  it('strips heading hashes but keeps the words', () => {
    expect(toPlainText('## Payment stages\n30 percent on signing.')).toBe(
      'Payment stages\n30 percent on signing.',
    )
  })

  it('drops code fences', () => {
    expect(toPlainText('Prices:\n```\n520 EUR\n```')).toBe('Prices:\n\n520 EUR\n')
  })

  it('leaves ordinary prose untouched', () => {
    const prose = 'A two-room flat of 54 m² starts at approximately 46,000 EUR for labour.'
    expect(toPlainText(prose)).toBe(prose)
  })

  it('leaves list markers alone', () => {
    // Bullets read fine as text, so removing them would lose structure for
    // nothing. Only the markers that render as punctuation are stripped.
    const list = '- Demolition\n- Waste removal'
    expect(toPlainText(list)).toBe(list)
  })

  it('keeps arithmetic asterisks', () => {
    // A lone asterisk between digits is multiplication, not emphasis, and the
    // paired rules must not eat it.
    expect(toPlainText('Roughly 54 * 860 EUR.')).toBe('Roughly 54 * 860 EUR.')
  })

  it('keeps underscores inside identifiers', () => {
    expect(toPlainText('The field is called price_per_m2.')).toBe(
      'The field is called price_per_m2.',
    )
  })

  describe('while the reply is still streaming', () => {
    it('shows no asterisks for a half-arrived bold run', () => {
      // Runs on every render, so every prefix of a reply passes through it.
      expect(toPlainText('Rough work is **fro')).toBe('Rough work is fro')
    })

    it('shows no asterisks for an unclosed bold run', () => {
      expect(toPlainText('Rough work is **from 520 EUR')).toBe('Rough work is from 520 EUR')
    })

    it('never leaves a marker visible at any prefix of a bold reply', () => {
      const reply = 'Rough work is **from 520 EUR/m²**, materials extra.'

      for (let length = 0; length <= reply.length; length++) {
        expect(toPlainText(reply.slice(0, length))).not.toMatch(/\*\*|__/)
      }
    })
  })

  it('handles an empty string', () => {
    expect(toPlainText('')).toBe('')
  })
})
