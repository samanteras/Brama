'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { safeRedirectPath } from '@/lib/security/redirect'
import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  error?: string
  /** Set when the account was created but needs email confirmation first. */
  notice?: string
}

const credentialsSchema = z.object({
  email: z.email({ error: 'Enter a valid email address.' }),
  password: z
    .string()
    .min(8, { error: 'Use at least 8 characters.' })
    // Supabase rejects anything longer, and a truncated password would fail to
    // sign in later with no obvious reason why.
    .max(72, { error: 'Passwords are limited to 72 characters.' }),
})

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
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
    return { error: 'Those details did not match an account.' }
  }

  redirect(safeRedirectPath(formData.get('next')))
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)

  if (error) {
    return { error: error.message }
  }

  // With email confirmation switched on, Supabase creates the user but no
  // session. Redirecting would bounce them straight back to sign-in with no
  // explanation, so say what happened instead.
  if (!data.session) {
    return { notice: 'Check your inbox to confirm your address, then sign in.' }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  redirect('/')
}
