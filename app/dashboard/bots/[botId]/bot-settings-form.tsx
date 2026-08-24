'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { updateBot, type BotFormState } from '../../actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Bot = {
  id: string
  name: string
  greeting: string
  accent_color: string
  allowed_domains: string[]
}

export function BotSettingsForm({ bot }: { bot: Bot }) {
  const [state, formAction] = useActionState<BotFormState, FormData>(updateBot, {})

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="botId" value={bot.id} />

      <div className="space-y-2">
        <Label htmlFor="name">Имя</Label>
        <Input id="name" name="name" defaultValue={bot.name} required maxLength={60} />
        <p className="text-sm text-muted-foreground">Показывается в шапке окна чата.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">Первое сообщение</Label>
        <Textarea
          id="greeting"
          name="greeting"
          defaultValue={bot.greeting}
          maxLength={300}
          rows={3}
          placeholder="Здравствуйте! Спросите про цены, сроки или условия."
        />
        <p className="text-sm text-muted-foreground">
          Что посетитель видит до того, как напишет. Оставьте пустым — чат откроется чистым.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accentColor">Фирменный цвет</Label>
        <Input
          id="accentColor"
          name="accentColor"
          type="color"
          defaultValue={bot.accent_color}
          className="h-10 w-16 p-1"
        />
        <p className="text-sm text-muted-foreground">
          Используется для кнопки чата и сообщений посетителя.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedDomains">Разрешённые домены</Label>
        <Textarea
          id="allowedDomains"
          name="allowedDomains"
          defaultValue={bot.allowed_domains.join('\n')}
          rows={3}
          placeholder={`vashakompania.ru
shop.vashakompania.ru`}
          required
        />
        <p className="text-sm text-muted-foreground">
          По одному на строку. Где-либо ещё виджет работать откажется, поэтому нужен хотя бы один.
          Поддомен <code className="text-xs">www</code> учитывается автоматически.
        </p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.saved ? (
        <Alert>
          <AlertDescription>
            Сохранено. Чтобы бот знал, что написано на сайте, нажмите «Импортировать с сайта» на
            вкладке «База знаний».
          </AlertDescription>
        </Alert>
      ) : null}

      <SaveButton />
    </form>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Сохраняем…' : 'Сохранить'}
    </Button>
  )
}
