import 'server-only'

import Stripe from 'stripe'

/**
 * Stripe client and the environment it needs.
 *
 * Read lazily rather than at module load, unlike the rest of the environment.
 * Billing keys are only required on the billing routes, and parsing them
 * eagerly would make the whole app refuse to start for anyone who has not set
 * up Stripe yet — including during development of everything else.
 */

let client: Stripe | null = null

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value || value.trim() === '') {
    throw new Error(
      `${name} is not set. Billing needs Stripe test-mode credentials; see .env.example.`,
    )
  }

  return value
}

export function stripe(): Stripe {
  client ??= new Stripe(requireEnv('STRIPE_SECRET_KEY'))
  return client
}

export function webhookSecret(): string {
  return requireEnv('STRIPE_WEBHOOK_SECRET')
}

/** Whether billing is configured at all, so the UI can say so plainly. */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID_PRO)
}
