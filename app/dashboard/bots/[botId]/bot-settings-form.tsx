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
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={bot.name} required maxLength={60} />
        <p className="text-sm text-muted-foreground">Shown at the top of the chat window.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greeting">First message</Label>
        <Textarea
          id="greeting"
          name="greeting"
          defaultValue={bot.greeting}
          maxLength={300}
          rows={3}
          placeholder="Hi — ask me anything about our prices, timelines or terms."
        />
        <p className="text-sm text-muted-foreground">
          What visitors see before they type. Leave empty to open with a blank chat.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accentColor">Accent colour</Label>
        <Input
          id="accentColor"
          name="accentColor"
          type="color"
          defaultValue={bot.accent_color}
          className="h-10 w-16 p-1"
        />
        <p className="text-sm text-muted-foreground">
          Used for the chat button and the visitor&apos;s own messages.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedDomains">Allowed domains</Label>
        <Textarea
          id="allowedDomains"
          name="allowedDomains"
          defaultValue={bot.allowed_domains.join('\n')}
          rows={3}
          placeholder={`yourcompany.com
shop.yourcompany.com`}
          required
        />
        <p className="text-sm text-muted-foreground">
          One per line. The widget refuses to run anywhere else, so at least one is required. Your{' '}
          <code className="text-xs">www</code> subdomain is always included.
        </p>
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.saved ? (
        <Alert>
          <AlertDescription>Saved.</AlertDescription>
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
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  )
}
