import Link from 'next/link'

import { Logo } from '@/components/marketing/logo'
import { APP_NAME } from '@/lib/brand'

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Logo className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">{APP_NAME}</span>
          <span className="text-sm text-muted-foreground">
            — the answer desk for businesses that run on documents
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link href="/sign-in" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}
