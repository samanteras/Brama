import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { signOut } from '../(auth)/actions'
import { Logo } from '@/components/marketing/logo'
import { Button } from '@/components/ui/button'
import { APP_NAME } from '@/lib/brand'
import { isAdmin } from '@/lib/admin/is-admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Operator-only shell. Two gates: no session bounces to sign-in; a signed-in
 * non-admin gets a 404, not a 403 — the panel does not announce its existence
 * to accounts that may not use it.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/admin')
  if (!isAdmin(user.email)) notFound()

  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="font-semibold tracking-tight">{APP_NAME} · Админка</span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Кабинет
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
