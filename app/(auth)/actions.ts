'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { appUrl } from '@/lib/env'
import { callerIp, checkRateLimit } from '@/lib/security/rate-limit'
import { safeRedirectPath } from '@/lib/security/redirect'
import { createClient } from '@/lib/supabase/server'

/**
 * Caps on how often one address may try.
 *
 * Sign-up is the tighter of the two because a new account carries a free
 * allowance of model calls, so bulk registration is bulk spending of somebody
 * else's money. Five an hour is far beyond what a real person needs and far
 * below what makes farming accounts worthwhile.
 *
 * Sign-in is capped separately against password guessing, generously enough
 * that mistyping a password several times costs nothing.
 */
const SIGN_UP_MAX = 5
const SIGN_UP_WINDOW_SECONDS = 3600

const SIGN_IN_MAX = 20
const SIGN_IN_WINDOW_SECONDS = 600

export type AuthState = {
  error?: string
  /** Set when the account was created but needs email confirmation first. */
  notice?: string
}

const credentialsSchema = z.object({
  email: z.email({ error: 'Введите настоящий адрес почты.' }),
  password: z
    .string()
    .min(8, { error: 'Пароль должен быть не короче 8 символов.' })
    // Supabase rejects anything longer, and a truncated password would fail to
    // sign in later with no obvious reason why.
    .max(72, { error: 'Пароль не может быть длиннее 72 символов.' }),
})

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await callerIp()
  const limit = await checkRateLimit(`signin:${ip}`, SIGN_IN_MAX, SIGN_IN_WINDOW_SECONDS)

  if (!limit.allowed) {
    return { error: 'Слишком много попыток. Подождите несколько минут и попробуйте снова.' }
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    // Deliberately not distinguishing "no such account" from "wrong password":
    // that difference tells an attacker which addresses are registered.
    return { error: 'Не нашлось аккаунта с такой почтой и паролем.' }
  }

  redirect(safeRedirectPath(formData.get('next')))
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  // Checked before anything else: every new account carries a free allowance of
  // model calls, so registering in bulk is spending somebody else's money in
  // bulk. Email confirmation gates the account itself, but each attempt still
  // sends an email, so this also keeps us from being turned into a spam cannon.
  const ip = await callerIp()
  const limit = await checkRateLimit(`signup:${ip}`, SIGN_UP_MAX, SIGN_UP_WINDOW_SECONDS)

  if (!limit.allowed) {
    return { error: 'Отсюда создано слишком много аккаунтов. Попробуйте позже.' }
  }

  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      // The confirmation email links back to whichever deployment the user
      // signed up on — production for real users, localhost in development.
      // Both are on the Supabase redirect allow-list.
      emailRedirectTo: `${appUrl()}/auth/confirm`,
    },
  })

  if (error) {
    // Supabase reports in English; the two failures a real person can act on
    // get proper wording, the rest a safe generic.
    if (error.message.toLowerCase().includes('invalid')) {
      return { error: 'Эта почта выглядит недоставляемой. Проверьте адрес.' }
    }
    if (error.message.toLowerCase().includes('registered')) {
      return { error: 'Такой аккаунт уже есть — попробуйте войти.' }
    }
    return { error: 'Не получилось создать аккаунт. Попробуйте ещё раз.' }
  }

  // With email confirmation switched on, Supabase creates the user but no
  // session. Redirecting would bounce them straight back to sign-in with no
  // explanation, so say what happened instead.
  if (!data.session) {
    return { notice: 'Проверьте почту и подтвердите адрес по ссылке из письма, затем войдите.' }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect('/')
}
