import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/marketing/logo'
import type { MarketingCopy } from '@/components/marketing/copy'
import { APP_NAME } from '@/lib/brand'

/**
 * One dark translucent bar over every scene, light and dark alike — the same
 * trick as Apple's navigation. Swapping the bar's colour per section would
 * mean watching it flicker at every boundary while scrolling.
 */
export function SiteHeader({ copy }: { copy: MarketingCopy }) {
  return (
    <header className="dark sticky top-0 z-40 border-b border-white/10 bg-background/70 text-foreground backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="#how-it-works" className="transition-colors hover:text-foreground">
            {copy.header.howItWorks}
          </Link>
          <Link href="#leads" className="transition-colors hover:text-foreground">
            {copy.header.leads}
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground">
            {copy.header.pricing}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <Button variant="ghost" asChild>
            <Link href="/sign-in">{copy.header.signIn}</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">{copy.header.startFree}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
