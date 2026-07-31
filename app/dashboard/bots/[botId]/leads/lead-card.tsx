import { Mail, MessageSquare, Phone } from 'lucide-react'

import { Transcript } from './transcript'
import { Card } from '@/components/ui/card'

type LeadContext = {
  reason?: string
  summary?: string
  unanswered_question?: string
}

type Lead = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  context: unknown
  created_at: string
  conversation_id: string | null
}

/**
 * A lead as something a manager can act on.
 *
 * The difference between this and a row in a table is the whole product
 * argument: whoever calls back should already know what the person wanted and
 * where they got stuck, without opening the transcript first.
 */
export function LeadCard({ lead, botId }: { lead: Lead; botId: string }) {
  const context = (lead.context ?? {}) as LeadContext

  return (
    <Card className="gap-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{lead.name?.trim() || 'No name given'}</p>

          <p className="mt-1 flex items-center gap-2 text-sm">
            {lead.phone ? (
              <>
                <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                <a href={`tel:${lead.phone}`} className="underline-offset-4 hover:underline">
                  {lead.phone}
                </a>
              </>
            ) : (
              <>
                <Mail className="size-3.5 text-muted-foreground" aria-hidden />
                <a href={`mailto:${lead.email}`} className="underline-offset-4 hover:underline">
                  {lead.email}
                </a>
              </>
            )}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {new Date(lead.created_at).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {context.summary ? (
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-muted-foreground">Wants</dt>
            <dd>{context.summary}</dd>
          </div>

          {context.unanswered_question ? (
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 text-muted-foreground">Stalled on</dt>
              <dd className="font-medium">
                &ldquo;{context.unanswered_question}&rdquo;
                <span className="ml-2 font-normal text-muted-foreground">
                  — not in your documents
                </span>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {lead.conversation_id ? (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <MessageSquare className="size-4" aria-hidden />
            Full conversation
          </summary>

          <div className="mt-3">
            <Transcript conversationId={lead.conversation_id} botId={botId} />
          </div>
        </details>
      ) : null}
    </Card>
  )
}
