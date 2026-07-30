/**
 * Sanitizes the post-sign-in redirect target.
 *
 * The `next` parameter comes from the URL, so a visitor controls it entirely.
 * Without this, `?next=https://evil.example` would send freshly authenticated
 * users to an attacker's page — a phishing setup made more convincing by the
 * fact that they really did just sign in to the genuine site.
 */

const DEFAULT_DESTINATION = '/dashboard'

/**
 * C0 controls plus DEL, written as escape codes because as literals they are
 * invisible in source and impossible to review.
 *
 * A newline or carriage return in a redirect target is the classic way to
 * smuggle an extra header or confuse a URL parser.
 */
const CONTROL_CHARACTERS = new RegExp('[\\u0000-\\u001F\\u007F]')

export function safeRedirectPath(value: unknown, fallback: string = DEFAULT_DESTINATION): string {
  if (typeof value !== 'string') return fallback

  const path = value.trim()
  if (path === '') return fallback

  if (CONTROL_CHARACTERS.test(path)) return fallback

  // Must be a site-relative path.
  if (!path.startsWith('/')) return fallback

  // `//host` and `/\host` are protocol-relative: browsers read them as absolute
  // URLs pointing off-site, which is the whole trick.
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback

  return path
}
