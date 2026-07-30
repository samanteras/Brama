import { describe, expect, it } from 'vitest'

import { safeRedirectPath } from './redirect'

const NULL_BYTE = String.fromCharCode(0x00)
const DEL = String.fromCharCode(0x7f)

describe('safeRedirectPath', () => {
  it('keeps a plain site path', () => {
    expect(safeRedirectPath('/dashboard/bots')).toBe('/dashboard/bots')
  })

  it('keeps a path with a query string', () => {
    expect(safeRedirectPath('/dashboard/bots?created=1')).toBe('/dashboard/bots?created=1')
  })

  it('keeps a path with a fragment', () => {
    expect(safeRedirectPath('/dashboard#leads')).toBe('/dashboard#leads')
  })

  it('trims surrounding whitespace', () => {
    expect(safeRedirectPath('  /dashboard  ')).toBe('/dashboard')
  })

  describe('off-site destinations', () => {
    it.each([
      ['an absolute https URL', 'https://evil.example/steal'],
      ['an absolute http URL', 'http://evil.example'],
      ['a protocol-relative URL', '//evil.example'],
      ['a backslash protocol-relative URL', '/\\evil.example'],
      ['a javascript pseudo-scheme', 'javascript:alert(1)'],
      ['a data URL', 'data:text/html,<script>alert(1)</script>'],
      ['a scheme-relative URL with credentials', '//user:pass@evil.example'],
    ])('rejects %s', (_label, value) => {
      // Sending a freshly authenticated user off-site is convincing phishing:
      // they really did just sign in to the genuine product.
      expect(safeRedirectPath(value)).toBe('/dashboard')
    })
  })

  describe('malformed input', () => {
    it.each([
      ['a relative path with no leading slash', 'dashboard'],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['an object', { next: '/dashboard' }],
      ['an array', ['/dashboard']],
    ])('rejects %s', (_label, value) => {
      expect(safeRedirectPath(value)).toBe('/dashboard')
    })
  })

  describe('control characters', () => {
    it.each([
      ['a newline', '/dashboard\nSet-Cookie: admin=1'],
      ['a carriage return', '/dashboard\r\nLocation: https://evil.example'],
      ['a null byte', `/dashboard${NULL_BYTE}`],
      ['a tab', '/dash\tboard'],
      ['a DEL character', `/dashboard${DEL}`],
    ])('rejects %s', (_label, value) => {
      // Smuggling a header through a redirect target is why this check exists.
      expect(safeRedirectPath(value)).toBe('/dashboard')
    })
  })

  it('honours a custom fallback', () => {
    expect(safeRedirectPath('https://evil.example', '/')).toBe('/')
  })

  it('falls back to the dashboard by default', () => {
    expect(safeRedirectPath(undefined)).toBe('/dashboard')
  })
})
