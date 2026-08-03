import { describe, expect, it } from 'vitest'

import { effectiveOrigin } from './embed-origin'

const APP = 'https://foreman.example.app'

describe('effectiveOrigin', () => {
  describe('requests from inside our own iframe', () => {
    it('uses the host page passed by the loader', () => {
      // The bug this exists to fix: the frame is served by us, so the browser
      // sends our origin and the customer's domain is nowhere in the request.
      expect(effectiveOrigin(APP, 'yourcompany.com', APP)).toBe('https://yourcompany.com')
    })

    it('recognises our origin regardless of port or path', () => {
      expect(effectiveOrigin('https://foreman.example.app:443', 'yourcompany.com', APP)).toBe(
        'https://yourcompany.com',
      )
    })

    it('refuses when the loader passed nothing', () => {
      // A frame opened directly, without the loader, has no host page to speak
      // for. Falling back to our own origin would let anyone open the embed URL
      // and chat on a restricted bot.
      expect(effectiveOrigin(APP, null, APP)).toBeNull()
      expect(effectiveOrigin(APP, '', APP)).toBeNull()
      expect(effectiveOrigin(APP, '   ', APP)).toBeNull()
    })

    it('trims whitespace around the host', () => {
      expect(effectiveOrigin(APP, '  yourcompany.com  ', APP)).toBe('https://yourcompany.com')
    })
  })

  describe('requests from elsewhere', () => {
    it('passes a third-party origin through untouched', () => {
      // Not from our frame, so the Origin header means what it says and the
      // normal check applies.
      expect(effectiveOrigin('https://someone.else', 'yourcompany.com', APP)).toBe(
        'https://someone.else',
      )
    })

    it('ignores a host hint from a third-party origin', () => {
      // Otherwise anyone could bypass the domain check by posting from their
      // own site with a hostSite naming the allowed one.
      expect(effectiveOrigin('https://evil.example', 'yourcompany.com', APP)).toBe(
        'https://evil.example',
      )
    })

    it.each([
      ['a missing origin', null],
      ['an undefined origin', undefined],
    ])('passes %s through as null', (_label, origin) => {
      expect(effectiveOrigin(origin, 'yourcompany.com', APP)).toBeNull()
    })

    it('passes a malformed origin through unchanged', () => {
      // Left for checkOrigin to reject, which reports why.
      expect(effectiveOrigin('not a url', 'yourcompany.com', APP)).toBe('not a url')
    })
  })

  it('is not fooled by a lookalike of our own domain', () => {
    // evil-foreman.example.app is not us, so its Origin is taken at face value
    // and judged against the allow-list like any other site.
    expect(effectiveOrigin('https://evil-foreman.example.app', 'yourcompany.com', APP)).toBe(
      'https://evil-foreman.example.app',
    )
  })
})
