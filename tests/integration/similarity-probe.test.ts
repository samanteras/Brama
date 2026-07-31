import { writeFileSync } from 'node:fs'

import { afterAll, beforeAll, describe, it } from 'vitest'

import { adminClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'
import { embedBatch, embedQuery } from '@/lib/ai/embeddings'
import { chunkText } from '@/lib/ingest/chunk'

/**
 * Diagnostic: prints the similarity scores real questions produce.
 *
 * Exists so the retrieval threshold is chosen from measurements rather than
 * from a guess. Not an assertion of behaviour — it reports.
 */

const PRICE_LIST = `
Turnkey renovation pricing

Rough work starts at 520 EUR per square metre. This covers demolition, waste
removal, electrical rewiring, plumbing rough-in, screed and wall levelling.

Finishing work starts at 340 EUR per square metre and covers plastering,
painting, flooring, tiling, and fitting doors and skirting.

Materials

Materials are billed separately at cost. We provide a purchase list before work
begins and you buy directly from the supplier, so there is no markup from us.

Warranty

All structural and installation work carries a two year warranty. Decorative
finishes carry a one year warranty.

Payment

Work is paid in three stages: 30 percent on signing, 40 percent at the halfway
inspection, and the remaining 30 percent on handover.

Pets and occupied flats

We can work in an occupied flat, though it slows the schedule by roughly two
weeks. Pets must be kept out of work areas during demolition.
`

const QUESTIONS = [
  ['on-topic, direct', 'How much does rough work cost per square metre?'],
  ['on-topic, paraphrased', 'What happens if something breaks a year after you finish?'],
  ['on-topic, indirect', 'Who buys the materials?'],
  ['on-topic, colloquial', 'Can you work while we still live in the flat?'],
  ['absent from documents', 'Could you start the work before September?'],
  ['absent, different trade', 'How much do you charge to install a swimming pool?'],
  ['entirely unrelated', 'What is the capital of France?'],
]

describe('similarity probe', () => {
  let owner: TestUser
  let botId: string

  beforeAll(async () => {
    owner = await createTestUser('probe')
    const admin = adminClient()

    const { data: bot } = await admin
      .from('bots')
      .insert({ owner_id: owner.id, name: 'Skyline Renovations' })
      .select('id')
      .single()
    botId = bot!.id

    const { data: document } = await admin
      .from('documents')
      .insert({
        bot_id: botId,
        filename: 'price-list.txt',
        source_type: 'text',
        content_hash: `probe-${Date.now()}`,
        status: 'ready',
      })
      .select('id')
      .single()

    const chunks = chunkText(PRICE_LIST)
    const embeddings = await embedBatch(chunks.map((chunk) => chunk.content))

    for (const [index, chunk] of chunks.entries()) {
      await admin.from('chunks').insert({
        document_id: document!.id,
        bot_id: botId,
        chunk_index: chunk.index,
        content: chunk.content,
        token_count: chunk.estimatedTokens,
        embedding: JSON.stringify(embeddings[index]),
      })
    }
  })

  afterAll(async () => {
    await deleteTestUsers([owner])
  })

  it('reports top similarity per question', async () => {
    const rows: string[] = []

    for (const [label, question] of QUESTIONS) {
      const { data } = await adminClient().rpc('match_chunks', {
        p_bot_id: botId,
        p_embedding: JSON.stringify(await embedQuery(question)),
        p_match_count: 3,
      })

      const scores = (data ?? []).map((row) => row.similarity.toFixed(3)).join('  ')
      const best = (data ?? [])[0]
      const snippet = best ? best.content.replace(/\s+/g, ' ').slice(0, 55) : '(none)'

      rows.push(`${label.padEnd(24)} ${scores.padEnd(22)} ${snippet}`)
    }

    const report = [
      `${'question type'.padEnd(24)} ${'top-3 similarity'.padEnd(22)} best match`,
      '-'.repeat(100),
      ...rows,
    ].join('\n')

    writeFileSync('similarity-probe.txt', report, 'utf8')
  })
})
