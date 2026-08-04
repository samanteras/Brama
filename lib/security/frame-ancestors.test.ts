import { describe, expect, it } from 'vitest'

import { frameAncestorsFor } from './frame-ancestors'

describe('frameAncestorsFor', () => {
  it('allows any ancestor when no domains are configured', () => {
    // Restricting domains is a paid feature; a new bot that refuses to appear
    // anywhere would be a broken first experience.
    expect(frameAncestorsFor([])).toBe('frame-ancestors *')
  })

  it('lists a configured domain', () => {
    expect(frameAncestorsFor(['mysite.com'])).toContain('https://mysite.com')
  })

  it('includes the www alias', () => {
    // Matches hostnameMatches, so the browser-enforced rule and our own check
    // agree about what counts as the same site.
    expect(frameAncestorsFor(['mysite.com'])).toContain('https://www.mysite.com')
  })

  it('handles several domains', () => {
    const directive = frameAncestorsFor(['mysite.com', 'other.example'])

    expect(directive).toContain('https://mysite.com')
    expect(directive).toContain('https://other.example')
  })

  it('expands a wildcard to the subdomains and the apex', () => {
    const directive = frameAncestorsFor(['*.mysite.com'])

    expect(directive).toContain('https://*.mysite.com')
    expect(directive).toContain('https://mysite.com')
  })

  it('allows plain http only for localhost', () => {
    const local = frameAncestorsFor(['localhost'])
    expect(local).toContain('http://localhost:*')

    const real = frameAncestorsFor(['mysite.com'])
    expect(real).not.toContain('http://')
  })

  it('normalizes entries stored as full URLs', () => {
    expect(frameAncestorsFor(['https://mysite.com/pricing'])).toContain('https://mysite.com')
  })

  it('ignores unparseable entries', () => {
    const directive = frameAncestorsFor(['', '   ', 'mysite.com'])

    expect(directive).toContain('https://mysite.com')
    expect(directive).not.toContain('  ')
  })

  it('falls back to allowing any ancestor if every entry is unusable', () => {
    // Better than emitting an empty directive, which would block the widget
    // everywhere including the site that installed it.
    expect(frameAncestorsFor(['', '*'])).toBe('frame-ancestors *')
  })

  it('does not repeat a source', () => {
    const directive = frameAncestorsFor(['mysite.com', 'www.mysite.com'])
    const sources = directive.replace('frame-ancestors ', '').split(' ')

    expect(new Set(sources).size).toBe(sources.length)
  })

  it('never emits a bare wildcard alongside real domains', () => {
    // A stray `*` would silently undo the whole restriction.
    const directive = frameAncestorsFor(['mysite.com'])
    expect(directive.split(' ')).not.toContain('*')
  })
})
