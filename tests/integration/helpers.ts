import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * Helpers for tests that talk to a real Supabase project.
 *
 * Every test creates its own users and deletes them afterwards. Deleting an
 * auth user cascades through profiles and everything hanging off it, so a run
 * leaves no residue even if assertions fail.
 */

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `${name} is not set. Integration tests need a Supabase project; copy .env.example to .env.local and fill it in.`,
    )
  }

  return value
}

export const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

/** Bypasses row level security. Used to arrange state and to verify it. */
export function adminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** A client subject to row level security, signed in as nobody. */
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type TestUser = {
  id: string
  email: string
  password: string
  /** A client authenticated as this user, so RLS applies to its queries. */
  client: SupabaseClient<Database>
}

let sequence = 0

/**
 * Creates a confirmed user and returns a client signed in as them.
 *
 * Emails are unique per process and per call so parallel or repeated runs
 * cannot collide.
 */
export async function createTestUser(label: string): Promise<TestUser> {
  const admin = adminClient()
  sequence += 1

  const email = `foreman-test-${label}-${process.pid}-${sequence}-${Date.now()}@example.com`
  const password = 'integration-test-password'

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(`Could not create test user: ${error?.message ?? 'no user returned'}`)
  }

  const client = anonClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })

  if (signInError) {
    throw new Error(`Could not sign in test user: ${signInError.message}`)
  }

  return { id: data.user.id, email, password, client }
}

export async function deleteTestUsers(users: Array<{ id: string }>): Promise<void> {
  const admin = adminClient()

  for (const user of users) {
    await admin.auth.admin.deleteUser(user.id)
  }
}
