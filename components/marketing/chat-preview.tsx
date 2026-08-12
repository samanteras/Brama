'use client'

import { motion, useReducedMotion } from 'motion/react'

import { cn } from '@/lib/utils'

export type PreviewMessage = {
  role: 'visitor' | 'bot'
  text: string
  /** Renders the inline contact form the bot shows when it asks for a number. */
  showLeadForm?: boolean
}

type ChatPreviewProps = {
  messages: PreviewMessage[]
  /** Site the widget is pretending to sit on, shown in the window chrome. */
  host?: string
  className?: string
}

/**
 * A static rendering of the widget, used on the landing page.
 *
 * Deliberately not the real chat component: this shows a scripted conversation
 * chosen to demonstrate the product, with no network calls and nothing to go
 * wrong while a visitor is deciding whether to sign up.
 *
 * The conversation plays out message by message when it scrolls into view, at
 * roughly the rhythm of a real exchange — the product is the thing worth
 * watching on this page, so it is the one element that moves like itself.
 */
export function ChatPreview({ messages, host = 'yourcompany.com', className }: ChatPreviewProps) {
  const reduce = useReducedMotion()

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-xl shadow-black/5 dark:border-white/10 dark:shadow-black/40',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3 dark:border-white/10">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        <p className="flex-1 text-center text-xs text-muted-foreground">{host}</p>
      </div>

      <motion.div
        className="space-y-4 p-4 sm:p-5"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: reduce ? 0.15 : 0.55 } },
        }}
      >
        {messages.map((message, index) => (
          <div key={index} className="space-y-3">
            <motion.div
              className={cn('flex', message.role === 'visitor' ? 'justify-end' : 'justify-start')}
              variants={bubbleVariants(reduce, message.role)}
            >
              <p
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  message.role === 'visitor'
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm bg-muted text-foreground',
                )}
              >
                {message.text}
              </p>
            </motion.div>

            {message.showLeadForm ? (
              <motion.div variants={bubbleVariants(reduce, 'bot')}>
                <LeadFormPreview />
              </motion.div>
            ) : null}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

function bubbleVariants(reduce: boolean | null, role: 'visitor' | 'bot') {
  return {
    hidden: reduce
      ? { opacity: 0 }
      : { opacity: 0, y: 14, scale: 0.96, originX: role === 'visitor' ? 1 : 0 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 380, damping: 28 },
    },
  }
}

function LeadFormPreview() {
  return (
    <div className="ml-0 max-w-[85%] rounded-2xl rounded-bl-sm border border-dashed bg-background p-3 dark:border-white/20">
      <div className="flex items-center gap-2">
        <span className="flex-1 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground dark:border-white/10">
          +48 601 234 567
        </span>
        <span className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          Send
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Goes straight to the dashboard, with the whole conversation attached.
      </p>
    </div>
  )
}
