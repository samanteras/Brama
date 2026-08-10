'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Scroll-reveal primitives for the landing page.
 *
 * Every animation on the page comes through these three components, so the
 * timing language stays consistent: one easing curve, one distance, one
 * stagger rhythm. A page where each section invents its own motion reads as
 * noise rather than design.
 *
 * All of them collapse to plain fades when the visitor asks for reduced
 * motion — the content itself never depends on the animation having played.
 */

/** The one easing used everywhere: fast start, long soft landing. */
const EASE = [0.22, 1, 0.36, 1] as const

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Parent for a cascading group. Children must be `StaggerItem`s; the parent
 * only orchestrates timing.
 */
export function Stagger({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-64px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.14, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : 28 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  )
}
