import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adminClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

/**
 * The monthly answer quota, including the race it exists to prevent.
 *
 * The concurrency test below is the single most important test in the project.
 * A widget is concurrent by nature — several visitors can be mid-question at
 * the same moment — and a read-then-compare-then-write in application code
 * would let requests interleave straight past the limit. No sequential test can
 * catch that; only firing requests at once can.
 */
describe('message quota', () => {
  let account: TestUser

  beforeAll(async () => {
    account = await createTestUser('quota')
  })

  afterAll(async () => {
    await deleteTestUsers([account])
  })

  async function consume(period: string, limit: number) {
    const { data, error } = await adminClient().rpc('consume_message_quota', {
      p_owner_id: account.id,
      p_period: period,
      p_limit: limit,
    })

    if (error) throw new Error(error.message)
    return data[0]
  }

  async function counterFor(period: string): Promise<number | null> {
    const { data } = await adminClient()
      .from('usage')
      .select('messages_used')
      .eq('owner_id', account.id)
      .eq('period', period)
      .maybeSingle()

    return data?.messages_used ?? null
  }

  it('allows the first answer of a period', async () => {
    const result = await consume('2030-01', 3)

    expect(result.allowed).toBe(true)
    expect(result.used).toBe(1)
  })

  it('counts up to the limit', async () => {
    const period = '2030-02'

    expect(await consume(period, 3)).toMatchObject({ allowed: true, used: 1 })
    expect(await consume(period, 3)).toMatchObject({ allowed: true, used: 2 })
    expect(await consume(period, 3)).toMatchObject({ allowed: true, used: 3 })
  })

  it('refuses once the allowance is spent', async () => {
    const period = '2030-03'

    await consume(period, 2)
    await consume(period, 2)

    const result = await consume(period, 2)
    expect(result).toMatchObject({ allowed: false, used: 2 })
  })

  it('does not increment the counter on a refusal', async () => {
    const period = '2030-04'

    await consume(period, 1)
    await consume(period, 1)
    await consume(period, 1)

    expect(await counterFor(period)).toBe(1)
  })

  it('refuses a zero allowance without creating a row', async () => {
    // The conflict clause only guards the update path, so a first-ever request
    // in a period would otherwise insert a row holding 1 and exceed the cap.
    const period = '2030-05'

    const result = await consume(period, 0)

    expect(result).toMatchObject({ allowed: false, used: 0 })
    expect(await counterFor(period)).toBeNull()
  })

  it('keeps periods independent', async () => {
    await consume('2030-06', 1)
    const other = await consume('2030-07', 1)

    expect(other).toMatchObject({ allowed: true, used: 1 })
  })

  it('returns a consumed answer on refund', async () => {
    const period = '2030-08'

    await consume(period, 5)
    await consume(period, 5)

    await adminClient().rpc('refund_message_quota', {
      p_owner_id: account.id,
      p_period: period,
    })

    expect(await counterFor(period)).toBe(1)
  })

  it('never refunds below zero', async () => {
    const period = '2030-09'

    await consume(period, 5)

    for (let i = 0; i < 3; i++) {
      await adminClient().rpc('refund_message_quota', { p_owner_id: account.id, p_period: period })
    }

    expect(await counterFor(period)).toBe(0)
  })

  describe('under concurrency', () => {
    it('allows exactly the limit when far more requests arrive at once', async () => {
      const period = '2030-12'
      const limit = 10
      const attempts = 40

      const results = await Promise.all(
        Array.from({ length: attempts }, () => consume(period, limit)),
      )

      const allowed = results.filter((result) => result.allowed).length

      expect(allowed).toBe(limit)
      expect(await counterFor(period)).toBe(limit)
    })

    it('reports a coherent count to every caller', async () => {
      const period = '2030-11'
      const limit = 5

      const results = await Promise.all(Array.from({ length: 20 }, () => consume(period, limit)))
      const allowedCounts = results
        .filter((result) => result.allowed)
        .map((result) => result.used)
        .sort((a, b) => a - b)

      // Each successful caller must have been handed a distinct position in the
      // sequence; a duplicate would mean two of them read the same value.
      expect(allowedCounts).toEqual([1, 2, 3, 4, 5])
    })
  })
})
