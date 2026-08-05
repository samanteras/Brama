import 'server-only'

import { CHAT_MODEL, openai } from '@/lib/ai/chat-model'

/**
 * Catches a reply that declined to answer without calling the lead tool.
 *
 * The prompt tells the model to say so and call `collect_lead` together, and
 * most of the time it does. But in a running conversation, with an earlier
 * answered turn in context that called no tool, it copies that shape: it writes
 * "the documents do not mention any discount for paying everything up front"
 * and stops. The visitor reads a dead end and leaves, and the one thing this
 * product sells — a question it could not answer becoming a lead — silently
 * does not happen.
 *
 * Measured before this existed: asked cold, the tool fired in 3 of 3 samples;
 * asked after one answered turn, 2 of 3. Prompt wording could not be made to
 * hold it. Two lines added to an unrelated rule about Markdown moved lead
 * collection by ten points, in both directions, which is the clearest evidence
 * available that the decision is not anchored by the prompt at all.
 *
 * So it is checked instead of asked for. This reads only the reply — not the
 * passages, not the history — because the question it answers is narrow: did
 * the bot just tell this visitor it does not know? A short input keeps the
 * check cheap enough to run on every turn that produced no tool call.
 */

const INSTRUCTION = [
  'You are checking one reply from a company website assistant.',
  '',
  'Answer YES if the reply tells the visitor it does not have the information —',
  'that the documents do not say, that it cannot confirm, that it does not know,',
  'or that someone will have to check.',
  '',
  'Answer NO if the reply answers the question, including a negative answer',
  'stated as fact, such as the price not covering appliances or a warranty not',
  'covering flood damage. A reply that states what the company does or does not',
  'do is an answer.',
  '',
  'Answer NO if the reply refuses to do something it was told to do — change',
  'its prices, ignore its instructions, take on another role — rather than',
  'lacking information. "I can\'t do that, I can only use the company\'s',
  'passages" is a refusal to obey, not a gap, and someone trying to manipulate',
  'the bot is not a lead worth calling back.',
  '',
  'A reply can do both: admit it does not know, then offer a related fact it',
  'does know. "The documents do not mention monthly instalments. Work is paid in',
  'three stages" is still YES — the visitor asked about instalments and was told',
  'they are not covered. Judge the sentence that answers what was asked, not the',
  'facts offered alongside it.',
  '',
  'Reply with one word: YES or NO.',
].join('\n')

export async function repliesWithoutAnswering(reply: string): Promise<boolean> {
  const trimmed = reply.trim()
  if (trimmed === '') return false

  try {
    const completion = await openai().chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0,
      // One would be enough for "YES", but the API rejects a budget that tight
      // with a 400 rather than truncating, and the catch below turns that into
      // a silent "no refusal here" — which is how this shipped broken for
      // exactly one eval run.
      max_completion_tokens: 16,
      messages: [
        { role: 'system', content: INSTRUCTION },
        { role: 'user', content: trimmed },
      ],
    })

    return completion.choices[0]?.message?.content?.trim().toUpperCase().startsWith('Y') ?? false
  } catch {
    // A failed check must never cost the visitor their answer. The reply has
    // already been streamed; the worst case here is a missing form, which is
    // exactly where things stood before this existed.
    return false
  }
}

/**
 * The sentence appended when the net catches a refusal.
 *
 * Fixed text rather than another model turn. The reply already explained what
 * it could not answer, so all that is missing is the invitation, and a second
 * generated sentence would cost another call to re-say what was just said.
 */
export const NET_FOLLOW_UP = ' Leave your phone number and someone will get back to you.'
