import { describe, expect, it } from 'vitest'

import { checkOrigin, hostnameMatches, normalizeDomain } from './origin'

describe('normalizeDomain', () => {
  it.each([
    ['a bare domain', 'mysite.com', 'mysite.com'],
    ['surrounding whitespace', '  mysite.com  ', 'mysite.com'],
    ['mixed case', 'MySite.COM', 'mysite.com'],
    ['an https URL', 'https://mysite.com', 'mysite.com'],
    ['an http URL', 'http://mysite.com', 'mysite.com'],
    ['a URL with a path and query', 'https://mysite.com/pricing?ref=x', 'mysite.com'],
    ['a trailing slash', 'https://mysite.com/', 'mysite.com'],
    ['an explicit port', 'mysite.com:3000', 'mysite.com'],
    ['a subdomain', 'shop.mysite.com', 'shop.mysite.com'],
    ['localhost with a port', 'localhost:3001', 'localhost'],
    ['a bare hostname', 'localhost', 'localhost'],
  ])('reads %s', (_label, input, expected) => {
    expect(normalizeDomain(input)).toBe(expected)
  })

  it('strips a trailing dot so the FQDN form cannot bypass an exact match', () => {
    expect(normalizeDomain('mysite.com.')).toBe('mysite.com')
  })

  it('punycodes internationalised domains so comparison is consistent', () => {
    expect(normalizeDomain('пример.рф')).toBe('xn--e1afmkfd.xn--p1ai')
  })

  it('keeps an explicit wildcard marker', () => {
    expect(normalizeDomain('*.mysite.com')).toBe('*.mysite.com')
  })

  it('normalizes the base of a wildcard entry', () => {
    expect(normalizeDomain('*.MySite.com/')).toBe('*.mysite.com')
  })

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a lone wildcard', '*'],
    ['a wildcard with no base', '*.'],
    ['a nested wildcard', '*.*.mysite.com'],
    ['a wildcard inside the label', 'my*site.com'],
    ['a scheme with no host', 'https://'],
    ['a path only', '/pricing'],
    ['a single label with no dot', 'pricing'],
    ['a bare TLD', 'com'],
  ])('rejects %s', (_label, input) => {
    expect(normalizeDomain(input)).toBeNull()
  })

  it.each([
    ['an IPv4 literal', '192.168.1.20', '192.168.1.20'],
    ['an IPv6 literal', 'http://[::1]:3000', '[::1]'],
  ])('keeps %s for local development', (_label, input, expected) => {
    expect(normalizeDomain(input)).toBe(expected)
  })
})

describe('hostnameMatches', () => {
  it('matches an identical hostname', () => {
    expect(hostnameMatches('mysite.com', 'mysite.com')).toBe(true)
  })

  it('accepts the www alias of an allow-listed apex domain', () => {
    expect(hostnameMatches('www.mysite.com', 'mysite.com')).toBe(true)
  })

  it('does not treat an allow-listed www entry as covering the apex', () => {
    expect(hostnameMatches('mysite.com', 'www.mysite.com')).toBe(false)
  })

  it('rejects a hostname that merely ends with the allowed domain', () => {
    // The bug this module exists to prevent: a substring or endsWith check would
    // hand an attacker's domain full access to the customer's bot.
    expect(hostnameMatches('evil-mysite.com', 'mysite.com')).toBe(false)
  })

  it('rejects a hostname that merely starts with the allowed domain', () => {
    expect(hostnameMatches('mysite.com.evil.com', 'mysite.com')).toBe(false)
  })

  it('rejects an arbitrary subdomain of an apex entry', () => {
    expect(hostnameMatches('shop.mysite.com', 'mysite.com')).toBe(false)
  })

  describe('wildcard entries', () => {
    it('matches a single-level subdomain', () => {
      expect(hostnameMatches('shop.mysite.com', '*.mysite.com')).toBe(true)
    })

    it('matches a multi-level subdomain', () => {
      expect(hostnameMatches('staging.shop.mysite.com', '*.mysite.com')).toBe(true)
    })

    it('matches the apex domain itself', () => {
      expect(hostnameMatches('mysite.com', '*.mysite.com')).toBe(true)
    })

    it('rejects a lookalike domain', () => {
      expect(hostnameMatches('evil-mysite.com', '*.mysite.com')).toBe(false)
    })

    it('rejects a domain missing the separating dot', () => {
      expect(hostnameMatches('evilmysite.com', '*.mysite.com')).toBe(false)
    })

    it('rejects an unrelated domain that contains the base', () => {
      expect(hostnameMatches('mysite.com.evil.com', '*.mysite.com')).toBe(false)
    })

    it('rejects an entry with no base', () => {
      expect(hostnameMatches('mysite.com', '*.')).toBe(false)
    })
  })
})

describe('checkOrigin', () => {
  const allowed = ['mysite.com']

  describe('with no domains configured', () => {
    it('refuses every origin', () => {
      // Deliberately the opposite of the original design. Too strict is visible
      // to the owner within a minute; too loose looks like everything working
      // while the widget answers on any site that copied the snippet.
      expect(checkOrigin('https://anywhere.example', [])).toEqual({
        allowed: false,
        reason: 'no-domains-configured',
      })
    })

    it('refuses a request with no Origin header either', () => {
      expect(checkOrigin(null, [])).toEqual({
        allowed: false,
        reason: 'no-domains-configured',
      })
    })

    it('treats a list of unparseable entries as no domains at all', () => {
      // Entries are validated before storage, so this is a safety net. It must
      // fail closed: an unusable list is not an open one.
      expect(checkOrigin('https://anywhere.example', ['', '   ', '*'])).toEqual({
        allowed: false,
        reason: 'no-domains-configured',
      })
    })
  })

  describe('with an allow-list', () => {
    it.each([
      ['an exact https origin', 'https://mysite.com'],
      ['an http origin', 'http://mysite.com'],
      ['a non-standard port', 'https://mysite.com:8443'],
      ['the www alias', 'https://www.mysite.com'],
      ['mixed case', 'https://MySite.COM'],
      ['a trailing dot', 'https://mysite.com.'],
    ])('allows %s', (_label, origin) => {
      expect(checkOrigin(origin, allowed)).toEqual({ allowed: true, reason: 'domain-allowed' })
    })

    it('allows an origin matching any one entry of several', () => {
      expect(checkOrigin('https://other.example', ['mysite.com', 'other.example'])).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('allows an entry that was stored as a full URL', () => {
      expect(checkOrigin('https://mysite.com', ['https://mysite.com/pricing'])).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('ignores unparseable entries while honouring valid ones', () => {
      expect(checkOrigin('https://mysite.com', ['', '*', 'mysite.com'])).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('supports a localhost entry for local development', () => {
      expect(checkOrigin('http://localhost:3001', ['localhost'])).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('rejects an unrelated domain', () => {
      expect(checkOrigin('https://somewhere.else', allowed)).toEqual({
        allowed: false,
        reason: 'domain-not-allowed',
      })
    })

    it('rejects a lookalike domain', () => {
      expect(checkOrigin('https://evil-mysite.com', allowed)).toEqual({
        allowed: false,
        reason: 'domain-not-allowed',
      })
    })

    it('rejects a domain that merely contains the allowed one', () => {
      expect(checkOrigin('https://mysite.com.evil.com', allowed)).toEqual({
        allowed: false,
        reason: 'domain-not-allowed',
      })
    })

    it('rejects a subdomain unless it is allow-listed', () => {
      expect(checkOrigin('https://shop.mysite.com', allowed)).toEqual({
        allowed: false,
        reason: 'domain-not-allowed',
      })
    })

    it.each([
      ['a null header', null],
      ['an undefined header', undefined],
      ['an empty header', ''],
      ['a whitespace header', '   '],
    ])('rejects %s as a non-browser client', (_label, origin) => {
      // curl and server-side scripts never legitimately drive the widget.
      expect(checkOrigin(origin, allowed)).toEqual({ allowed: false, reason: 'missing-origin' })
    })

    it('rejects the literal "null" origin browsers send for opaque contexts', () => {
      // Sandboxed iframes and file:// pages produce this.
      expect(checkOrigin('null', allowed)).toEqual({
        allowed: false,
        reason: 'malformed-origin',
      })
    })

    it.each([
      ['a file origin', 'file:///home/user/page.html'],
      ['a browser extension origin', 'chrome-extension://abcdefghijklmnop'],
      ['a javascript pseudo-scheme', 'javascript:alert(1)'],
      ['a data URL', 'data:text/html,<p>hi</p>'],
    ])('rejects %s', (_label, origin) => {
      expect(checkOrigin(origin, allowed)).toEqual({
        allowed: false,
        reason: 'unsupported-scheme',
      })
    })

    it.each([
      ['plain text', 'not a url'],
      ['a bare hostname with no scheme', 'mysite.com'],
      ['a scheme with no host', 'https://'],
    ])('rejects %s as malformed', (_label, origin) => {
      // A real browser always sends `scheme://host`, so anything else is either
      // forged or a bug — either way it does not get the benefit of the doubt.
      expect(checkOrigin(origin, allowed)).toEqual({
        allowed: false,
        reason: 'malformed-origin',
      })
    })
  })

  describe('with a wildcard allow-list', () => {
    const wildcard = ['*.mysite.com']

    it('allows a subdomain', () => {
      expect(checkOrigin('https://shop.mysite.com', wildcard)).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('allows the apex domain', () => {
      expect(checkOrigin('https://mysite.com', wildcard)).toEqual({
        allowed: true,
        reason: 'domain-allowed',
      })
    })

    it('rejects a lookalike domain', () => {
      expect(checkOrigin('https://evil-mysite.com', wildcard)).toEqual({
        allowed: false,
        reason: 'domain-not-allowed',
      })
    })
  })
})
