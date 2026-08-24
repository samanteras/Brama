'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { runIndexing } from '@/lib/client/indexing'
import { ingestFailureMessage, pageLimitMessage } from '@/lib/ingest-copy'
import { createClient } from '@/lib/supabase/client'

type Stage =
  | { name: 'idle' }
  | { name: 'uploading' }
  | { name: 'reading' }
  | { name: 'indexing'; indexed: number; total: number }

const ACCEPTED = '.pdf,.txt,.md'

/** Must match the bucket's allowed_mime_types, set in the storage migration. */
const MIME_TYPES = {
  pdf: 'application/pdf',
  markdown: 'text/markdown',
  text: 'text/plain',
} as const

/**
 * Uploads a document and drives its indexing from the browser.
 *
 * The loop here is the whole reason a 150-page PDF can be indexed at all: each
 * batch is a short request that comfortably fits a serverless time limit, and
 * the browser keeps asking until the server says it is done. It also produces
 * an honest progress figure — "43 of 210" rather than a spinner that tells the
 * customer nothing.
 */
export function DocumentUploader({ botId }: { botId: string }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>({ name: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pastedText, setPastedText] = useState('')

  const busy = stage.name !== 'idle'

  async function indexDocument(documentId: string, totalChunks: number) {
    setStage({ name: 'indexing', indexed: 0, total: totalChunks })

    await runIndexing(documentId, {
      onProgress: ({ indexed, total }) => setStage({ name: 'indexing', indexed, total }),
    })
  }

  async function createDocument(body: Record<string, unknown>) {
    const response = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const details = payload?.details
      throw new Error(
        payload?.error === 'too-many-pages'
          ? pageLimitMessage(details?.pageCount, details?.maxPages)
          : ingestFailureMessage(payload?.error),
      )
    }

    return payload as { documentId: string; totalChunks: number }
  }

  async function handleFile(file: File) {
    setError(null)

    const extension = file.name.toLowerCase().split('.').pop() ?? ''
    const sourceType = extension === 'pdf' ? 'pdf' : extension === 'md' ? 'markdown' : 'text'

    try {
      setStage({ name: 'uploading' })

      const supabase = createClient()
      const storagePath = `${botId}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          // Set explicitly rather than left to the browser. Browsers do not
          // recognise .md and send it as application/octet-stream, which the
          // bucket rejects — so a perfectly valid Markdown file failed to
          // upload with a message about its size.
          contentType: MIME_TYPES[sourceType],
        })

      if (uploadError) {
        // Surfaced rather than replaced with a guess. "Check its size" sent me
        // looking at the wrong thing entirely when the real problem was a
        // rejected content type.
        throw new Error(`Не получилось загрузить файл: ${uploadError.message}`)
      }

      setStage({ name: 'reading' })

      const { documentId, totalChunks } = await createDocument({
        botId,
        sourceType,
        filename: file.name,
        storagePath,
      })

      await indexDocument(documentId, totalChunks)

      router.refresh()
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Что-то пошло не так.')
    } finally {
      setStage({ name: 'idle' })
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function handlePaste() {
    setError(null)

    try {
      setStage({ name: 'reading' })

      const { documentId, totalChunks } = await createDocument({
        botId,
        sourceType: 'paste',
        filename: 'Вставленный текст',
        text: pastedText,
      })

      await indexDocument(documentId, totalChunks)

      setPastedText('')
      setPasteOpen(false)
      router.refresh()
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Что-то пошло не так.')
    } finally {
      setStage({ name: 'idle' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        <Button onClick={() => fileInput.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <FileUp />}
          Загрузить документ
        </Button>

        <Button variant="outline" onClick={() => setPasteOpen((open) => !open)} disabled={busy}>
          Или вставить текст
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        PDF, обычный текст или Markdown. Ваш прайс, условия, этапы работ, гарантия.
      </p>

      {pasteOpen ? (
        <div className="space-y-3">
          <Textarea
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            rows={8}
            disabled={busy}
            placeholder={
              'Ремонт под ключ от 45 000 ₽ за м².\n\nВ цену входят демонтаж и вывоз мусора. Материалы оплачиваются отдельно по себестоимости.'
            }
          />
          <Button onClick={() => void handlePaste()} disabled={busy || pastedText.trim() === ''}>
            Добавить текст
          </Button>
        </div>
      ) : null}

      {stage.name !== 'idle' ? <ProgressNote stage={stage} /> : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function ProgressNote({ stage }: { stage: Exclude<Stage, { name: 'idle' }> }) {
  const label =
    stage.name === 'uploading'
      ? 'Загружаем…'
      : stage.name === 'reading'
        ? 'Читаем документ…'
        : `Индексация: ${stage.indexed.toLocaleString('ru-RU')} из ${stage.total.toLocaleString('ru-RU')} фрагментов…`

  const percent =
    stage.name === 'indexing' && stage.total > 0
      ? Math.round((stage.indexed / stage.total) * 100)
      : null

  return <IngestProgress label={label} percent={percent} />
}

/** Shared between the uploader and the site importer, so progress looks the same. */
export function IngestProgress({ label, percent }: { label: string; percent: number | null }) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {label}
      </p>

      {percent !== null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Не закрывайте вкладку. Если закроется — можно продолжить с того же места.
      </p>
    </div>
  )
}
