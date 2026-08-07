/**
 * Runs the evaluation set against the real model and prints a table.
 *
 * Run with: npm run eval
 *
 * Deliberately not part of the test suite. It makes live model calls, costs a
 * few cents, and its output is a set of numbers to read and argue about rather
 * than a pass/fail gate. Tests answer "did I break it"; this answers "is it
 * good enough, and did that change help".
 */

import { writeFileSync } from 'node:fs'

import { EVAL_QUESTIONS, type EvalCategory, type EvalQuestion } from './questions'
import { embedBatch } from '@/lib/ai/embeddings'
import { APP_NAME } from '@/lib/brand'
import { runChat } from '@/lib/chat/run'
import { retrieve } from '@/lib/chat/retrieve'
import { chunkText } from '@/lib/ingest/chunk'
import { createAdminClient } from '@/lib/supabase/admin'

type Result = {
  question: EvalQuestion
  retrievalHit: boolean | null
  answerHit: boolean | null
  leadCorrect: boolean
  answeredCorrect: boolean
  answer: string
  /** Which path opened the form, when one did. */
  leadSource: 'model' | 'net' | null
}

const BOT_NAME = 'Skyline Renovations'

/**
 * How many times each question is asked.
 *
 * One sample per question was not a measurement. Two runs over identical code
 * returned 91% and 85% with almost disjoint failure sets, which is enough
 * movement to credit a prompt change that did nothing or condemn one that
 * helped. Setting temperature to zero did not settle it either.
 *
 * Three is not a confidence interval, but it separates "fails every time" from
 * "failed once", and that is the distinction worth acting on.
 */
export const SAMPLES_PER_QUESTION = 3

export async function runEval(knowledgeBase: string, ownerId: string) {
  const admin = createAdminClient()

  const { data: bot, error: botError } = await admin
    .from('bots')
    .insert({ owner_id: ownerId, name: BOT_NAME })
    .select('id')
    .single()
  if (botError) throw new Error(botError.message)

  const { data: document, error: documentError } = await admin
    .from('documents')
    .insert({
      bot_id: bot.id,
      filename: 'eval-knowledge-base.md',
      source_type: 'markdown',
      content_hash: `eval-${Date.now()}`,
      status: 'ready',
    })
    .select('id')
    .single()
  if (documentError) throw new Error(documentError.message)

  const chunks = chunkText(knowledgeBase)

  // Embedded in batches exactly as the ingest route does, so the eval measures
  // the pipeline rather than an idealised version of it.
  for (let offset = 0; offset < chunks.length; offset += 96) {
    const slice = chunks.slice(offset, offset + 96)
    const embeddings = await embedBatch(slice.map((chunk) => chunk.content))

    for (const [index, chunk] of slice.entries()) {
      await admin.from('chunks').insert({
        document_id: document.id,
        bot_id: bot.id,
        chunk_index: chunk.index,
        content: chunk.content,
        token_count: chunk.estimatedTokens,
        embedding: JSON.stringify(embeddings[index]),
      })
    }
  }

  const results: Result[] = []

  for (const question of EVAL_QUESTIONS) {
    const retrieved = await retrieve(bot.id, question.question)
    const context = retrieved.map((chunk) => chunk.content).join('\n')

    const retrievalHit = question.expectedInContext
      ? question.expectedInContext.every((needle) => context.includes(needle))
      : null

    // Retrieval is deterministic given the same question and the same chunks,
    // so it is measured once and the samples only re-ask the model.
    const samples = await Promise.all(
      Array.from({ length: SAMPLES_PER_QUESTION }, () => askOnce(bot.id, question)),
    )

    for (const sample of samples) {
      results.push({ question, retrievalHit, ...sample })
    }
  }

  // Clean up so repeated runs do not accumulate bots.
  await admin.from('bots').delete().eq('id', bot.id)

  return results
}

/** Asks one question once and grades the reply. */
async function askOnce(
  botId: string,
  question: EvalQuestion,
): Promise<Omit<Result, 'question' | 'retrievalHit'>> {
  let answer = ''
  let collectedLead = false
  let answered = true
  let leadSource: 'model' | 'net' | null = null

  for await (const event of runChat({
    botId,
    botName: BOT_NAME,
    question: question.question,
    history: question.priorTurns,
  })) {
    if (event.type === 'token') answer += event.value
    if (event.type === 'lead-request') {
      collectedLead = true
      leadSource = event.source
    }
    if (event.type === 'done') answered = event.answered
  }

  const expectedPresent = question.expectedInAnswer?.every((needle) => answer.includes(needle))
  const forbiddenAbsent = question.forbiddenInAnswer?.every((needle) => !answer.includes(needle))

  const answerHit =
    expectedPresent === undefined && forbiddenAbsent === undefined
      ? null
      : (expectedPresent ?? true) && (forbiddenAbsent ?? true)

  return {
    answerHit,
    leadSource,
    leadCorrect: collectedLead === question.expectLead,
    answeredCorrect: answered === question.expectAnswered,
    answer: answer.replace(/\s+/g, ' ').trim(),
  }
}

export function formatReport(results: Result[]): string {
  const lines: string[] = []

  const rate = (hits: number, total: number) =>
    total === 0 ? '   n/a' : `${((hits / total) * 100).toFixed(0).padStart(4)}%`

  const categories: EvalCategory[] = [
    'answerable',
    'multi-section',
    'absent',
    'trap',
    'injection',
    'intent-to-book',
    'small-talk',
  ]

  const questionCount = new Set(results.map((row) => row.question.id)).size

  lines.push(`${APP_NAME} retrieval and behaviour evaluation`)
  lines.push('')
  lines.push(
    `${questionCount} questions, each asked ${SAMPLES_PER_QUESTION} times. Rates are over all ${results.length} samples.`,
  )
  lines.push('')
  lines.push(
    `${'category'.padEnd(16)} ${'n'.padStart(3)}  ${'retrieval'.padStart(9)}  ${'answer'.padStart(7)}  ${'lead'.padStart(6)}  ${'answered'.padStart(8)}`,
  )
  lines.push('-'.repeat(64))

  for (const category of categories) {
    const rows = results.filter((result) => result.question.category === category)
    if (rows.length === 0) continue

    const retrievalRows = rows.filter((row) => row.retrievalHit !== null)
    const answerRows = rows.filter((row) => row.answerHit !== null)

    lines.push(
      [
        category.padEnd(16),
        String(new Set(rows.map((row) => row.question.id)).size).padStart(3),
        rate(retrievalRows.filter((row) => row.retrievalHit).length, retrievalRows.length).padStart(11),
        rate(answerRows.filter((row) => row.answerHit).length, answerRows.length).padStart(9),
        rate(rows.filter((row) => row.leadCorrect).length, rows.length).padStart(8),
        rate(rows.filter((row) => row.answeredCorrect).length, rows.length).padStart(10),
      ].join(''),
    )
  }

  lines.push('-'.repeat(64))

  const retrievalRows = results.filter((row) => row.retrievalHit !== null)
  const answerRows = results.filter((row) => row.answerHit !== null)

  lines.push(
    [
      'overall'.padEnd(16),
      String(questionCount).padStart(3),
      rate(retrievalRows.filter((row) => row.retrievalHit).length, retrievalRows.length).padStart(11),
      rate(answerRows.filter((row) => row.answerHit).length, answerRows.length).padStart(9),
      rate(results.filter((row) => row.leadCorrect).length, results.length).padStart(8),
      rate(results.filter((row) => row.answeredCorrect).length, results.length).padStart(10),
    ].join(''),
  )

  const failures = results.filter(
    (row) =>
      row.retrievalHit === false ||
      row.answerHit === false ||
      !row.leadCorrect ||
      !row.answeredCorrect,
  )

  if (failures.length > 0) {
    lines.push('')
    lines.push('Failures')
    lines.push('-'.repeat(64))

    // Grouped by question: printing one flaky question three times reads like
    // three separate problems, and the count is the useful part. Failing three
    // times out of three is a bug; failing once is a coin that landed badly.
    const byQuestion = new Map<string, Result[]>()

    for (const failure of failures) {
      const existing = byQuestion.get(failure.question.id)
      if (existing) existing.push(failure)
      else byQuestion.set(failure.question.id, [failure])
    }

    for (const [id, rows] of byQuestion) {
      const question = rows[0].question
      const total = results.filter((row) => row.question.id === id).length

      const reasons = [
        rows.some((row) => row.retrievalHit === false) ? 'retrieval' : null,
        rows.some((row) => row.answerHit === false) ? 'answer' : null,
        rows.some((row) => !row.leadCorrect) ? `lead (expected ${question.expectLead})` : null,
        rows.some((row) => !row.answeredCorrect)
          ? `answered (expected ${question.expectAnswered})`
          : null,
      ].filter(Boolean)

      lines.push('')
      const sources = [...new Set(rows.map((row) => row.leadSource).filter(Boolean))]

      lines.push(
        `${id}  ${rows.length}/${total} samples  [${reasons.join(', ')}]${sources.length > 0 ? `  form opened by: ${sources.join('/')}` : ''}`,
      )
      lines.push(`  Q: ${question.question}`)
      lines.push(`  A: ${rows[0].answer.slice(0, 220)}`)
    }
  }

  return lines.join('\n')
}

export function writeReport(results: Result[], path = 'eval-report.txt') {
  const report = formatReport(results)
  writeFileSync(path, report, 'utf8')
  return report
}
