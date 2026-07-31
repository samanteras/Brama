import 'server-only'

import OpenAI from 'openai'

import { serverEnv } from '@/lib/env.server'

/**
 * Embedding generation.
 *
 * The dimension here is not a free choice: it must match `vector(1536)` in the
 * chunks table. Changing the model to one with a different width means a
 * migration and a full re-index of every customer's documents, so the constant
 * is exported and asserted rather than left implicit at the call site.
 */
export const EMBEDDING_MODEL = 'text-embedding-3-small'

export const EMBEDDING_DIMENSIONS = 1536

/**
 * How many chunks go into one API call.
 *
 * The whole point of batching: a 150-page PDF is roughly 400 chunks, which as
 * individual calls means 400 round trips and minutes of waiting. At this size
 * it is four calls. Kept well below the API's ceiling so a batch of unusually
 * long chunks cannot exceed the per-request token limit.
 */
export const EMBEDDING_BATCH_SIZE = 96

let client: OpenAI | null = null

function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY })
  return client
}

/**
 * Embeds a batch of texts, preserving order.
 *
 * Order matters because callers zip the results back onto their chunk rows. The
 * API documents that it returns results in input order, and the index check
 * below makes that an assertion rather than an assumption — a silent
 * misalignment would attach every chunk's embedding to the wrong text, which no
 * later test would catch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  if (texts.length > EMBEDDING_BATCH_SIZE) {
    throw new Error(
      `embedBatch received ${texts.length} texts, above the batch size of ${EMBEDDING_BATCH_SIZE}.`,
    )
  }

  const response = await openai().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })

  if (response.data.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, received ${response.data.length}.`,
    )
  }

  const ordered = [...response.data].sort((a, b) => a.index - b.index)

  return ordered.map((item, position) => {
    if (item.index !== position) {
      throw new Error(`Embedding results are not aligned with the input at position ${position}.`)
    }

    if (item.embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Model ${EMBEDDING_MODEL} returned ${item.embedding.length} dimensions, but the database column expects ${EMBEDDING_DIMENSIONS}.`,
      )
    }

    return item.embedding
  })
}

/** Embeds a single query. Used by retrieval, where there is one input. */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text])
  return embedding
}
