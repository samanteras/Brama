import type { Metadata } from 'next'

import { signIn } from '../actions'
import { AuthFooterLink, CredentialsForm } from '../credentials-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { APP_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function SignInPage(props: PageProps<'/sign-in'>) {
  const { next, error } = await props.searchParams

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your {APP_NAME} account.</p>
      </div>

      {error === 'confirmation' ? (
        <Alert variant="destructive">
          <AlertDescription>
            That confirmation link is invalid or has expired. Sign up again with the same email to
            receive a fresh one.
          </AlertDescription>
        </Alert>
      ) : null}

      <CredentialsForm
        action={signIn}
        submitLabel="Sign in"
        next={typeof next === 'string' ? next : undefined}
        footer={
          <>
            No account yet? <AuthFooterLink href="/sign-up">Create one</AuthFooterLink>
          </>
        }
      />
    </div>
  )
}
