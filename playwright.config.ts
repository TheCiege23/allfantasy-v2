import { defineConfig, devices } from "@playwright/test"
import path from "path"

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000"

export default defineConfig({
  testDir: "./__tests__/auth",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    process.env.CI ? ["github"] : ["list"],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results",
})
