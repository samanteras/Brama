/**
 * Server-only environment variables.
 *
 * The `server-only` import is the point of this file: if any client component
 * ever imports it, even transitively, the build fails. Without that guard a
 * single stray import would bundle the service role key — which bypasses row
 * level security entirely — into JavaScript served to every visitor.
 */

import 'server-only'

import { z } from 'zod'

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, { error: 'SUPABASE_SERVICE_ROLE_KEY is required for server-side database access' }),
  OPENAI_API_KEY: z.string().min(1, { error: 'OPENAI_API_KEY is required' }),

  // Reranking stays behind a seam and is only enabled if the eval run shows it
  // helps, so its absence is normal rather than an error.
  COHERE_API_KEY: z.string().optional(),
})

export const serverEnv = serverSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
})
