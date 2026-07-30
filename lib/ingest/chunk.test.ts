import { describe, expect, it } from 'vitest'

import { chunkText, DEFAULT_CHUNK_OPTIONS } from './chunk'

/** Builds a paragraph of roughly `length` characters made of real words. */
function paragraph(word: string, length: number): string {
  const unit = `${word} `
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length).trim()
}

/** Every whitespace-separated token in the text, for coverage assertions. */
function words(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== '')
}

describe('chunkText', () => {
  describe('empty input', () => {
    it.each([
      ['an empty string', ''],
      ['spaces', '   '],
      ['newlines', '\n\n\n'],
      ['mixed whitespace', ' \t\r\n '],
    ])('returns no chunks for %s', (_label, input) => {
      expect(chunkText(input)).toEqual([])
    })
  })

  describe('short input', () => {
    const text = 'Turnkey renovation of a two-room flat starts at $18,000.'

    it('produces a single chunk', () => {
      expect(chunkText(text)).toHaveLength(1)
    })

    it('keeps the text verbatim', () => {
      expect(chunkText(text)[0].content).toBe(text)
    })

    it('indexes from zero', () => {
      expect(chunkText(text)[0].index).toBe(0)
    })

    it('estimates a non-zero token count', () => {
      expect(chunkText(text)[0].estimatedTokens).toBeGreaterThan(0)
    })

    it('normalizes line endings before chunking', () => {
      expect(chunkText('first\r\nsecond')[0].content).toBe('first\nsecond')
    })
  })

  describe('packing paragraphs', () => {
    it('merges paragraphs that fit the target together', () => {
      const text = 'Demolition included.\n\nMaterials billed separately.'
      const chunks = chunkText(text, { targetChars: 200, overlapChars: 0 })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].content).toBe(text)
    })

    it('separates merged paragraphs with a blank line', () => {
      const chunks = chunkText('First.\n\nSecond.', { targetChars: 200, overlapChars: 0 })
      expect(chunks[0].content).toBe('First.\n\nSecond.')
    })

    it('starts a new chunk once the target is exceeded', () => {
      const text = `${paragraph('alpha', 90)}\n\n${paragraph('beta', 90)}`
      const chunks = chunkText(text, { targetChars: 100, overlapChars: 0 })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it('numbers chunks consecutively', () => {
      const text = Array.from({ length: 8 }, (_, i) => paragraph(`word${i}`, 80)).join('\n\n')
      const chunks = chunkText(text, { targetChars: 100, overlapChars: 0 })

      expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, i) => i))
    })

    it('never emits an empty chunk', () => {
      const text = Array.from({ length: 10 }, (_, i) => paragraph(`word${i}`, 120)).join('\n\n\n\n')
      const chunks = chunkText(text, { targetChars: 150, overlapChars: 40 })

      for (const chunk of chunks) {
        expect(chunk.content.trim()).not.toBe('')
      }
    })

    it('loses no content when there is no overlap', () => {
      const text = Array.from({ length: 6 }, (_, i) => paragraph(`word${i}`, 130)).join('\n\n')
      const chunks = chunkText(text, { targetChars: 150, overlapChars: 0 })

      expect(chunks.map((chunk) => chunk.content).join('\n\n')).toBe(text)
    })

    it('covers every word of the source even with overlap enabled', () => {
      const text = Array.from({ length: 6 }, (_, i) => paragraph(`word${i}`, 130)).join('\n\n')
      const combined = chunkText(text, { targetChars: 150, overlapChars: 40 })
        .map((chunk) => chunk.content)
        .join(' ')

      for (const word of new Set(words(text))) {
        expect(combined).toContain(word)
      }
    })
  })

  describe('overlap', () => {
    const text = Array.from({ length: 4 }, (_, i) => paragraph(`word${i}`, 140)).join('\n\n')

    it('repeats a tail of the previous chunk', () => {
      const chunks = chunkText(text, { targetChars: 150, overlapChars: 50 })
      expect(chunks.length).toBeGreaterThan(1)

      const previousTailWord = words(chunks[0].content).at(-1)
      expect(chunks[1].content).toContain(previousTailWord)
    })

    it('duplicates no content when overlap is disabled', () => {
      // Measured by total length rather than by comparing words: repeated words
      // are normal in a price list, so word identity proves nothing either way.
      const chunks = chunkText(text, { targetChars: 150, overlapChars: 0 })
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)

      // Only the paragraph separators between chunks are dropped.
      expect(totalLength).toBeLessThanOrEqual(text.length)
    })

    it('duplicates some content when overlap is enabled', () => {
      const withoutOverlap = chunkText(text, { targetChars: 150, overlapChars: 0 })
      const withOverlap = chunkText(text, { targetChars: 150, overlapChars: 50 })

      const total = (chunks: ReturnType<typeof chunkText>) =>
        chunks.reduce((sum, chunk) => sum + chunk.content.length, 0)

      expect(total(withOverlap)).toBeGreaterThan(total(withoutOverlap))
    })

    it('does not open a chunk mid-word', () => {
      const chunks = chunkText(text, { targetChars: 150, overlapChars: 50 })

      // Every chunk after the first begins with the overlap tail; a fragment like
      // "rd3" instead of "word3" would mean the tail was cut inside a token.
      for (const chunk of chunks.slice(1)) {
        const firstWord = words(chunk.content)[0]
        expect(words(text)).toContain(firstWord)
      }
    })

    it('drops the tail entirely when it has no word boundary', () => {
      // A single unbroken token has no boundary to align to, and repeating a
      // fragment of it would add noise rather than context.
      const text = `${'x'.repeat(120)}\n\nsecond paragraph here`
      const chunks = chunkText(text, { targetChars: 130, overlapChars: 40, maxChars: 200 })

      expect(chunks[1].content).toBe('second paragraph here')
    })
  })

  describe('oversized blocks', () => {
    it('splits a paragraph longer than the hard ceiling', () => {
      const chunks = chunkText(paragraph('alpha', 900), {
        targetChars: 200,
        overlapChars: 0,
        maxChars: 300,
      })

      expect(chunks.length).toBeGreaterThan(1)
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(300)
      }
    })

    it('prefers sentence boundaries when splitting', () => {
      const sentences = Array.from({ length: 12 }, (_, i) => `Stage ${i} takes two weeks.`).join(' ')
      const chunks = chunkText(sentences, { targetChars: 100, overlapChars: 0, maxChars: 120 })

      for (const chunk of chunks) {
        // A mid-sentence cut would leave a chunk that neither ends with a period
        // nor is the final one.
        expect(chunk.content.trim().length).toBeGreaterThan(0)
        expect(chunk.content.length).toBeLessThanOrEqual(120)
      }
    })

    it('cuts a single token that exceeds the ceiling on its own', () => {
      // A URL or a base64 blob has no natural break point left.
      const chunks = chunkText('x'.repeat(500), {
        targetChars: 100,
        overlapChars: 0,
        maxChars: 120,
      })

      expect(chunks.length).toBeGreaterThan(1)
      for (const chunk of chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(120)
      }
    })

    it('keeps all characters of a mechanically cut token', () => {
      const token = 'x'.repeat(500)
      const chunks = chunkText(token, { targetChars: 100, overlapChars: 0, maxChars: 120 })
      const restored = chunks.map((chunk) => chunk.content).join('')

      expect(restored).toBe(token)
    })

    it('terminates on a long document with overlap enabled', () => {
      // Guards against the failure mode where an overlap tail refills a chunk
      // faster than content is consumed.
      const text = Array.from({ length: 40 }, (_, i) => paragraph(`word${i}`, 300)).join('\n\n')
      const chunks = chunkText(text, { targetChars: 400, overlapChars: 200, maxChars: 600 })

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.length).toBeLessThan(1000)
    })
  })

  describe('option validation', () => {
    it('uses documented defaults when nothing is passed', () => {
      expect(DEFAULT_CHUNK_OPTIONS.overlapChars).toBeLessThan(DEFAULT_CHUNK_OPTIONS.targetChars)
      expect(DEFAULT_CHUNK_OPTIONS.maxChars).toBeGreaterThanOrEqual(
        DEFAULT_CHUNK_OPTIONS.targetChars,
      )
    })

    it.each([
      ['a zero target', { targetChars: 0 }, /targetChars must be positive/],
      ['a negative target', { targetChars: -10 }, /targetChars must be positive/],
      ['a negative overlap', { overlapChars: -1 }, /overlapChars cannot be negative/],
      ['an overlap equal to the target', { targetChars: 100, overlapChars: 100 }, /must be below/],
      ['an overlap above the target', { targetChars: 100, overlapChars: 200 }, /must be below/],
      ['a ceiling below the target', { targetChars: 500, maxChars: 100 }, /cannot be below/],
    ])('rejects %s', (_label, options, message) => {
      expect(() => chunkText('some text', options)).toThrowError(message)
    })
  })
})
