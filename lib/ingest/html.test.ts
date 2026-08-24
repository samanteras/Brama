import { describe, expect, it } from 'vitest'

import { extractLinks, extractTitle, htmlToText, sameSiteHosts } from './html'

describe('htmlToText', () => {
  it('keeps prose and drops tags', () => {
    expect(htmlToText('<p>Turnkey renovation <strong>from 520 EUR</strong> per m2.</p>')).toBe(
      'Turnkey renovation from 520 EUR per m2.',
    )
  })

  it('drops scripts, styles and navigation chrome entirely', () => {
    const html = `
      <nav><a href="/">Home</a><a href="/prices">Prices</a></nav>
      <script>window.track("visit")</script>
      <style>.hero { color: red }</style>
      <main><p>We renovate flats.</p></main>
      <footer>© Skyline</footer>`

    expect(htmlToText(html)).toBe('We renovate flats.')
  })

  it('turns block boundaries into paragraph breaks so structure survives', () => {
    const text = htmlToText('<h1>Warranty</h1><p>Two years on structure.</p><p>One year on finishes.</p>')

    expect(text).toBe('Warranty\n\nTwo years on structure.\n\nOne year on finishes.')
  })

  it('decodes named, decimal and hex entities', () => {
    expect(htmlToText('<p>Fish &amp; chips &#8212; from &#x20AC;5, plus&nbsp;VAT</p>')).toBe(
      'Fish & chips — from €5, plus VAT',
    )
  })

  it('leaves unknown entities alone rather than guessing', () => {
    expect(htmlToText('<p>A &frobnicate; B</p>')).toBe('A &frobnicate; B')
  })

  it('survives unclosed and malformed tags', () => {
    expect(htmlToText('<p>Open <b>bold <p>next paragraph')).toBe('Open bold\nnext paragraph')
  })

  it('drops HTML comments including markup inside them', () => {
    expect(htmlToText('<p>Kept</p><!-- <p>ghost</p> -->')).toBe('Kept')
  })

  it('collapses runs of whitespace left by removed markup', () => {
    expect(htmlToText('<div>  a  \n\n\n\n  b  </div>')).toBe('a\n\nb')
  })
})

describe('extractTitle', () => {
  it('reads and decodes the title', () => {
    expect(extractTitle('<head><title>Skyline &mdash; Renovations</title></head>')).toBe(
      'Skyline — Renovations',
    )
  })

  it('returns null when there is no title or it is empty', () => {
    expect(extractTitle('<p>no head</p>')).toBeNull()
    expect(extractTitle('<title>   </title>')).toBeNull()
  })
})

describe('extractLinks', () => {
  const base = new URL('https://skyline.example/prices')

  it('resolves relative links against the page URL', () => {
    expect(extractLinks('<a href="/warranty">W</a>', base)).toEqual([
      'https://skyline.example/warranty',
    ])
  })

  it('keeps links to the www twin and drops other hosts', () => {
    const html = `
      <a href="https://www.skyline.example/about">same site</a>
      <a href="https://blog.skyline.example/post">subdomain</a>
      <a href="https://elsewhere.example/">other site</a>`

    expect(extractLinks(html, base)).toEqual(['https://www.skyline.example/about'])
  })

  it('drops fragments, tracking queries, downloads and non-web schemes', () => {
    const html = `
      <a href="/prices#table">fragment</a>
      <a href="/prices?utm_source=x">tracked</a>
      <a href="/list.pdf">download</a>
      <a href="mailto:hi@skyline.example">mail</a>
      <a href="javascript:void(0)">js</a>`

    expect(extractLinks(html, base)).toEqual(['https://skyline.example/prices'])
  })

  it('deduplicates links that appear many times', () => {
    const html = '<a href="/a">1</a><a href="/a">2</a><a href="/a#x">3</a>'

    expect(extractLinks(html, base)).toEqual(['https://skyline.example/a'])
  })

  it('ignores unparseable hrefs', () => {
    expect(extractLinks('<a href="http://">broken</a>', base)).toEqual([])
  })
})

describe('sameSiteHosts', () => {
  it('pairs an apex with its www twin in both directions', () => {
    expect(sameSiteHosts('skyline.example')).toEqual(
      new Set(['skyline.example', 'www.skyline.example']),
    )
    expect(sameSiteHosts('www.skyline.example')).toEqual(
      new Set(['skyline.example', 'www.skyline.example']),
    )
  })
})
