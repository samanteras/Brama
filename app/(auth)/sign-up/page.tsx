import type { Metadata } from 'next'

import { signUp } from '../actions'
import { AuthFooterLink, CredentialsForm } from '../credentials-form'
import { PLANS } from '@/lib/plans'

export const metadata: Metadata = {
  title: 'Регистрация',
}

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Создайте аккаунт</h1>
        <p className="text-sm text-muted-foreground">
          Тариф Free, без карты. {PLANS.free.limits.answersPerMonth} ответов в месяц.
        </p>
      </div>

      <CredentialsForm
        action={signUp}
        intent="sign-up"
        submitLabel="Создать аккаунт"
        passwordHint="Не меньше 8 символов."
        footer={
          <>
            Уже есть аккаунт? <AuthFooterLink href="/sign-in">Войти</AuthFooterLink>
          </>
        }
      />
    </div>
  )
}
