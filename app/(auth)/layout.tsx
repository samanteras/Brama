import Link from 'next/link'

import { Logo } from '@/components/marketing/logo'
import { APP_NAME } from '@/lib/brand'

/**
 * The same dark stage as the landing hero: whoever lands here has just come
 * from it, and the sign-in screen switching to a white page read as leaving
 * the product. One warm key light behind the card, like the one behind the
 * headline.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark relative flex min-h-svh flex-col items-center justify-center gap-8 overflow-hidden bg-background px-4 py-12 text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
      </div>

      <Link href="/" className="relative flex items-center gap-2">
        <Logo className="size-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-card/80 p-8 shadow-2xl backdrop-blur">
        {children}
      </div>
    </div>
  )
}
