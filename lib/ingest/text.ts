/**
 * Text normalization shared by chunking, hashing and scan detection.
 *
 * All three need to agree on what "the same text" means. Keeping the rules in
 * one place is what makes duplicate detection reliable: the same price list
 * uploaded from Windows and from macOS must hash identically.
 */

/**
 * Characters that are invisible or visually identical to a plain space, written
 * as escape codes rather than literals.
 *
 * Using literals here would put characters in the source that a reader cannot
 * see, making the character class impossible to review or safely edit. PDF text
 * extraction produces all of these routinely.
 */
const INVISIBLE_CHARACTERS = new RegExp(
  // The brackets make this a character class. Without them the escapes would
  // concatenate into a four-character sequence and match almost nothing.
  `[${[
    '\\u200B', // zero-width space
    '\\u200C', // zero-width non-joiner
    '\\u200D', // zero-width joiner
    '\\uFEFF', // byte order mark
  ].join('')}]`,
  'g',
)

/** Non-breaking space, which is not interchangeable with a plain space. */
const NON_BREAKING_SPACE = new RegExp('\\u00A0', 'g')

/**
 * Collapses line-ending and whitespace differences that carry no meaning.
 *
 * Deliberately preserves paragraph breaks (a blank line), because chunking uses
 * them as split points — flattening all whitespace would destroy the document
 * structure that makes retrieval accurate.
 */
export function normalizeText(raw: string): string {
  return (
    raw
      // Windows and classic Mac line endings.
      .replace(/\r\n?/g, '\n')
      .replace(NON_BREAKING_SPACE, ' ')
      .replace(INVISIBLE_CHARACTERS, '')
      // Trailing spaces make otherwise identical documents hash differently.
      .replace(/[ \t]+$/gm, '')
      // Three or more newlines carry no more meaning than a paragraph break.
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}

/** Non-whitespace character count, used to tell real text from a scan. */
export function countVisibleCharacters(text: string): number {
  return text.replace(/\s/g, '').length
}

/**
 * Rough token estimate at roughly four characters per token.
 *
 * An estimate is a deliberate choice over an exact tokenizer: a real BPE
 * tokenizer adds a heavy dependency and meaningful startup cost, while
 * everything we use this for — showing document size, budgeting context — is
 * fine with an approximation. It is never used to decide whether a request fits
 * a hard model limit.
 */
export function estimateTokens(text: string): number {
  if (text === '') return 0
  return Math.ceil(text.length / 4)
}
