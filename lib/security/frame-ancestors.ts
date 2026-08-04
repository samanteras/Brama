import { normalizeDomain } from './origin'

/**
 * Builds the `frame-ancestors` directive for a bot's embed page.
 *
 * This is the only layer a copied snippet cannot defeat. Everything else in the
 * widget's defence is our own code checking values the caller supplies — the
 * host name passed by the loader can simply be edited. This is enforced by the
 * visitor's browser before a single request reaches us: the frame will not
 * render on a site that is not listed, whatever the snippet claims.
 *
 * A bot with no usable domains is framed nowhere at all. Defaulting to `*` here
 * would mean a widget silently answering on every site that copied its snippet,
 * while the owner's settings page looked perfectly normal — the kind of gap
 * nobody notices until it has been open for months. The domain is required at
 * creation, so an empty list means something went wrong rather than "not
 * configured yet".
 */
export function frameAncestorsFor(allowedDomains: readonly string[]): string {
  const domains = allowedDomains
    .map((domain) => normalizeDomain(domain))
    .filter((domain): domain is string => domain !== null)

  if (domains.length === 0) return "frame-ancestors 'none'"

  const sources = domains.flatMap((domain) => {
    if (domain.startsWith('*.')) {
      const base = domain.slice(2)
      // Both the wildcard and the apex, matching how hostnameMatches reads it.
      return [`https://*.${base}`, `https://${base}`]
    }

    // The www alias is honoured here too, so the two checks agree about what
    // counts as the same site.
    return [`https://${domain}`, `https://www.${domain}`]
  })

  // localhost is only ever useful over http during development, and naming it
  // explicitly avoids allowing plain http for real domains.
  const withLocal = domains.includes('localhost')
    ? [...sources, 'http://localhost:*', 'http://127.0.0.1:*']
    : sources

  return `frame-ancestors ${[...new Set(withLocal)].join(' ')}`
}
