import type { Metadata } from 'next'

import { signIn } from '../actions'
import { AuthFooterLink, CredentialsForm } from '../credentials-form'
import { APP_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function SignInPage(props: PageProps<'/sign-in'>) {
  const { next } = await props.searchParams

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your {APP_NAME} account.</p>
      </div>

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
