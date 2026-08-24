// No `server-only` marker, unlike the rest of lib/security: it would make the
// module untestable, and the `node:dns` import already fails any attempt to
// bundle this into a client component.
import { lookup } from 'node:dns/promises'

/**
 * Keeps the site importer from being used as a periscope into our own
 * infrastructure.
 *
 * The importer fetches URLs derived from customer input, which is the classic
 * server-side request forgery setup: a "domain" that resolves to a loopback or
 * cloud-metadata address would let a tenant read whatever our server can reach.
 * Every address a hostname resolves to must be publicly routable before we
 * connect to it.
 *
 * A determined attacker could still re-point DNS between this check and the
 * fetch (DNS rebinding). That is accepted for now: the fetch that follows
 * carries no credentials, follows redirects only through this same check, and
 * the response goes into the tenant's own knowledge base — so the payoff is
 * reading a body we would show back to them anyway. Pinning resolved IPs at
 * the socket layer is the follow-up if that calculus ever changes.
 */

/** Thrown codes are stable identifiers for the route to translate into copy. */
export class BlockedUrlError extends Error {
  constructor(readonly code: 'blocked-scheme' | 'blocked-port' | 'blocked-host' | 'unresolvable-host') {
    super(code)
    this.name = 'BlockedUrlError'
  }
}

/** True for any address that must never be fetched: loopback, LAN, link-local, metadata. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase()

  // IPv4-mapped IPv6 (`::ffff:10.0.0.1`) is judged by its IPv4 payload.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])

  if (ip.includes(':')) return isPrivateIpv6(ip)
  return isPrivateIpv4(ip)
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    // Not a well-formed address; treat as hostile rather than guessing.
    return true
  }

  const [a, b] = parts

  if (a === 0) return true // "this network"
  if (a === 10) return true // RFC 1918
  if (a === 127) return true // loopback
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT, RFC 6598
  if (a === 169 && b === 254) return true // link-local, incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true // RFC 1918
  if (a === 192 && b === 0) return true // IETF protocol assignments, incl. 192.0.0.0/24
  if (a === 192 && b === 168) return true // RFC 1918
  if (a === 198 && (b === 18 || b === 19)) return true // benchmarking
  if (a >= 224) return true // multicast and reserved

  return false
}

function isPrivateIpv6(ip: string): boolean {
  if (ip === '::' || ip === '::1') return true // unspecified, loopback
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true // unique local, fc00::/7
  if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
    return true // link-local, fe80::/10
  }
  if (ip.startsWith('ff')) return true // multicast

  return false
}

/**
 * Rejects a URL whose shape alone already disqualifies it, before any DNS.
 * Only web schemes on their default ports: a crawler has no business speaking
 * to Redis on 6379 no matter what the DNS says.
 */
export function assertWebUrl(url: URL): void {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new BlockedUrlError('blocked-scheme')
  }

  if (url.port !== '') {
    throw new BlockedUrlError('blocked-port')
  }

  if (url.username !== '' || url.password !== '') {
    throw new BlockedUrlError('blocked-host')
  }
}

/**
 * Resolves the hostname and rejects the URL if any resulting address is
 * private. All addresses, not the first: a hostname is allowed to resolve to
 * several, and the runtime may connect to any of them.
 */
export async function assertPublicHost(
  url: URL,
  resolve: (hostname: string) => Promise<{ address: string }[]> = (hostname) =>
    lookup(hostname, { all: true, verbatim: true }),
): Promise<void> {
  assertWebUrl(url)

  // An IP literal skips DNS but faces the same test.
  const literal = url.hostname.replace(/^\[|\]$/g, '')
  if (/^[\d.]+$/.test(literal) || literal.includes(':')) {
    if (isPrivateAddress(literal)) throw new BlockedUrlError('blocked-host')
    return
  }

  let addresses: { address: string }[]
  try {
    addresses = await resolve(url.hostname)
  } catch {
    throw new BlockedUrlError('unresolvable-host')
  }

  if (addresses.length === 0) {
    throw new BlockedUrlError('unresolvable-host')
  }

  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new BlockedUrlError('blocked-host')
  }
}
