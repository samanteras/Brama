import 'server-only'

import { embedQuery } from '@/lib/ai/embeddings'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Finds the passages a question should be answered from.
 *
 * Runs under the service role because `match_chunks` is not callable by the
 * anon or authenticated roles — widget visitors have no account, so the
 * authorization decision belongs to the route that already established which
 * bot the caller may reach.
 */

export type RetrievedChunk = {
  id: string
  documentId: string
  content: string
  similarity: number
}

/**
 * How many passages go into the prompt.
 *
 * Eight rather than a dozen on purpose: every passage is billed on every
 * answer, and the difference between top-6 and top-12 is the difference between
 * a plan that makes money and one that does not. A renovation price list is
 * short, structured text, so the answer is rarely hiding in the ninth-best
 * match.
 */
export const DEFAULT_MATCH_COUNT = 8

/**
 * Floor below which a passage is discarded as noise.
 *
 * Set low on purpose, and the number comes from measurement rather than
 * intuition. On a real price list the scores were:
 *
 *   direct question          0.56
 *   paraphrased question     0.22   <- on topic, answer present
 *   question with no answer  0.31   <- off topic
 *   unrelated question       0.05
 *
 * A paraphrased question the documents *do* answer scores lower than one they
 * do not. So similarity cannot decide relevance here, and a threshold tuned to
 * exclude the second case silently removes the first — which is how a bot ends
 * up saying "I don't have that information" about a section it holds.
 *
 * Judging relevance is the model's job, and it does it well: given the price
 * list and asked about swimming pools, it declines rather than improvising.
 * This floor only exists to drop the genuinely unrelated, where the gap is an
 * order of magnitude rather than a hair.
 */
export const MIN_SIMILARITY = 0.1

export type RetrieveOptions = {
  matchCount?: number
  minSimilarity?: number
}

export async function retrieve(
  botId: string,
  question: string,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT
  const minSimilarity = options.minSimilarity ?? MIN_SIMILARITY

  const embedding = await embedQuery(question)

  const { data, error } = await createAdminClient().rpc('match_chunks', {
    p_bot_id: botId,
    p_embedding: JSON.stringify(embedding),
    p_match_count: matchCount,
  })

  if (error) throw new Error(`Retrieval failed: ${error.message}`)

  const candidates: RetrievedChunk[] = (data ?? []).map((row) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    similarity: row.similarity,
  }))

  return rerank(question, candidates).filter((chunk) => chunk.similarity >= minSimilarity)
}

/**
 * Reordering seam.
 *
 * Identity for now. Reranking is a real improvement once a knowledge base grows
 * past a few hundred passages, but at the size of a renovation company's price
 * list it has little to work with, and it costs latency plus another external
 * dependency that could fail mid-answer. The decision to switch it on belongs
 * to the eval run, not to a hunch — so the seam exists and the implementation
 * does not.
 *
 * When it does arrive: a failure here must return the input order rather than
 * throw. A reranker being down is not a reason for the bot to stop answering.
 */
function rerank(_question: string, candidates: RetrievedChunk[]): RetrievedChunk[] {
  return candidates
}
