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

  // `dark` on the wrapper puts the whole dashboard on the landing's dark
  // stage — one product, one light. The bar itself is the landing header's
  // translucent bar, verbatim.
  return (
    <div className="dark relative flex min-h-svh flex-col bg-background text-foreground">
      {/* The landing hero's key light, dimmed to working brightness. Kept in
          its own overflow-hidden box so the sticky header's ancestor stays
          overflow-free. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden">
        <div className="absolute -top-72 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-[160px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="font-semibold tracking-tight">{APP_NAME}</span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Боты
            </Link>
            <Link href="/dashboard/billing" className="transition-colors hover:text-foreground">
              Оплата
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}
