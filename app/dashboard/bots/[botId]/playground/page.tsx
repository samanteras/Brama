import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ChatWindow } from '@/components/chat/chat-window'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Песочница',
}

export default async function PlaygroundPage(
  props: PageProps<'/dashboard/bots/[botId]/playground'>,
) {
  const { botId } = await props.params
  const supabase = await createClient()

  const [{ data: bot }, { count: readyDocuments }] = await Promise.all([
    supabase
      .from('bots')
      .select('id, name, greeting, accent_color')
      .eq('id', botId)
      .maybeSingle(),
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', botId)
      .eq('status', 'ready'),
  ])

  if (!bot) notFound()

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
      <Card className="h-[32rem] gap-0 overflow-hidden p-0">
        <ChatWindow
          botId={bot.id}
          botName={bot.name}
          greeting={bot.greeting}
          accentColor={bot.accent_color}
          endpoint="/api/chat"
          // Null on purpose: the owner needs to see the contact form to know
          // what visitors get, but a lead from their own testing would clutter
          // the list they act on.
          leadEndpoint={null}
        />
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold">Спросите то, что спрашивают ваши клиенты</h2>
          <p className="mt-1 text-muted-foreground text-pretty">
            Это ровно то, что видит посетитель, — и ответы из ровно тех же документов.
          </p>
        </div>

        {readyDocuments === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground text-pretty">
              Документы ещё не проиндексированы, поэтому бот будет говорить, что не знает, — это
              правильно, но бесполезно. Сначала добавьте что-нибудь в «Базу знаний».
            </p>
          </Card>
        ) : (
          <Card className="p-5">
            <p className="text-sm font-medium">Что стоит попробовать</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Вопрос, на который отвечает ваш прайс, — проверьте, что бот называет настоящую цифру.</li>
              <li>
                Вопрос, на который ответа нет, например дату начала работ. Бот должен честно
                отказаться и спросить телефон, а не выдумывать.
              </li>
              <li>
                То, что у вас спрашивают каждую неделю. Если ответ неверный, лечится это абзацем в
                документах, а не другой формулировкой вопроса.
              </li>
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <p className="text-sm font-medium">Ответы здесь тоже считаются</p>
          <p className="mt-2 text-sm text-muted-foreground text-pretty">
            Тестирование тратит ту же месячную квоту, что и посетители: каждый ответ стоит
            одинаково. Заявки из песочницы при этом не сохраняются.
          </p>
        </Card>
      </div>
    </div>
  )
}
