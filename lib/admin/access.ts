/**
 * Who may open the operator admin panel — the pure membership test.
 *
 * Kept free of `server-only` and env imports so it is unit-testable in
 * isolation; the env-reading wrapper lives in `is-admin.ts`.
 *
 * The allow-list is an environment variable rather than a database column on
 * purpose: an admin flag in `profiles` is one stray service-role write (or one
 * policy mistake) away from a customer granting themselves the run of every
 * tenant's data. In env, admin status cannot be forged through the app — only
 * whoever controls the deployment's configuration can grant it.
 *
 * Case- and whitespace-insensitive; an empty or absent list admits no one.
 */
export function isAdminEmail(
  email: string | null | undefined,
  allowList: string | undefined,
): boolean {
  if (!email) return false

  const allowed = (allowList ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '')

  if (allowed.length === 0) return false

  return allowed.includes(email.trim().toLowerCase())
}
