/**
 * Domain allow-listing for the public widget endpoint.
 *
 * The widget lives on the customer's own website, so its bot id is visible in
 * page source and can never be a secret. Anyone can copy the snippet and point
 * it at our servers, spending our OpenAI budget. Checking the browser-sent
 * `Origin` header against the bot's domains is the first of three defence
 * layers, alongside per-IP rate limiting and the monthly plan quota.
 *
 * The comparison is deliberately an exact hostname match. The naive approach —
 * `origin.includes(domain)` or `endsWith(domain)` — lets `evil-mysite.com`
 * through for a bot that allow-lists `mysite.com`, which is exactly the hole
 * this module exists to close.
 */

/** Why a request was allowed or rejected. Surfaced in logs and error copy. */
export type OriginVerdict =
  | { allowed: true; reason: 'domain-allowed' }
  | {
      allowed: false
      reason:
        | 'no-domains-configured'
        | 'missing-origin'
        | 'unsupported-scheme'
        | 'malformed-origin'
        | 'domain-not-allowed'
    }

const WILDCARD_PREFIX = '*.'

/** Schemes a browser can legitimately send for an embedded widget. */
const ALLOWED_SCHEMES = new Set(['http:', 'https:'])

/** Matches `scheme://`, so we only prepend one when the input truly lacks it. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * Extracts a comparable hostname from whatever a user typed into the settings
 * field — a bare domain, a full URL, something with a port or a trailing slash.
 *
 * Returns `null` when the input cannot be read as a domain, so callers can show
 * a validation error rather than silently storing an entry that matches nothing.
 *
 * A leading `*.` is preserved as a wildcard marker; see `hostnameMatches`.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  const isWildcard = trimmed.startsWith(WILDCARD_PREFIX)
  const candidate = isWildcard ? trimmed.slice(WILDCARD_PREFIX.length) : trimmed
  if (candidate === '') return null

  // A bare `*` would allow every site on the internet. Refuse it outright
  // rather than quietly turning the allow-list into a no-op.
  if (candidate === '*' || candidate.includes('*')) return null

  const hostname = extractHostname(candidate)
  if (hostname === null) return null

  return isWildcard ? `${WILDCARD_PREFIX}${hostname}` : hostname
}

/**
 * Reads the hostname out of a URL-ish string, lowercased and without a trailing
 * dot.
 *
 * The trailing dot matters: `mysite.com.` is a valid FQDN that resolves to the
 * same host, so leaving it in place would create a trivial bypass of an exact
 * match.
 */
function extractHostname(value: string): string | null {
  // `new URL('localhost:3000')` parses `localhost:` as the scheme, so only
  // prepend when there is genuinely no scheme present.
  const withScheme = HAS_SCHEME.test(value) ? value : `https://${value}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }

  // `URL` already lowercases and punycodes the hostname, which keeps comparison
  // consistent for internationalised domains.
  const hostname = url.hostname.replace(/\.$/, '')

  if (hostname === '') return null

  return isPlausibleHost(hostname) ? hostname : null
}

/**
 * Rejects single-label hosts, which are never real websites.
 *
 * This is not pedantry: `URL` collapses repeated slashes, so a stray `/pricing`
 * parses as `https://pricing/` and would otherwise be stored as a domain that
 * silently matches nothing. `localhost` and IP literals stay valid for local
 * development.
 */
function isPlausibleHost(hostname: string): boolean {
  if (hostname === 'localhost') return true
  // `URL` renders IPv6 hosts in brackets, e.g. `[::1]`.
  if (hostname.startsWith('[') && hostname.endsWith(']')) return true

  return hostname.includes('.')
}

/**
 * Whether a request hostname satisfies a single allow-list entry.
 *
 * `example.com` matches `example.com` and `www.example.com`. The `www` alias is
 * intentional: whoever controls the domain controls its `www` host, so it adds
 * no risk, and without it a customer who types `example.com` while serving from
 * `www.example.com` gets a silently dead widget — the single most likely support
 * ticket this feature could generate.
 *
 * `*.example.com` additionally matches any single- or multi-level subdomain.
 */
export function hostnameMatches(hostname: string, allowedDomain: string): boolean {
  if (allowedDomain.startsWith(WILDCARD_PREFIX)) {
    const base = allowedDomain.slice(WILDCARD_PREFIX.length)
    if (base === '') return false
    // The dot is part of the suffix so `evil-example.com` cannot match
    // `*.example.com`.
    return hostname === base || hostname.endsWith(`.${base}`)
  }

  return hostname === allowedDomain || hostname === `www.${allowedDomain}`
}

/**
 * Checks a browser `Origin` header against a bot's allow-list.
 *
 * An empty allow-list refuses everything. This started out the other way round
 * — empty meaning unrestricted — on the reasoning that a new bot answering
 * nowhere is a broken first experience. That was the wrong trade.
 *
 * The failure modes are not symmetric. Too strict, and the owner sees their
 * widget not working and fixes it in a minute. Too loose, and they see it
 * working perfectly while it answers on any site that copies the snippet, with
 * nothing on screen to suggest otherwise. A protection you have to notice is
 * absent is not a protection.
 *
 * The domain is therefore required when a bot is created, and nothing here has
 * to guess what an empty list was meant to mean.
 *
 * @param origin The raw `Origin` header, or `null` when absent.
 * @param allowedDomains Entries as stored for the bot, already normalized.
 */
export function checkOrigin(
  origin: string | null | undefined,
  allowedDomains: readonly string[],
): OriginVerdict {
  const restrictions = allowedDomains
    .map((domain) => normalizeDomain(domain))
    .filter((domain): domain is string => domain !== null)

  if (restrictions.length === 0) {
    return { allowed: false, reason: 'no-domains-configured' }
  }

  // Absent header means a non-browser client: curl, a script, a server. Those
  // never legitimately drive an embedded widget on a restricted bot.
  if (origin === null || origin === undefined || origin.trim() === '') {
    return { allowed: false, reason: 'missing-origin' }
  }

  // Browsers send the literal string "null" for opaque origins such as a
  // sandboxed iframe or a `file://` page.
  if (origin.trim().toLowerCase() === 'null') {
    return { allowed: false, reason: 'malformed-origin' }
  }

  let url: URL
  try {
    url = new URL(origin.trim())
  } catch {
    return { allowed: false, reason: 'malformed-origin' }
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { allowed: false, reason: 'unsupported-scheme' }
  }

  const hostname = url.hostname.replace(/\.$/, '').toLowerCase()
  if (hostname === '') {
    return { allowed: false, reason: 'malformed-origin' }
  }

  const matches = restrictions.some((domain) => hostnameMatches(hostname, domain))

  return matches
    ? { allowed: true, reason: 'domain-allowed' }
    : { allowed: false, reason: 'domain-not-allowed' }
}
