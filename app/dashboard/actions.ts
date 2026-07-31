'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { botAllowanceMessage } from '@/lib/plan-copy'
import { getPlan, isWithinLimit, toPlanId } from '@/lib/plans'
import { normalizeDomain } from '@/lib/security/origin'
import { createClient } from '@/lib/supabase/server'

export type BotFormState = {
  error?: string
  /** Shown after a successful save, then cleared by the next interaction. */
  saved?: boolean
}

const nameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Give the bot a name.' })
  .max(60, { error: 'Keep the name under 60 characters.' })

const greetingSchema = z
  .string()
  .trim()
  .max(300, { error: 'Keep the greeting under 300 characters.' })

const accentColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, { error: 'Pick a colour in #rrggbb form.' })

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in')

  return { supabase, user }
}

export async function createBot(_previous: BotFormState, formData: FormData): Promise<BotFormState> {
  const parsed = nameSchema.safeParse(formData.get('name'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { supabase, user } = await requireUser()

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    // Row level security scopes this to the caller, so it counts their bots only.
    supabase.from('bots').select('id', { count: 'exact', head: true }),
  ])

  const plan = getPlan(toPlanId(profile?.plan))

  // Two tabs submitting at the same instant could both pass this check and land
  // one bot over the limit. Left as-is deliberately: unlike the answer quota,
  // which is hit concurrently by real visitors and costs money per call, this is
  // a deliberate human action, the overshoot is one row, and it is trivially
  // reversible. Guarding it would mean pushing plan limits into the database.
  if (!isWithinLimit(count ?? 0, plan.limits.bots)) {
    return { error: `${botAllowanceMessage(plan)} Upgrade to add more.` }
  }

  const { data, error } = await supabase
    .from('bots')
    .insert({ owner_id: user.id, name: parsed.data })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Could not create the bot. Try again.' }
  }

  revalidatePath('/dashboard')
  redirect(`/dashboard/bots/${data.id}`)
}

/**
 * Parses the domain allow-list textarea, one entry per line.
 *
 * Invalid entries are reported rather than silently dropped: an entry that
 * matches nothing would leave the owner believing their widget is locked down
 * when it is not.
 */
function parseDomains(raw: FormDataEntryValue | null): { domains: string[] } | { error: string } {
  const lines = String(raw ?? '')
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line !== '')

  const domains: string[] = []

  for (const line of lines) {
    const normalized = normalizeDomain(line)

    if (normalized === null) {
      return { error: `"${line}" is not a domain we can match. Use a form like example.com.` }
    }

    if (!domains.includes(normalized)) domains.push(normalized)
  }

  return { domains }
}

export async function updateBot(_previous: BotFormState, formData: FormData): Promise<BotFormState> {
  const botId = String(formData.get('botId') ?? '')
  if (botId === '') return { error: 'Missing bot.' }

  const name = nameSchema.safeParse(formData.get('name'))
  if (!name.success) return { error: name.error.issues[0].message }

  const greeting = greetingSchema.safeParse(formData.get('greeting'))
  if (!greeting.success) return { error: greeting.error.issues[0].message }

  const accentColor = accentColorSchema.safeParse(formData.get('accentColor'))
  if (!accentColor.success) return { error: accentColor.error.issues[0].message }

  const domains = parseDomains(formData.get('allowedDomains'))
  if ('error' in domains) return { error: domains.error }

  const { supabase } = await requireUser()

  // No ownership check here: the update policy already restricts this to bots
  // the caller owns, so a foreign id simply matches no row.
  const { error } = await supabase
    .from('bots')
    .update({
      name: name.data,
      greeting: greeting.data,
      accent_color: accentColor.data,
      allowed_domains: domains.domains,
    })
    .eq('id', botId)

  if (error) return { error: 'Could not save your changes. Try again.' }

  revalidatePath(`/dashboard/bots/${botId}`)
  revalidatePath('/dashboard')

  return { saved: true }
}

export async function deleteDocument(formData: FormData) {
  const documentId = String(formData.get('documentId') ?? '')
  const botId = String(formData.get('botId') ?? '')
  if (documentId === '') return

  const { supabase } = await requireUser()

  // Read the storage path before deleting the row, so the file can be removed
  // too. The delete policy scopes this to documents of bots the caller owns.
  const { data: document } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle()

  const { error } = await supabase.from('documents').delete().eq('id', documentId)

  // Only remove the file once the row is gone. The other order would risk a
  // document that still exists but can never be re-indexed.
  if (!error && document?.storage_path) {
    await supabase.storage.from('documents').remove([document.storage_path])
  }

  revalidatePath(`/dashboard/bots/${botId}`)
}

export async function deleteBot(formData: FormData) {
  const botId = String(formData.get('botId') ?? '')
  if (botId === '') return

  const { supabase } = await requireUser()

  await supabase.from('bots').delete().eq('id', botId)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
