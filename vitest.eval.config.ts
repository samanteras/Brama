import { fileURLToPath } from 'node:url'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Runner for the evaluation set.
 *
 * Uses Vitest purely as a harness — it already resolves the app's imports and
 * loads the environment. The eval itself is not a test: it makes live model
 * calls and produces numbers to read, not a pass/fail gate.
 */
export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['eval/**/*.eval.ts'],
    // Roughly thirty questions, each a retrieval plus one or two model turns.
    testTimeout: 600_000,
    hookTimeout: 600_000,
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
