import type { Metadata } from 'next'

import { signUp } from '../actions'
import { AuthFooterLink, CredentialsForm } from '../credentials-form'
import { PLANS } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Create your account',
}

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Free plan, no card. {PLANS.free.limits.answersPerMonth} answers a month.
        </p>
      </div>

      <CredentialsForm
        action={signUp}
        submitLabel="Create account"
        passwordHint="At least 8 characters."
        footer={
          <>
            Already have an account? <AuthFooterLink href="/sign-in">Sign in</AuthFooterLink>
          </>
        }
      />
    </div>
  )
}
