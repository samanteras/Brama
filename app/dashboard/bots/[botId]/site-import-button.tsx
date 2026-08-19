'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Globe } from 'lucide-react'

import { IngestProgress } from './document-uploader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { runIndexing } from '@/lib/client/indexing'
import { ingestFailureMessage } from '@/lib/ingest-copy'
import { pluralizeRu } from '@/lib/plan-copy'

type Stage = { name: 'idle' } | { name: 'crawling' } | { name: 'indexing'; indexed: number; total: number }

/**
 * One-click import of the customer's own website into the knowledge base.
 *
 * The domain choices come from the bot's allow-list — the same list the widget
 * runs on — so "teach the bot your site" is a single decision the customer has
 * already made once, not a new URL to type and mistype.
 */
export function SiteImportButton({ botId, domains }: { botId: string; domains: string[] }) {
  const router = useRouter()

  const [domain, setDomain] = useState(domains[0] ?? '')
  const [stage, setStage] = useState<Stage>({ name: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // Explained rather than hidden: a bot whose only domain is localhost is a
  // perfectly normal first step, and a button that silently never appears
  // reads as a missing feature, not a waiting one.
  if (domains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-pretty">
        Кнопка «Импортировать с сайта» появится, когда в настройках бота будет указан настоящий
        домен — localhost импортировать нечего.
      </p>
    )
  }

  const busy = stage.name !== 'idle'

  async function handleImport() {
    setError(null)
    setDone(null)

    try {
      setStage({ name: 'crawling' })

      const response = await fetch('/api/site-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, domain }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload?.error === 'string' && payload.error.includes(' ')
            ? payload.error
            : ingestFailureMessage(payload?.error),
        )
      }

      setStage({ name: 'indexing', indexed: 0, total: payload.totalChunks })

      await runIndexing(payload.documentId, {
        onProgress: ({ indexed, total }) => setStage({ name: 'indexing', indexed, total }),
      })

      setDone(
        `Импортировано: ${pluralizeRu(payload.pagesCrawled, ['страница', 'страницы', 'страниц'])} с ${domain}.` +
          (payload.replaced ? ' Прошлый импорт заменён.' : ''),
      )
      router.refresh()
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'Что-то пошло не так.')
    } finally {
      setStage({ name: 'idle' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => void handleImport()} disabled={busy}>
          <Globe />
          Импортировать с сайта
        </Button>

        {domains.length > 1 ? (
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            disabled={busy}
            aria-label="Какой сайт импортировать"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            {domains.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-muted-foreground">{domain}</span>
        )}
      </div>

      {stage.name === 'crawling' ? (
        <IngestProgress label={`Читаем ${domain}…`} percent={null} />
      ) : null}

      {stage.name === 'indexing' ? (
        <IngestProgress
          label={`Индексация: ${stage.indexed.toLocaleString('ru-RU')} из ${stage.total.toLocaleString('ru-RU')} фрагментов…`}
          percent={stage.total > 0 ? Math.round((stage.indexed / stage.total) * 100) : null}
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {done ? (
        <Alert>
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
