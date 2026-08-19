'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

/**
 * Section navigation for a bot.
 *
 * Only sections that exist are listed. A tab that opens an empty "coming soon"
 * page costs more trust than it buys.
 */
export function BotTabs({ botId }: { botId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/bots/${botId}`

  const tabs = [
    { href: base, label: 'База знаний' },
    { href: `${base}/playground`, label: 'Песочница' },
    { href: `${base}/leads`, label: 'Заявки' },
    { href: `${base}/gaps`, label: 'Пробелы' },
    { href: `${base}/settings`, label: 'Настройки' },
  ]

  return (
    <nav className="mt-6 flex gap-1 border-b">
      {tabs.map((tab) => {
        const active = pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
