/**
 * Drives document indexing from the browser.
 *
 * Each call to the batch endpoint claims whatever chunks still lack an
 * embedding, so this loop is safe to start, stop and start again. That is what
 * makes both the initial upload and the "Continue" button on an interrupted
 * document the same operation, rather than two code paths that can disagree.
 */

export type IndexingProgress = { indexed: number; total: number }

export type IndexingOptions = {
  onProgress?: (progress: IndexingProgress) => void
  /** Lets a caller stop the loop, e.g. when the component unmounts. */
  signal?: AbortSignal
}

/**
 * How many consecutive batches may return without moving the counter before we
 * give up. One can happen; two in a row is a bug, not a slow network, and
 * looping forever would leave the customer staring at a frozen progress bar.
 */
const MAX_STALLED_ROUNDS = 2

export async function runIndexing(
  documentId: string,
  { onProgress, signal }: IndexingOptions = {},
): Promise<IndexingProgress> {
  let lastIndexed = -1
  let stalledRounds = 0

  for (;;) {
    if (signal?.aborted) throw new Error('Индексация отменена.')

    const response = await fetch('/api/ingest/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
      signal,
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Индексация не удалась.')
    }

    const progress: IndexingProgress = { indexed: payload.indexed, total: payload.total }
    onProgress?.(progress)

    if (payload.done) return progress

    if (progress.indexed === lastIndexed) {
      stalledRounds += 1
      if (stalledRounds >= MAX_STALLED_ROUNDS) {
        throw new Error('Индексация перестала продвигаться. Попробуйте ещё раз.')
      }
    } else {
      stalledRounds = 0
      lastIndexed = progress.indexed
    }
  }
}
