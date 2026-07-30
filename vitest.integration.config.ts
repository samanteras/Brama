import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Integration tests, run separately from the unit suite.
 *
 * These talk to a real Supabase project, so they are deliberately kept out of
 * `npm test` and out of CI: they need credentials, they are slow, and they
 * write rows. Run them with `npm run test:integration`.
 *
 * They create and delete their own throwaway users, and deleting a user
 * cascades to everything they own, so a run leaves nothing behind.
 */
export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Real network round-trips; the unit-test default is far too tight.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Shared Postgres rows mean parallel files would interfere with each other.
    fileParallelism: false,
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
