'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Buttons that hand off to Stripe.
 *
 * Neither of these changes anything on our side. Checkout is intent; the plan
 * only moves when the webhook reports that Stripe took the money.
 */
export function UpgradeButton({
  planId,
  label,
  variant = 'default',
  disabled,
}: {
  planId: string
  label: string
  variant?: 'default' | 'outline'
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Could not start checkout.')
      }

      window.location.href = payload.url
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Could not start checkout.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        variant={variant}
        onClick={() => void start()}
        disabled={busy || disabled}
      >
        {busy ? 'Opening Stripe…' : label}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Could not open the billing portal.')
      }

      window.location.href = payload.url
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Could not open the billing portal.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={() => void open()} disabled={busy}>
        {busy ? 'Opening…' : 'Manage billing'}
      </Button>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
