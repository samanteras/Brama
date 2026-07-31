/**
 * Splits a document into overlapping chunks for embedding.
 *
 * The strategy is deliberately structural rather than clever: split on
 * paragraph boundaries, pack paragraphs up to a target size, and carry a small
 * tail of the previous chunk into the next one. A renovation company's price
 * list is a list of short blocks, and keeping those blocks intact is what makes
 * "what does the estimate include" retrievable as one coherent answer.
 *
 * The overlap exists because a fact that straddles a boundary — a heading in one
 * chunk and its number in the next — would otherwise be unanswerable.
 */

import { estimateTokens, normalizeText } from './text'

export type Chunk = {
  /** Zero-based position in the document, used for stable ordering. */
  index: number
  content: string
  estimatedTokens: number
}

export type ChunkOptions = {
  /** Size a chunk is packed towards before a new one is started. */
  targetChars?: number
  /** How much of the previous chunk's tail is repeated at the start of the next. */
  overlapChars?: number
  /** Hard ceiling for a single chunk, enforced by splitting oversized blocks. */
  maxChars?: number
}

/**
 * Sized for the documents this product actually ingests.
 *
 * A renovation price list is a sequence of short, distinct sections — pricing,
 * materials, warranty, payment stages. At 1200 characters a whole such document
 * collapsed into a single chunk, and a question about the warranty was then
 * compared against the entire document rather than against the warranty
 * section. Measured similarity for that question dropped to 0.22, below
 * questions the document could not answer at all.
 *
 * Smaller chunks keep sections separate, which is what makes the similarity
 * score mean something. Going much smaller would start splitting a price away
 * from the condition attached to it.
 */
export const DEFAULT_CHUNK_OPTIONS = {
  targetChars: 700,
  overlapChars: 120,
  maxChars: 1400,
} as const

/** Sentence-ish boundary: punctuation followed by whitespace. */
const SENTENCE_BOUNDARY = /(?<=[.!?…:;])\s+/

const PARAGRAPH_BOUNDARY = /\n{2,}/

export function chunkText(raw: string, options: ChunkOptions = {}): Chunk[] {
  const { targetChars, overlapChars, maxChars } = resolveOptions(options)

  const text = normalizeText(raw)
  if (text === '') return []

  const blocks = text
    .split(PARAGRAPH_BOUNDARY)
    .map((block) => block.trim())
    .filter((block) => block !== '')
    .flatMap((block) => (block.length > maxChars ? splitOversizedBlock(block, maxChars) : [block]))

  const contents: string[] = []
  let current = ''

  for (const block of blocks) {
    if (current === '') {
      current = block
      continue
    }

    const merged = `${current}\n\n${block}`

    if (merged.length <= targetChars) {
      current = merged
      continue
    }

    contents.push(current)
    const overlap = takeOverlap(current, overlapChars)
    // The overlap is capped below targetChars, so a fresh chunk always has room
    // for at least part of the next block and the loop cannot stall.
    current = overlap === '' ? block : `${overlap}\n\n${block}`
  }

  if (current !== '') contents.push(current)

  return contents.map((content, index) => ({
    index,
    content,
    estimatedTokens: estimateTokens(content),
  }))
}

function resolveOptions(options: ChunkOptions) {
  const targetChars = options.targetChars ?? DEFAULT_CHUNK_OPTIONS.targetChars
  const overlapChars = options.overlapChars ?? DEFAULT_CHUNK_OPTIONS.overlapChars
  const maxChars = options.maxChars ?? DEFAULT_CHUNK_OPTIONS.maxChars

  // These are programmer errors, not user input, so they fail loudly. An overlap
  // at or above the target size in particular would mean every chunk starts
  // already full — the classic way this kind of loop fails to terminate.
  if (targetChars <= 0) {
    throw new Error(`targetChars must be positive, got ${targetChars}.`)
  }
  if (overlapChars < 0) {
    throw new Error(`overlapChars cannot be negative, got ${overlapChars}.`)
  }
  if (overlapChars >= targetChars) {
    throw new Error(`overlapChars (${overlapChars}) must be below targetChars (${targetChars}).`)
  }
  if (maxChars < targetChars) {
    throw new Error(`maxChars (${maxChars}) cannot be below targetChars (${targetChars}).`)
  }

  return { targetChars, overlapChars, maxChars }
}

/**
 * Breaks a block that exceeds the hard ceiling into pieces.
 *
 * Tries progressively coarser fallbacks — sentences, then words, then a blunt
 * cut — so a wall of text with no punctuation still gets indexed instead of
 * being dropped or blowing past the limit.
 */
function splitOversizedBlock(block: string, maxChars: number): string[] {
  const pieces: string[] = []
  let current = ''

  for (const sentence of block.split(SENTENCE_BOUNDARY)) {
    const units = sentence.length > maxChars ? splitByWords(sentence, maxChars) : [sentence]

    for (const unit of units) {
      if (current === '') {
        current = unit
        continue
      }

      const merged = `${current} ${unit}`
      if (merged.length <= maxChars) {
        current = merged
      } else {
        pieces.push(current)
        current = unit
      }
    }
  }

  if (current !== '') pieces.push(current)

  return pieces
}

function splitByWords(sentence: string, maxChars: number): string[] {
  const pieces: string[] = []
  let current = ''

  for (const word of sentence.split(/\s+/).filter((word) => word !== '')) {
    // A single "word" longer than the ceiling (a URL, a base64 blob) has no
    // natural break point left, so cut it mechanically.
    if (word.length > maxChars) {
      if (current !== '') {
        pieces.push(current)
        current = ''
      }
      for (let offset = 0; offset < word.length; offset += maxChars) {
        pieces.push(word.slice(offset, offset + maxChars))
      }
      continue
    }

    if (current === '') {
      current = word
      continue
    }

    const merged = `${current} ${word}`
    if (merged.length <= maxChars) {
      current = merged
    } else {
      pieces.push(current)
      current = word
    }
  }

  if (current !== '') pieces.push(current)

  return pieces
}

/**
 * Takes the tail of a chunk to repeat at the start of the next one, starting at
 * a word boundary so the overlap never opens mid-word.
 */
function takeOverlap(chunk: string, overlapChars: number): string {
  if (overlapChars === 0 || chunk.length <= overlapChars) {
    return overlapChars === 0 ? '' : chunk.trim()
  }

  const tail = chunk.slice(chunk.length - overlapChars)
  const firstSpace = tail.search(/\s/)

  // If the whole tail is one unbroken token there is no boundary to align to,
  // and repeating a fragment of it would add noise rather than context.
  if (firstSpace === -1) return ''

  return tail.slice(firstSpace + 1).trim()
}
