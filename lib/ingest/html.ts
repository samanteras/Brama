/**
 * Turns a fetched web page into indexable text and crawlable links.
 *
 * Deliberately regex-based rather than a DOM library: the output feeds an
 * embedding model, which is untroubled by the occasional imperfect join, and
 * the pages come from the open web, where a real parser's strictness buys
 * nothing but a dependency. The rules that matter — what gets dropped, what
 * becomes a paragraph break — are all here and all unit-tested.
 */

/**
 * Elements whose text would poison retrieval rather than inform it: code,
 * styling, and the navigation chrome that repeats on every page of a site.
 * Dropping chrome matters more than it looks — twelve copies of the same menu
 * would otherwise be the most "similar" text to almost any question.
 */
const DROPPED_ELEMENTS = ['script', 'style', 'noscript', 'template', 'svg', 'nav', 'header', 'footer', 'aside', 'form']

/** Tags that end a line of prose when they open or close. */
const BLOCK_TAGS =
  'p|div|section|article|main|h1|h2|h3|h4|h5|h6|li|ul|ol|table|tr|td|th|blockquote|pre|figure|figcaption|dl|dt|dd|address|details|summary'

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  deg: '°',
}

function decodeEntities(text: string): string {
  // The first character class holds space, tab, and a literal U+00A0: some
  // entities decode to a non-breaking space and it must collapse too.
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return ' '
  try {
    return String.fromCodePoint(code)
  } catch {
    return ' '
  }
}

/** The page's own name for itself, for labelling the imported text. */
export function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return null

  const title = decodeEntities(match[1]).replace(/\s+/g, ' ').trim()
  return title === '' ? null : title
}

/**
 * The page's visible prose, with block boundaries preserved as line breaks so
 * chunking sees the page's own structure instead of one endless paragraph.
 */
export function htmlToText(html: string): string {
  let text = html
    // Comments and conditional junk first, so nothing inside them survives.
    .replace(/<!--[\s\S]*?-->/g, ' ')

  for (const tag of DROPPED_ELEMENTS) {
    text = text.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'), ' ')
  }

  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n')
    // Whatever tags remain are inline; they separate words, not lines.
    .replace(/<[^>]+>/g, ' ')

  text = decodeEntities(text)

  return text
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** File endings that are downloads, not pages; fetching them wastes the crawl budget. */
const NON_PAGE_EXTENSIONS =
  /\.(?:pdf|jpe?g|png|gif|webp|svg|ico|css|js|mjs|json|xml|zip|rar|7z|gz|mp[34]|mov|avi|webm|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i

/**
 * Same-site links worth crawling next, absolute and deduplicated.
 *
 * "Same site" means the exact host of the page plus its `www` twin — mirroring
 * how the widget's own domain matching treats `www`, so a site that links to
 * itself through either spelling is walked as one site, while genuine
 * subdomains stay out of scope.
 */
export function extractLinks(html: string, base: URL): string[] {
  const hosts = sameSiteHosts(base.hostname)
  const found = new Set<string>()

  for (const match of html.matchAll(/<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const href = (match[1] ?? match[2] ?? '').trim()
    if (href === '' || href.startsWith('#')) continue

    let url: URL
    try {
      url = new URL(href, base)
    } catch {
      continue
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue
    if (!hosts.has(url.hostname.toLowerCase())) continue
    if (NON_PAGE_EXTENSIONS.test(url.pathname)) continue

    // Fragments never change the document, and query strings on marketing
    // sites are overwhelmingly tracking noise that would multiply one page
    // into many crawl slots.
    url.hash = ''
    url.search = ''

    found.add(url.toString())
  }

  return [...found]
}

export function sameSiteHosts(hostname: string): Set<string> {
  const host = hostname.toLowerCase()
  const twin = host.startsWith('www.') ? host.slice(4) : `www.${host}`
  return new Set([host, twin])
}
