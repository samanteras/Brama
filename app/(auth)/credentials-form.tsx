'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import type { AuthState } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CredentialsFormProps = {
  action: (previous: AuthState, formData: FormData) => Promise<AuthState>
  submitLabel: string
  /** Where to go after a successful sign-in, carried through the form. */
  next?: string
  passwordHint?: string
  footer: React.ReactNode
}

/**
 * Shared form for sign-in and sign-up.
 *
 * One component rather than two: the fields, validation surface and error
 * placement are identical, and keeping them together means the two screens
 * cannot drift into looking like different products.
 */
export function CredentialsForm({
  action,
  submitLabel,
  next,
  passwordHint,
  footer,
}: CredentialsFormProps) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {})

  return (
    <form action={formAction} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={submitLabel === 'Create account' ? 'new-password' : 'current-password'}
          required
        />
        {passwordHint ? <p className="text-sm text-muted-foreground">{passwordHint}</p> : null}
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.notice ? (
        <Alert>
          <AlertDescription>{state.notice}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton label={submitLabel} />

      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </form>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Just a moment…' : label}
    </Button>
  )
}

export function AuthFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
