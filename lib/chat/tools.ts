import type OpenAI from 'openai'

/**
 * The tool that turns a failed answer into a lead.
 *
 * Structured tool calling rather than a marker in the reply text. A convention
 * like `[COLLECT_LEAD]` breaks in a dozen quiet ways — the model writes it with
 * a space, puts it mid-sentence, or quotes it back to the visitor — and the
 * entire value of the product rides on this signal being reliable.
 *
 * The arguments exist to make the lead useful to whoever calls back, not to
 * steer the model. A row saying only "someone left a number" forces a manager to
 * read the whole transcript before they can open the conversation.
 */
export const COLLECT_LEAD_TOOL: OpenAI.Chat.Completions.ChatCompletionFunctionTool = {
  type: 'function',
  function: {
    name: 'collect_lead',
    description:
      'Ask the visitor for their phone number so a person can follow up. Call this when the reference passages do not answer their question, or when they ask to speak to someone, get a quote, or book a visit.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: ['not_in_documents', 'asked_for_contact', 'ready_to_book'],
          description:
            'Why a person needs to take over. Use not_in_documents whenever the passages lack the answer to what was asked — even if the visitor also sounds ready to go ahead. ready_to_book is only for when nothing was left unanswered and they simply want to proceed.',
        },
        summary: {
          type: 'string',
          description:
            'One sentence on what this visitor wants, in the third person, for the person calling back. For example: wants an exact quote for their own project, hoping to start before September.',
        },
        unanswered_question: {
          type: 'string',
          description:
            'The question that could not be answered, in the visitor own words. Empty if they simply asked to be contacted.',
        },
      },
      required: ['reason', 'summary'],
      additionalProperties: false,
    },
  },
}

export type CollectLeadArguments = {
  reason: 'not_in_documents' | 'asked_for_contact' | 'ready_to_book'
  summary: string
  unanswered_question?: string
}

/**
 * Reads the tool arguments defensively.
 *
 * The model produces this JSON, so it is untrusted input like any other. A
 * malformed payload must still yield a usable lead request — losing the contact
 * because a summary field was missing would be the worst possible trade.
 */
export function parseCollectLeadArguments(raw: string): CollectLeadArguments {
  const fallback: CollectLeadArguments = {
    reason: 'not_in_documents',
    summary: '',
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback

    const record = parsed as Record<string, unknown>
    const reason = record.reason

    return {
      reason:
        reason === 'asked_for_contact' || reason === 'ready_to_book' || reason === 'not_in_documents'
          ? reason
          : fallback.reason,
      summary: typeof record.summary === 'string' ? record.summary : '',
      unanswered_question:
        typeof record.unanswered_question === 'string' ? record.unanswered_question : undefined,
    }
  } catch {
    return fallback
  }
}
