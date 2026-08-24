'use client'

import { Plus } from 'lucide-react'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { createBot, type BotFormState } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CreateBotDialogProps = {
  /** False when the plan's bot allowance is already spent. */
  canCreate: boolean
  limitMessage: string
  variant?: 'default' | 'outline'
}

export function CreateBotDialog({ canCreate, limitMessage, variant = 'default' }: CreateBotDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<BotFormState, FormData>(createBot, {})

  if (!canCreate) {
    return (
      <Button variant="outline" disabled title={limitMessage}>
        <Plus />
        Новый бот
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus />
          Новый бот
        </Button>
      </DialogTrigger>

      {/* The dialog mounts in a portal on <body>, outside the dashboard's
          `dark` wrapper — without its own `dark` it would pop up white. */}
      <DialogContent className="dark text-foreground">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Назовите бота</DialogTitle>
            <DialogDescription>
              Обычно это название компании — посетители видят его в шапке чата.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={60}
                placeholder="СтройПрофи"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Ваш сайт</Label>
              <Input id="domain" name="domain" required placeholder="vashakompania.ru" />
              {/* Asked for up front because the widget will not run anywhere
                  else. Leaving it for later means installing the snippet and
                  seeing nothing happen, with no clue why. */}
              <p className="text-sm text-muted-foreground">
                Виджет работает только на этом домене. Другие можно добавить позже.
              </p>
            </div>
          </div>

          {state.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Создаём…' : 'Создать бота'}
    </Button>
  )
}
