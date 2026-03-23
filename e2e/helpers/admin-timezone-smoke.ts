import { expect, type Page } from "@playwright/test"
import { registerAndLogin } from "./auth-flow"

export const TARGET_TIMEZONE = "America/Los_Angeles"

export async function bootstrapAdminTimezoneSession(page: Page) {
  await registerAndLogin(page)
  await setUserTimezone(page, TARGET_TIMEZONE)
  await loginAsAdmin(page)
}

export async function setUserTimezone(page: Page, timezone: string) {
  const patchResponse = await page.request.patch("/api/user/profile", {
    data: {
      timezone,
      preferredLanguage: "en",
    },
  })
  expect(patchResponse.ok()).toBeTruthy()

  const profileResponse = await page.request.get("/api/user/profile")
  expect(profileResponse.ok()).toBeTruthy()
  const profileBody = await profileResponse.json()
  expect(profileBody?.timezone).toBe(timezone)
}

export async function loginAsAdmin(page: Page) {
  const password = process.env.ADMIN_PASSWORD ?? "admin123"
  const response = await page.request.post("/api/auth/login", {
    data: {
      password,
      next: "/admin?tab=audit",
    },
  })
  const body = await response.json().catch(() => ({}))
  expect(response.ok(), `admin login failed: ${JSON.stringify(body)}`).toBeTruthy()
}

export async function formatExpected(
  page: Page,
  iso: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions
) {
  return page.evaluate(
    ({ input, tz, fmtOptions }) =>
      new Intl.DateTimeFormat("en-US", { ...fmtOptions, timeZone: tz }).format(new Date(input)),
    { input: iso, tz: timezone, fmtOptions: options }
  )
}
