import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileText } from 'lucide-react'

import { deleteDocument } from '../../actions'
import { DocumentUploader } from './document-uploader'
import { ResumeIndexingButton } from './resume-indexing-button'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ingestFailureMessage } from '@/lib/ingest-copy'
import { formatLimit } from '@/lib/plan-copy'
import { getPlan, isWithinLimit, toPlanId } from '@/lib/plans'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Knowledge',
}

export default async function BotKnowledgePage(props: PageProps<'/dashboard/bots/[botId]'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { data: documents }, { data: profile }] = await Promise.all([
    supabase.from('bots').select('id').eq('id', botId).maybeSingle(),
    supabase
      .from('documents')
      .select('id, filename, source_type, status, error_code, page_count, total_chunks, indexed_chunks, created_at')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('plan').maybeSingle(),
  ])

  if (!bot) notFound()

  const plan = getPlan(toPlanId(profile?.plan))
  const documentCount = documents?.length ?? 0
  const canAddMore = isWithinLimit(documentCount, plan.limits.documentsPerBot)

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Add to the knowledge base</h2>
          <p className="text-sm text-muted-foreground">
            {documentCount} of {formatLimit(plan.limits.documentsPerBot)} documents
          </p>
        </div>

        {canAddMore ? (
          <DocumentUploader botId={botId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            The {plan.name} plan allows {formatLimit(plan.limits.documentsPerBot)} documents per
            bot. Remove one, or upgrade to add more.
          </p>
        )}
      </Card>

      {documentCount === 0 ? (
        <Card className="items-center p-12 text-center">
          <h2 className="text-lg font-semibold">Nothing to answer from yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground text-pretty">
            Until you add a document, the bot will say it does not know — which is the correct
            behaviour, but not a useful one.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {documents?.map((document) => (
            <li key={document.id}>
              <Card className="gap-0 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium">
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{document.filename}</span>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <DocumentStatus
                        status={document.status}
                        indexed={document.indexed_chunks}
                        total={document.total_chunks}
                      />
                      {document.page_count ? <span>{document.page_count} pages</span> : null}
                      <span>{document.total_chunks} passages</span>
                    </div>

                    {document.status === 'failed' ? (
                      <p className="mt-2 max-w-prose text-sm text-destructive text-pretty">
                        {ingestFailureMessage(document.error_code)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-start gap-2">
                    {document.status === 'processing' || document.status === 'failed' ? (
                      <ResumeIndexingButton
                        documentId={document.id}
                        indexed={document.indexed_chunks}
                        total={document.total_chunks}
                      />
                    ) : null}

                    <form action={deleteDocument}>
                      <input type="hidden" name="documentId" value={document.id} />
                      <input type="hidden" name="botId" value={botId} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DocumentStatus({
  status,
  indexed,
  total,
}: {
  status: string
  indexed: number
  total: number
}) {
  if (status === 'ready') {
    return (
      <span className="flex items-center gap-1.5 text-foreground">
        <CheckCircle2 className="size-4 text-primary" aria-hidden />
        Ready
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="flex items-center gap-1.5 text-destructive">
        <AlertTriangle className="size-4" aria-hidden />
        Failed
      </span>
    )
  }

  // Deliberately spelled out rather than shown as a spinner: a document stuck
  // at "12 of 210" tells the owner something actionable.
  return (
    <span>
      Indexing {indexed.toLocaleString('en-US')} of {total.toLocaleString('en-US')}
    </span>
  )
}
