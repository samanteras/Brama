import { cn } from '@/lib/utils'

/**
 * A hard hat, drawn as a mark rather than borrowed from an icon set so the
 * product has one thing that is its own.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('size-6', className)}
    >
      <path
        d="M3 17a9 9 0 0 1 18 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 8.6V4.8a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8v3.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 17h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
