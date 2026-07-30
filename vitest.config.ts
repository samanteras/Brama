import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    // Integration tests need a live Supabase project, so they are opt-in via
    // `test:integration` once credentials exist. E2E belongs to Playwright.
    exclude: [...configDefaults.exclude, 'e2e/**', 'tests/integration/**'],
  },
})
