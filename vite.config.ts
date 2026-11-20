/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Screen tests render whole routes (shells, tabs, queries). On a loaded machine or CI runner a full run can push
    // a single test past Vitest's 5 s default, so allow 15 s per test; a real hang still fails.
    testTimeout: 15_000,
    // Browser tests in tests/e2e run with Playwright (npm run test:e2e), not Vitest.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
