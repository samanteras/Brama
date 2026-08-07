import Link from 'next/link'
import { redirect } from 'next/navigation'

import { signOut } from '../(auth)/actions'
import { Logo } from '@/components/marketing/logo'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/brand'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // proxy.ts already redirects signed-out visitors, but this layout must not
  // assume that held: a routing change that stops matching this path would
  // otherwise turn into a data leak rather than a broken redirect.
  if (!user) redirect('/sign-in')

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Bots
            </Link>
            <Link href="/dashboard/billing" className="transition-colors hover:text-foreground">
              Billing
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}
