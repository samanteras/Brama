'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { runIndexing } from '@/lib/client/indexing'

/**
 * Picks up a document whose indexing stopped part-way.
 *
 * Runs exactly the same loop as the initial upload, because the batch endpoint
 * is idempotent — it claims whatever is still unembedded. Without this button a
 * closed tab would leave a document stuck in `processing` for good, invisible
 * to the bot and impossible to recover without deleting and re-uploading.
 */
export function ResumeIndexingButton({
  documentId,
  indexed,
  total,
}: {
  documentId: string
  indexed: number
  total: number
}) {
  const router = useRouter()
  const [progress, setProgress] = useState({ indexed, total })
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resume() {
    setRunning(true)
    setError(null)

    try {
      await runIndexing(documentId, { onProgress: setProgress })
      router.refresh()
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Could not finish indexing.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Button size="sm" variant="outline" onClick={() => void resume()} disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <RotateCw />}
        {running
          ? `${progress.indexed.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')}`
          : 'Continue indexing'}
      </Button>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
