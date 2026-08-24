import { describe, expect, it } from 'vitest'

import { crawlSite, pagesToDocumentText, type CrawlOptions } from './crawl'

/**
 * A fake site: URL → response description. The crawler must never touch the
 * network in these tests, so an unknown URL fails the fetch rather than
 * falling through to the real implementation.
 */
type FakePage = {
  body?: string
  status?: number
  contentType?: string
  location?: string
}

function fakeFetch(site: Record<string, FakePage>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input)
    const page = site[url]

    if (!page) throw new Error(`unexpected fetch: ${url}`)

    return new Response(page.status && page.status >= 300 ? null : (page.body ?? ''), {
      status: page.status ?? 200,
      headers: {
        'content-type': page.contentType ?? 'text/html; charset=utf-8',
        ...(page.location ? { location: page.location } : {}),
      },
    })
  }) as typeof fetch
}

const allowAll = () => Promise.resolve()

function options(site: Record<string, FakePage>, extra: Partial<CrawlOptions> = {}): CrawlOptions {
  return { fetchImpl: fakeFetch(site), guard: allowAll, ...extra }
}

const LONG = 'Turnkey renovation from 520 EUR per square metre, waste removal included.'

describe('crawlSite', () => {
  it('walks the homepage and the pages it links to', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p><a href="/prices">p</a><a href="/about">a</a>` },
      'https://a.example/prices': { body: `<title>Prices</title><p>Painting: 12 EUR. ${LONG}</p>` },
      'https://a.example/about': { body: `<p>About our crews. ${LONG}</p>` },
    }

    const result = await crawlSite('a.example', options(site))

    expect(result.pages.map((page) => page.url)).toEqual([
      'https://a.example/',
      'https://a.example/prices',
      'https://a.example/about',
    ])
    expect(result.pages[1].title).toBe('Prices')
    expect(result.truncated).toBe(false)
  })

  it('stops at the page budget and reports truncation', async () => {
    const links = Array.from({ length: 10 }, (_, i) => `<a href="/p${i}">l</a>`).join('')
    const site: Record<string, FakePage> = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p>${links}` },
    }
    for (let i = 0; i < 10; i++) {
      site[`https://a.example/p${i}`] = { body: `<p>Page ${i}. ${LONG}</p>` }
    }

    const result = await crawlSite('a.example', options(site, { maxPages: 3 }))

    expect(result.pages).toHaveLength(3)
    expect(result.truncated).toBe(true)
  })

  it('respects the depth limit', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p><a href="/level1">1</a>` },
      'https://a.example/level1': { body: `<p>${LONG}</p><a href="/level2">2</a>` },
      'https://a.example/level2': { body: `<p>never fetched ${LONG}</p>` },
    }

    const result = await crawlSite('a.example', options(site, { maxDepth: 1 }))

    expect(result.pages.map((page) => page.url)).toEqual([
      'https://a.example/',
      'https://a.example/level1',
    ])
  })

  it('skips paths disallowed by robots.txt', async () => {
    const site = {
      'https://a.example/robots.txt': {
        body: 'User-agent: *\nDisallow: /private',
        contentType: 'text/plain',
      },
      'https://a.example/': {
        body: `<p>${LONG}</p><a href="/private/prices">x</a><a href="/public">y</a>`,
      },
      'https://a.example/public': { body: `<p>Public. ${LONG}</p>` },
    }

    const result = await crawlSite('a.example', options(site))

    expect(result.pages.map((page) => page.url)).toEqual([
      'https://a.example/',
      'https://a.example/public',
    ])
  })

  it('follows same-site redirects but not off-site ones', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': {
        body: `<p>${LONG}</p><a href="/old">o</a><a href="/exit">e</a>`,
      },
      'https://a.example/old': { status: 301, location: 'https://a.example/new' },
      'https://a.example/new': { body: `<p>Moved here. ${LONG}</p>` },
      'https://a.example/exit': { status: 302, location: 'https://elsewhere.example/' },
    }

    const result = await crawlSite('a.example', options(site))

    expect(result.pages.map((page) => page.url)).toEqual([
      'https://a.example/',
      'https://a.example/new',
    ])
  })

  it('survives cyclic links without looping', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p><a href="/b">b</a>` },
      'https://a.example/b': { body: `<p>B. ${LONG}</p><a href="/">home</a><a href="/b">self</a>` },
    }

    const result = await crawlSite('a.example', options(site))

    expect(result.pages).toHaveLength(2)
  })

  it('skips non-HTML responses and near-empty shell pages', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': {
        body: `<p>${LONG}</p><a href="/feed">f</a><a href="/shell">s</a>`,
      },
      'https://a.example/feed': { body: '{"items":[]}', contentType: 'application/json' },
      'https://a.example/shell': { body: '<p>Menu</p>' },
    }

    const result = await crawlSite('a.example', options(site))

    expect(result.pages.map((page) => page.url)).toEqual(['https://a.example/'])
  })

  it('falls back to plain http when the homepage refuses https', async () => {
    const site = {
      'http://a.example/robots.txt': { status: 404 },
      'http://a.example/': { body: `<p>No TLS here. ${LONG}</p>` },
    }

    const failsHttps: typeof fetch = (async (input: string | URL | Request) => {
      const url = String(input)
      if (url.startsWith('https://')) throw new Error('ECONNREFUSED')
      return fakeFetch(site)(input as string)
    }) as typeof fetch

    const result = await crawlSite('a.example', { fetchImpl: failsHttps, guard: allowAll })

    expect(result.pages.map((page) => page.url)).toEqual(['http://a.example/'])
  })

  it('asks the guard about every URL it fetches, redirect hops included', async () => {
    const asked: string[] = []
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p><a href="/old">o</a>` },
      'https://a.example/old': { status: 301, location: 'https://a.example/new' },
      'https://a.example/new': { body: `<p>New. ${LONG}</p>` },
    }

    await crawlSite('a.example', {
      fetchImpl: fakeFetch(site),
      guard: (url) => {
        asked.push(url.toString())
        return Promise.resolve()
      },
    })

    expect(asked).toContain('https://a.example/old')
    expect(asked).toContain('https://a.example/new')
  })

  it('drops pages the guard rejects without failing the crawl', async () => {
    const site = {
      'https://a.example/robots.txt': { status: 404 },
      'https://a.example/': { body: `<p>${LONG}</p><a href="/blocked">b</a>` },
      'https://a.example/blocked': { body: `<p>Should not appear. ${LONG}</p>` },
    }

    const result = await crawlSite('a.example', {
      fetchImpl: fakeFetch(site),
      guard: (url) =>
        url.pathname === '/blocked' ? Promise.reject(new Error('blocked-host')) : Promise.resolve(),
    })

    expect(result.pages.map((page) => page.url)).toEqual(['https://a.example/'])
  })
})

describe('pagesToDocumentText', () => {
  it('labels every page with its title and URL', () => {
    const text = pagesToDocumentText([
      { url: 'https://a.example/', title: 'Skyline', text: 'We renovate.' },
      { url: 'https://a.example/prices', title: null, text: 'From 520 EUR.' },
    ])

    expect(text).toBe(
      'Skyline\nhttps://a.example/\n\nWe renovate.\n\n---\n\nhttps://a.example/prices\n\nFrom 520 EUR.',
    )
  })
})
