import Link from 'next/link'

import { Logo } from '@/components/marketing/logo'
import { APP_NAME } from '@/lib/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link href="/" className="flex items-center gap-2">
        <Logo className="size-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
