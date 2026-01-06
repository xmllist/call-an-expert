import { defineConfig } from 'vitest/config'
import path from 'path'

/**
 * Vitest Configuration for Integration Tests
 *
 * Configures Vitest for integration testing API routes and
 * service interactions.
 */

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./__tests__/integration-setup.ts'],
    include: ['**/__tests__/integration/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules',
        'e2e',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
