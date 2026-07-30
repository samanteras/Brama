/**
 * Content fingerprinting for duplicate detection.
 *
 * Without this, a customer who uploads the same price list twice gets every fact
 * indexed twice, and the bot starts citing the same paragraph two ways. Hashing
 * the *normalized* text is what makes the check reliable: the same document
 * exported on Windows and on macOS differs only in line endings, which must not
 * read as two different documents.
 */

import { createHash } from 'node:crypto'

import { normalizeText } from './text'

/**
 * SHA-256 of the normalized text, as lowercase hex.
 *
 * SHA-256 rather than a fast non-cryptographic hash because a collision here
 * would silently reject a legitimate document as a duplicate, and the cost is
 * irrelevant next to the embedding calls that follow.
 */
export function contentHash(raw: string): string {
  return createHash('sha256').update(normalizeText(raw), 'utf8').digest('hex')
}
