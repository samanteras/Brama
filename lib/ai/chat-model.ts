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

let client: OpenAI | null = null

export function openai(): OpenAI {
  client ??= new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY })
  return client
}
