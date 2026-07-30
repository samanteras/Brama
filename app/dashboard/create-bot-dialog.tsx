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
        New bot
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus />
          New bot
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Name your bot</DialogTitle>
            <DialogDescription>
              Usually your company name — visitors see it at the top of the chat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-6">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={60}
              placeholder="Skyline Renovations"
              autoFocus
            />
          </div>

          {state.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
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
      {pending ? 'Creating…' : 'Create bot'}
    </Button>
  )
}
