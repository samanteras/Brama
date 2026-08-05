import 'server-only'

import OpenAI from 'openai'

import { serverEnv } from '@/lib/env.server'

/**
 * The model that answers visitors.
 *
 * Deliberately a mini-tier model. The work is narrow — read a handful of
 * retrieved passages, answer from them or decline — and that does not need a
 * frontier model. Every answer is billed, so the cheapest model that reliably
 * follows the refusal rule and calls the lead tool is the right one.
 *
 * Kept as a single constant so swapping it is one edit, and so the eval run can
 * compare tiers honestly.
 */
export const CHAT_MODEL = 'gpt-5.4-mini'

/**
 * Sampling temperature for every answer.
 *
 * Zero, because nothing this bot does benefits from variety. It reads passages
 * and either answers from them or declines, and the same question deserves the
 * same answer twice — a visitor who reloads and gets a different price has been
 * told the company is unreliable.
 *
 * It was left at the default of 1.0 until the eval was run twice over identical
 * code and returned 91% and 85% with almost disjoint failure sets.
 *
 * Setting it to zero did not make the eval repeatable — two runs after the
 * change still differed — so this is not the fix for that, and the eval samples
 * each question several times for exactly that reason. Zero is kept because it
 * is the right setting on its own terms, not because it made the numbers agree.
 */
export const CHAT_TEMPERATURE = 0

let client: OpenAI | null = null

export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY })
  return client
}
