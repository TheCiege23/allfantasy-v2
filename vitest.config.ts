import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  oxc: false,
  esbuild: {
    jsx: 'automatic',
    jsxDev: true,
    include: /.[jt]sx?$/,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}', 'lib/**/__tests__/**/*.test.{ts,tsx}'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Vitest does not apply Next's server/client split; stub side-effect-only package.
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})
