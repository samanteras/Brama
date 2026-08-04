/**
 * Works out which origin the domain check should actually be applied to.
 *
 * The widget renders inside an iframe served from this app, so requests it
 * makes carry *our* origin, not the customer's. Comparing that against a bot's
 * allowed domains is meaningless — it never matches, and the widget refuses to
 * answer on the very site it was installed on. This was a real bug, and it was
 * invisible to tests that set the Origin header by hand, because doing so
 * skips the one path a browser actually takes.
 *
 * So when a request arrives from our own origin, it came from inside the frame,
 * and the host page's name — passed through by the loader script — is what
 * needs checking instead.
 *
 * That value is a hint, not proof: whoever edits the snippet controls it. The
 * guarantee that a widget cannot run on an unapproved site is the
 * `frame-ancestors` header set per bot in proxy.ts, which the browser enforces
 * before any of this code runs. This check makes casual copying fail cleanly,
 * and the plan quota and rate limit stand behind both.
 */
export function effectiveOrigin(
  requestOrigin: string | null | undefined,
  hostSite: string | null | undefined,
  appUrl: string,
): string | null {
  const origin = requestOrigin ?? null

  if (!isOwnOrigin(origin, appUrl)) return origin

  const host = hostSite?.trim()
  if (!host) return null

  // Normalized to an origin so one comparison handles both paths. The scheme is
  // irrelevant to the check itself, which compares hostnames.
  return `https://${host}`
}

function isOwnOrigin(origin: string | null, appUrl: string): boolean {
  if (!origin) return false

  try {
    return new URL(origin).hostname === new URL(appUrl).hostname
  } catch {
    return false
  }
}
