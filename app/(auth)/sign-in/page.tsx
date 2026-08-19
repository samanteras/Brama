import type { Metadata } from 'next'

import { signIn } from '../actions'
import { AuthFooterLink, CredentialsForm } from '../credentials-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { APP_NAME } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Вход',
}

export default async function SignInPage(props: PageProps<'/sign-in'>) {
  const { next, error } = await props.searchParams

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">С возвращением</h1>
        <p className="text-sm text-muted-foreground">Войдите в свой аккаунт {APP_NAME}.</p>
      </div>

      {error === 'confirmation' ? (
        <Alert variant="destructive">
          <AlertDescription>
            Ссылка подтверждения не сработала или устарела. Зарегистрируйтесь ещё раз с той же
            почтой — придёт новое письмо.
          </AlertDescription>
        </Alert>
      ) : null}

      <CredentialsForm
        action={signIn}
        intent="sign-in"
        submitLabel="Войти"
        next={typeof next === 'string' ? next : undefined}
        footer={
          <>
            Ещё нет аккаунта? <AuthFooterLink href="/sign-up">Создать</AuthFooterLink>
          </>
        }
      />
    </div>
  )
}
