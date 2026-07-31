import { describe, expect, it } from 'vitest'

import { COLLECT_LEAD_TOOL, parseCollectLeadArguments } from './tools'

describe('COLLECT_LEAD_TOOL', () => {
  it('is a function tool named collect_lead', () => {
    expect(COLLECT_LEAD_TOOL.type).toBe('function')
    expect(COLLECT_LEAD_TOOL.function.name).toBe('collect_lead')
  })

  it('describes when to call it, not just what it is', () => {
    // The description is the only instruction the model gets at the decision
    // point, so it has to name the situations.
    const description = COLLECT_LEAD_TOOL.function.description ?? ''

    expect(description).toMatch(/do not answer|not answer|quote|survey|speak to someone/i)
  })

  it('asks for a summary so the lead is actionable', () => {
    const properties = COLLECT_LEAD_TOOL.function.parameters?.properties as Record<string, unknown>

    // A row saying only "someone left a number" forces a manager to read the
    // whole transcript before they can open the call.
    expect(properties).toHaveProperty('summary')
    expect(properties).toHaveProperty('reason')
  })

  it('requires the fields the lead card depends on', () => {
    const required = COLLECT_LEAD_TOOL.function.parameters?.required as string[]

    expect(required).toContain('reason')
    expect(required).toContain('summary')
  })
})

describe('parseCollectLeadArguments', () => {
  it('reads a well-formed payload', () => {
    const parsed = parseCollectLeadArguments(
      JSON.stringify({
        reason: 'not_in_documents',
        summary: 'Wants a turnkey renovation of a 54 m2 flat.',
        unanswered_question: 'Can you start before September?',
      }),
    )

    expect(parsed).toEqual({
      reason: 'not_in_documents',
      summary: 'Wants a turnkey renovation of a 54 m2 flat.',
      unanswered_question: 'Can you start before September?',
    })
  })

  it.each(['not_in_documents', 'asked_for_contact', 'ready_to_book'] as const)(
    'accepts the %s reason',
    (reason) => {
      expect(parseCollectLeadArguments(JSON.stringify({ reason, summary: 'x' })).reason).toBe(reason)
    },
  )

  it('omits the unanswered question when absent', () => {
    const parsed = parseCollectLeadArguments(JSON.stringify({ reason: 'ready_to_book', summary: 'x' }))
    expect(parsed.unanswered_question).toBeUndefined()
  })

  describe('malformed payloads', () => {
    it.each([
      ['invalid JSON', '{not json'],
      ['an empty string', ''],
      ['a JSON array', '[]'],
      ['a JSON string', '"hello"'],
      ['null', 'null'],
      ['a number', '42'],
    ])('still returns a usable lead request for %s', (_label, raw) => {
      // Losing the contact because the model produced odd JSON would be the
      // worst possible trade — the phone number is the whole point.
      const parsed = parseCollectLeadArguments(raw)

      expect(parsed.reason).toBe('not_in_documents')
      expect(typeof parsed.summary).toBe('string')
    })

    it('falls back on an unknown reason', () => {
      const parsed = parseCollectLeadArguments(
        JSON.stringify({ reason: 'because_i_felt_like_it', summary: 'x' }),
      )

      expect(parsed.reason).toBe('not_in_documents')
    })

    it('ignores a non-string summary', () => {
      const parsed = parseCollectLeadArguments(JSON.stringify({ reason: 'ready_to_book', summary: 42 }))
      expect(parsed.summary).toBe('')
    })

    it('ignores a non-string unanswered question', () => {
      const parsed = parseCollectLeadArguments(
        JSON.stringify({ reason: 'ready_to_book', summary: 'x', unanswered_question: { a: 1 } }),
      )

      expect(parsed.unanswered_question).toBeUndefined()
    })

    it('never throws', () => {
      for (const raw of ['', '{', 'undefined', '[1,2,3]', '{"reason":}']) {
        expect(() => parseCollectLeadArguments(raw)).not.toThrow()
      }
    })
  })
})
