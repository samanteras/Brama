import { extractLinks, extractTitle, htmlToText, sameSiteHosts } from './html'
import { assertPublicHost } from '@/lib/security/url-guard'

/**
 * Walks a customer's site and returns its pages as text.
 *
 * Breadth-first from the homepage, so the budget is spent on the pages the
 * site itself considers primary — the ones its front page links to — rather
 * than on whatever corner of the sitemap happens to sort first. Every fetched
 * URL passes the SSRF guard, including each hop of a redirect chain.
 *
 * The budget numbers are a product decision as much as a technical one: a
 * dozen pages covers the pricing/services/contacts skeleton of a typical
 * small-business site, and the whole walk stays comfortably inside one
 * serverless invocation.
 */

export type CrawledPage = {
  url: string
  title: string | null
  text: string
}

export type CrawlResult = {
  pages: CrawledPage[]
  /** True when the walk stopped at a budget rather than running out of links. */
  truncated: boolean
}

export type CrawlOptions = {
  maxPages?: number
  maxDepth?: number
  pageTimeoutMs?: number
  maxPageBytes?: number
  /** Injected in tests; the SSRF guard is applied around it either way. */
  fetchImpl?: typeof fetch
  /** Injected in tests to avoid real DNS. */
  guard?: (url: URL) => Promise<void>
}

const DEFAULTS = {
  maxPages: 12,
  maxDepth: 2,
  pageTimeoutMs: 5_000,
  maxPageBytes: 500_000,
} as const

const MAX_REDIRECTS = 3

/** Pages shorter than this are menus-only shells; indexing them adds noise. */
const MIN_PAGE_CHARS = 40

const USER_AGENT = 'BramaBot/1.0 (+https://brama-nine.vercel.app)'

export async function crawlSite(domain: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const { maxPages, maxDepth, pageTimeoutMs, maxPageBytes } = { ...DEFAULTS, ...options }
  const fetchImpl = options.fetchImpl ?? fetch
  const guard = options.guard ?? assertPublicHost

  const disallowed = await fetchRobotsDisallows(domain, { fetchImpl, guard, pageTimeoutMs })

  const queue: { url: string; depth: number }[] = [{ url: `https://${domain}/`, depth: 0 }]
  const visited = new Set<string>()
  const pages: CrawledPage[] = []
  let truncated = false
  let homeRetried = false

  while (queue.length > 0) {
    if (pages.length >= maxPages) {
      truncated = true
      break
    }

    const { url, depth } = queue.shift() as { url: string; depth: number }
    if (visited.has(url)) continue
    visited.add(url)

    if (isDisallowed(new URL(url).pathname, disallowed)) continue

    const fetched = await fetchPage(url, { fetchImpl, guard, pageTimeoutMs, maxPageBytes })

    // The homepage is the whole import: if it fails, everything fails. So it
    // gets one straight retry — a cold DNS resolution plus a TLS handshake can
    // eat the whole page timeout on the first attempt — and then one retry
    // over plain http, because small-business sites without TLS exist, and
    // failing the import over the scheme of the very first request would be
    // indistinguishable from "your site is down".
    if (fetched === null && pages.length === 0 && depth === 0 && url.startsWith('https://')) {
      if (!homeRetried) {
        homeRetried = true
        visited.delete(url)
        queue.push({ url, depth: 0 })
      } else {
        queue.push({ url: `http://${domain}/`, depth: 0 })
      }
      continue
    }

    if (fetched === null) continue

    // Recorded under where the redirect chain actually landed, and that final
    // address is marked visited so a direct link to it later is not fetched
    // twice.
    const { html, finalUrl } = fetched
    if (visited.has(finalUrl) && finalUrl !== url) continue
    visited.add(finalUrl)

    const text = htmlToText(html)
    if (text.length >= MIN_PAGE_CHARS) {
      pages.push({ url: finalUrl, title: extractTitle(html), text })
    }

    if (depth < maxDepth) {
      for (const link of extractLinks(html, new URL(finalUrl))) {
        if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 })
      }
    }
  }

  return { pages, truncated }
}

/** One document out of many pages, each labelled with the URL it came from. */
export function pagesToDocumentText(pages: CrawledPage[]): string {
  return pages
    .map((page) => {
      const heading = page.title ? `${page.title}\n${page.url}` : page.url
      return `${heading}\n\n${page.text}`
    })
    .join('\n\n---\n\n')
}

type FetchContext = {
  fetchImpl: typeof fetch
  guard: (url: URL) => Promise<void>
  pageTimeoutMs: number
  maxPageBytes?: number
}

/**
 * Fetches one page, or null for anything that should simply be skipped.
 *
 * Redirects are followed by hand because the runtime's automatic mode would
 * happily follow a public URL onto a private address — each hop has to pass
 * the guard as if it had been queued itself.
 */
async function fetchPage(
  startUrl: string,
  context: FetchContext,
): Promise<{ html: string; finalUrl: string } | null> {
  const { fetchImpl, guard, pageTimeoutMs, maxPageBytes = DEFAULTS.maxPageBytes } = context

  let url: URL
  try {
    url = new URL(startUrl)
  } catch {
    return null
  }

  const startHosts = sameSiteHosts(url.hostname)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    try {
      await guard(url)

      const response = await fetchImpl(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(pageTimeoutMs),
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return null

        const next = new URL(location, url)
        // A redirect that leaves the site (to a booking platform, a social
        // page) is an exit, not a page of the site.
        if (!startHosts.has(next.hostname.toLowerCase())) return null

        url = next
        continue
      }

      if (!response.ok) return null

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) return null

      const body = await response.arrayBuffer()
      const bytes = body.byteLength > maxPageBytes ? body.slice(0, maxPageBytes) : body

      return {
        html: new TextDecoder('utf-8', { fatal: false }).decode(bytes),
        finalUrl: url.toString(),
      }
    } catch {
      return null
    }
  }

  return null
}

/**
 * `Disallow` prefixes for `User-agent: *`, or for us by name.
 *
 * Deliberately the simplest useful reading of robots.txt: prefix rules only,
 * no wildcards, no Allow precedence. Sites that rely on the subtle parts are
 * not the small-business sites this importer is for, and over-blocking costs
 * us one page while under-blocking costs the site owner trust.
 */
async function fetchRobotsDisallows(
  domain: string,
  context: FetchContext,
): Promise<string[]> {
  const robots = await fetchRobotsText(`https://${domain}/robots.txt`, context)
  if (robots === null) return []

  const rules: string[] = []
  let applies = false

  for (const rawLine of robots.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (line === '') continue

    const agentMatch = line.match(/^user-agent:\s*(.+)$/i)
    if (agentMatch) {
      const agent = agentMatch[1].trim().toLowerCase()
      applies = agent === '*' || agent.includes('bramabot')
      continue
    }

    const disallowMatch = line.match(/^disallow:\s*(.*)$/i)
    if (disallowMatch && applies) {
      const path = disallowMatch[1].trim()
      if (path !== '') rules.push(path)
    }
  }

  return rules
}

async function fetchRobotsText(url: string, context: FetchContext): Promise<string | null> {
  const { fetchImpl, guard, pageTimeoutMs } = context

  try {
    const target = new URL(url)
    await guard(target)

    const response = await fetchImpl(target.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(pageTimeoutMs),
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

function isDisallowed(pathname: string, rules: string[]): boolean {
  return rules.some((rule) => pathname.startsWith(rule))
}
