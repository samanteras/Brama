import 'server-only'

import { isAdminEmail } from '@/lib/admin/access'
import { serverEnv } from '@/lib/env.server'

/** Server-side admin check against the configured `ADMIN_EMAILS` allow-list. */
export function isAdmin(email: string | null | undefined): boolean {
  return isAdminEmail(email, serverEnv.ADMIN_EMAILS)
}
