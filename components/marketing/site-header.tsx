import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/marketing/logo'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Foreman</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="#leads" className="transition-colors hover:text-foreground">
            Leads
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Start free</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
