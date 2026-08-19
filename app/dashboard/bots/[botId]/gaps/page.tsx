import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Пробелы',
}

/**
 * Questions the bot could not answer.
 *
 * Not analytics — a to-do list. Every line here is a paragraph missing from the
 * customer's documents, and adding it turns the same question into an answer
 * next time. It closes the loop that starts with uploading a price list.
 */
export default async function GapsPage(props: PageProps<'/dashboard/bots/[botId]/gaps'>) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { data: gaps }] = await Promise.all([
    supabase.from('bots').select('id').eq('id', botId).maybeSingle(),
    supabase.rpc('knowledge_gaps', { p_bot_id: botId, p_limit: 100 }),
  ])

  if (!bot) notFound()

  const questions = gaps ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Что спрашивали, а бот не смог ответить</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
          Каждая строка здесь — абзац, которого не хватает в ваших документах. Добавьте его — и
          тот же вопрос в следующий раз станет ответом, а не просьбой перезвонить.
        </p>
      </div>

      {questions.length === 0 ? (
        <Card className="items-center p-12 text-center">
          <h3 className="text-lg font-semibold">Без пробелов</h3>
          <p className="mt-2 max-w-md text-muted-foreground text-pretty">
            Либо документы покрывают всё, что спрашивают, либо пока никто не спрашивал.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {questions.map((gap, index) => (
            <li key={`${gap.conversation_id}-${index}`}>
              <Card className="gap-0 p-5">
                <p className="text-pretty">&ldquo;{gap.question}&rdquo;</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {new Date(gap.asked_at).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
