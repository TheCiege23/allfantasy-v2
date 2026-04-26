import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PLAYWRIGHT_PORT}`;

/** Same origin/port Playwright uses in `use.baseURL` — must match `next dev -p PLAYWRIGHT_PORT`. */
const PLAYWRIGHT_ORIGIN = PLAYWRIGHT_BASE_URL.replace(/\/$/, '');

/**
 * Do not probe `/` alone: Next can accept connections while core client chunks
 * still 404 until compilation settles. `webServer.url` must be a string (not
 * an array — Playwright joins arrays into one invalid URL).
 *
 * `webpack.js` is a small, stable dev entry chunk; once it returns 200, the
 * static chunk pipeline is live. Deeper failures (e.g. `main-app.js`) are
 * caught by `attachDraftHarnessDiagnostics` in draft harness tests.
 */
const WEB_SERVER_READY_URL = `${PLAYWRIGHT_ORIGIN}/_next/static/chunks/webpack.js`;

export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: PLAYWRIGHT_BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run local dev server before tests (or reuse if already running). */
  webServer: {
    command: `node scripts/playwright-dev-server.cjs --port ${PLAYWRIGHT_PORT}`,
    url: WEB_SERVER_READY_URL,
    reuseExistingServer: process.env.CI ? false : true,
    timeout: 480_000,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        process.env.POSTGRES_PRISMA_URL ??
        process.env.POSTGRES_URL ??
        process.env.DIRECT_URL ??
        process.env.POSTGRES_URL_NON_POOLING ??
        '',
      PLAYWRIGHT_E2E: '1',
    },
  },
});
