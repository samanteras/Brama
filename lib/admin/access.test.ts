import { describe, expect, it } from 'vitest'

import { isAdminEmail } from './access'

describe('isAdminEmail', () => {
  it('admits an email present in the list', () => {
    expect(isAdminEmail('op@brama.dev', 'op@brama.dev')).toBe(true)
  })

  it('handles a comma-separated list with spaces', () => {
    expect(isAdminEmail('two@brama.dev', 'one@brama.dev, two@brama.dev , three@brama.dev')).toBe(true)
  })

  it('is case-insensitive on both sides', () => {
    expect(isAdminEmail('OP@Brama.Dev', 'op@brama.dev')).toBe(true)
    expect(isAdminEmail('op@brama.dev', 'OP@BRAMA.DEV')).toBe(true)
  })

  it('trims surrounding whitespace on the candidate', () => {
    expect(isAdminEmail('  op@brama.dev  ', 'op@brama.dev')).toBe(true)
  })

  it('rejects an email not in the list', () => {
    expect(isAdminEmail('nope@brama.dev', 'op@brama.dev')).toBe(false)
  })

  it.each([undefined, '', '   ', ','])('admits no one when the list is %j', (list) => {
    expect(isAdminEmail('op@brama.dev', list as string | undefined)).toBe(false)
  })

  it.each([null, undefined, ''])('rejects a missing email %j', (email) => {
    expect(isAdminEmail(email as string | null | undefined, 'op@brama.dev')).toBe(false)
  })

  it('does not match on a substring', () => {
    // "op@brama.dev" must not be admitted by "top@brama.dev" in the list.
    expect(isAdminEmail('op@brama.dev', 'top@brama.dev')).toBe(false)
  })
})
