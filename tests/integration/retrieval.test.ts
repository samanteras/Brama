import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adminClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'
import { embedBatch, embedQuery, EMBEDDING_DIMENSIONS } from '@/lib/ai/embeddings'
import { chunkText } from '@/lib/ingest/chunk'

/**
 * End-to-end retrieval, against the real embedding API and the real database.
 *
 * This is the only test that proves the product's core actually works: that
 * text put in comes back out for a question phrased differently. Everything
 * else — parsing, chunking, the vector column, match_chunks — can pass its own
 * tests while the pipeline as a whole returns nothing useful.
 *
 * Runs outside CI because it makes live model calls.
 */

/**
 * A realistic price list, long enough to chunk into several passages.
 *
 * Size matters here: retrieval across a single chunk proves nothing, because
 * the only candidate is always returned. The questions below have to pick the
 * right passage out of a handful of plausible ones.
 */
const PRICE_LIST = `
Turnkey renovation pricing

Rough work starts at 520 EUR per square metre. This covers demolition, waste
removal, electrical rewiring, plumbing rough-in, screed and wall levelling. For
flats above the fourth floor without a service lift we add 15 EUR per square
metre to cover haulage.

Finishing work starts at 340 EUR per square metre and covers plastering,
painting, flooring, tiling, and fitting doors and skirting. Decorative
plasterwork, wall panelling and bespoke joinery are quoted separately after the
site survey.

Materials

Materials are billed separately at cost. We provide a purchase list before work
begins and you buy directly from the supplier, so there is no markup from us.
If you would rather not deal with the ordering, we can manage procurement for a
10 percent handling fee.

What is not included

The price does not include furniture, appliances, curtains or lighting fixtures.
Removal of load-bearing walls requires a structural survey and council approval,
which we can arrange but which is charged separately.

Timelines

A two room flat of around 54 square metres takes eight to ten weeks from the
start of demolition to handover. Delays caused by late material deliveries are
outside our control, though we will always tell you as soon as we know.

Warranty

All structural and installation work carries a two year warranty. Decorative
finishes carry a one year warranty. The warranty covers workmanship, not damage
caused by use or by third parties working on the property afterwards.

Payment

Work is paid in three stages: 30 percent on signing, 40 percent at the halfway
inspection, and the remaining 30 percent on handover. We do not ask for the
final payment until you have walked the site with the site manager and signed off.

Pets and occupied flats

We can work in an occupied flat, though it slows the schedule by roughly two
weeks and dust control becomes the main constraint. Pets must be kept out of
work areas during demolition and screed pouring.
`

describe('retrieval', () => {
  let owner: TestUser
  let botId: string

  beforeAll(async () => {
    owner = await createTestUser('retrieval')
    const admin = adminClient()

    const { data: bot, error: botError } = await admin
      .from('bots')
      .insert({ owner_id: owner.id, name: 'Skyline Renovations' })
      .select('id')
      .single()
    if (botError) throw new Error(botError.message)
    botId = bot.id

    const { data: document, error: documentError } = await admin
      .from('documents')
      .insert({
        bot_id: botId,
        filename: 'price-list.txt',
        source_type: 'text',
        content_hash: `retrieval-${Date.now()}`,
        // Deliberately left unpublished until the embeddings are in, mirroring
        // what the ingest route does.
        status: 'processing',
      })
      .select('id')
      .single()
    if (documentError) throw new Error(documentError.message)

    const chunks = chunkText(PRICE_LIST)
    expect(chunks.length).toBeGreaterThan(1)

    const embeddings = await embedBatch(chunks.map((chunk) => chunk.content))

    for (const [index, chunk] of chunks.entries()) {
      const { error } = await admin.from('chunks').insert({
        document_id: document.id,
        bot_id: botId,
        chunk_index: chunk.index,
        content: chunk.content,
        token_count: chunk.estimatedTokens,
        embedding: JSON.stringify(embeddings[index]),
      })
      if (error) throw new Error(error.message)
    }

    // Left in `processing` for the visibility test below, then published.
    const { data: hidden } = await admin.rpc('match_chunks', {
      p_bot_id: botId,
      p_embedding: JSON.stringify(await embedQuery('how much does rough work cost')),
      p_match_count: 5,
    })
    expect(hidden).toEqual([])

    const { error: publishError } = await admin
      .from('documents')
      .update({ status: 'ready', indexed_chunks: chunks.length, total_chunks: chunks.length })
      .eq('id', document.id)
    if (publishError) throw new Error(publishError.message)
  })

  afterAll(async () => {
    await deleteTestUsers([owner])
  })

  async function search(question: string, matchCount = 3) {
    const { data, error } = await adminClient().rpc('match_chunks', {
      p_bot_id: botId,
      p_embedding: JSON.stringify(await embedQuery(question)),
      p_match_count: matchCount,
    })

    if (error) throw new Error(error.message)
    return data
  }

  it('produces embeddings of the width the column expects', async () => {
    const [embedding] = await embedBatch(['renovation'])
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS)
  })

  it('preserves input order across a batch', async () => {
    // Callers zip results back onto chunk rows; a reordering here would attach
    // every embedding to the wrong text.
    const [first, second] = await embedBatch(['demolition and waste removal', 'payment stages'])

    const demolitionQuery = await embedQuery('who takes the rubble away')
    expect(cosine(first, demolitionQuery)).toBeGreaterThan(cosine(second, demolitionQuery))
  })

  it.each([
    ['a question about price', 'how much does the rough work cost per square metre', '520'],
    ['a question about materials', 'do I have to buy the materials myself', 'Materials'],
    ['a question about guarantees', 'what happens if something breaks afterwards', 'warranty'],
    ['a question about paying', 'when do I have to pay you', 'percent'],
  ])('answers %s from the right passage', async (_label, question, expected) => {
    const matches = await search(question)

    expect(matches.length).toBeGreaterThan(0)
    // The relevant passage must be retrieved, not merely present somewhere.
    expect(matches.some((match) => match.content.includes(expected))).toBe(true)
  })

  it('ranks the best passage first for a direct question', async () => {
    const matches = await search('what is the warranty period')
    expect(matches[0].content.toLowerCase()).toContain('warranty')
  })

  it('returns similarity scores that decrease down the list', async () => {
    const matches = await search('renovation cost', 4)
    const scores = matches.map((match) => match.similarity)

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
    }
  })

  it('respects the requested number of matches', async () => {
    const matches = await search('renovation', 2)
    expect(matches.length).toBeLessThanOrEqual(2)
  })

  it('finds nothing for a different bot', async () => {
    const { data } = await adminClient().rpc('match_chunks', {
      p_bot_id: '00000000-0000-0000-0000-000000000000',
      p_embedding: JSON.stringify(await embedQuery('renovation cost')),
      p_match_count: 5,
    })

    expect(data).toEqual([])
  })
})

/** Cosine similarity, for assertions about relative closeness. */
function cosine(a: number[], b: number[]): number {
  let dot = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
}
