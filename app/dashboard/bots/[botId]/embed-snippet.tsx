'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

/**
 * The one line a customer pastes into their site.
 *
 * Shown as copyable text rather than a download or an integration wizard,
 * because the whole promise is that this takes one step.
 */
export function EmbedSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The snippet is visible and selectable, so there is nothing to recover
      // from — silently leaving the button unchanged is the honest outcome.
    }
  }

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs leading-relaxed">
        <code>{snippet}</code>
      </pre>

      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy snippet'}
      </Button>
    </div>
  )
}
