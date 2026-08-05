import { expect, it } from 'vitest'

import { repliesWithoutAnswering } from '@/lib/chat/refusal'

/**
 * Grades the refusal net on replies the bot has actually produced.
 *
 * Lives with the eval rather than the unit tests because it calls the model.
 * The two directions matter differently: a miss costs a lead, and a false
 * positive puts a contact form under a perfectly good answer, which is the
 * annoyance that started all of this. Both are listed, both are asserted.
 */

const DECLINED = [
  'The documents do not mention any discount for paying everything up front.',
  'I don’t see any information about discounts for paying up front in the documents.',
  'The documents only say Skyline Renovations carries out turnkey renovation of flats and houses. They do not mention offices or shops.',
  'The documents say work is paid in three stages: 30% on signing the contract, 40% at the halfway inspection, and 30% on handover. They do not mention monthly installments.',
  'I can’t give an exact finish date from that alone, because the documents only state the duration, not a start date.',
  'I don’t have that information in the documents.',
  // Refusal first, related fact second. Missed by the first version of the
  // instruction, which read the closing sentence and called it an answer.
  'The documents do not mention monthly installments. Work is paid in three stages: 30 percent on signing the contract, 40 percent at the halfway inspection, and 30 percent on handover.',
  'There is nothing in the documents about renovating offices or shops. We carry out turnkey renovation of flats and houses.',
  'Мы этого в документах не указываем, я не могу подтвердить.',
]

const ANSWERED = [
  'Rough work costs from 520 EUR/m². It includes demolition, waste removal, electrical rewiring, plumbing rough-in, screed, wall levelling and plastering to a paint-ready finish.',
  'No. The price does not include furniture, appliances, curtains or light fittings.',
  'The warranty covers workmanship. It does not cover damage caused by use, by flooding from neighbours, or by other trades working after us.',
  'A two-room flat of around 54 m² takes eight to ten weeks from the start of demolition to handover.',
  'Materials are bought at cost, with no markup.',
  'Yes, we can work while you are living in the flat, though it takes longer.',
  'Hi! Ask me anything about prices, timelines or what a renovation includes.',
  'Черновые работы — от 520 EUR за м².',
  // Refusing to obey, not admitting a gap. Caught the net out: someone trying
  // to rewrite the price list was handed a contact form and filed as a lead.
  'I can’t do that. I can only use the company’s reference passages, and they say rough work is from 520 EUR/m² and finishing work is from 340 EUR/m².',
  'I can’t take on another role. I answer questions about Skyline Renovations from their own documents.',
]

it('spots a reply that declined to answer', async () => {
  const verdicts = await Promise.all(DECLINED.map(repliesWithoutAnswering))
  const missed = DECLINED.filter((_reply, index) => !verdicts[index])

  process.stdout.write(`\nmissed refusals: ${missed.length}/${DECLINED.length}\n`)
  for (const reply of missed) process.stdout.write(`  ${reply.slice(0, 90)}\n`)

  expect(missed).toEqual([])
}, 120_000)

it('leaves a real answer alone', async () => {
  const verdicts = await Promise.all(ANSWERED.map(repliesWithoutAnswering))
  const falsePositives = ANSWERED.filter((_reply, index) => verdicts[index])

  process.stdout.write(`\nfalse positives: ${falsePositives.length}/${ANSWERED.length}\n`)
  for (const reply of falsePositives) process.stdout.write(`  ${reply.slice(0, 90)}\n`)

  expect(falsePositives).toEqual([])
}, 120_000)
