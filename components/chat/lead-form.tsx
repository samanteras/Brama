'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * The contact form the bot shows when a person needs to take over.
 *
 * Asks for as little as possible. Every extra field costs conversions, and the
 * context the manager needs — what they wanted, where they got stuck — is
 * already captured from the conversation rather than demanded from the visitor.
 */
export function LeadForm({
  botId,
  conversationId,
  context,
  endpoint,
  accentColor,
  onSaved,
}: {
  botId: string
  conversationId: string | null
  context: { reason: string; summary: string; unanswered_question?: string }
  /**
   * Where to post the contact, or `null` in the dashboard tester.
   *
   * The owner needs to see this form to know what visitors experience, but a
   * lead captured from their own testing would clutter the list they actually
   * act on. So the tester shows the form and skips the save.
   */
  endpoint: string | null
  accentColor: string
  onSaved: () => void
}) {
  const [contact, setContact] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (contact.trim() === '' || saving) return

    setSaving(true)
    setError(null)

    if (endpoint === null) {
      onSaved()
      setSaving(false)
      return
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, conversationId, contact, name, context }),
      })

      if (!response.ok) throw new Error('save failed')

      onSaved()
    } catch {
      setError('Could not send that. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="rounded-2xl rounded-bl-sm border bg-background p-3">
      <div className="space-y-2">
        <Input
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Phone or email"
          aria-label="Phone or email"
          required
          autoFocus
        />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name (optional)"
          aria-label="Your name"
        />
      </div>

      <Button
        type="submit"
        className="mt-3 w-full text-white"
        style={{ backgroundColor: accentColor }}
        disabled={saving || contact.trim() === ''}
      >
        {saving ? 'Sending…' : 'Send'}
      </Button>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </form>
  )
}
