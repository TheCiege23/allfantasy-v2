import { expect, test } from "@playwright/test"
import {
  TARGET_TIMEZONE,
  bootstrapAdminTimezoneSession,
  formatExpected,
} from "./helpers/admin-timezone-smoke"

test("core admin pages render dates in user timezone", async ({ page }) => {
  test.setTimeout(240_000)
  await bootstrapAdminTimezoneSession(page)

  await page.goto("/admin?tab=audit")
  await expect(page.getByRole("heading", { name: "Audit log" }).first()).toBeVisible()

  const auditResponse = await page.request.get("/api/admin/audit?limit=100")
  expect(auditResponse.ok()).toBeTruthy()

  const auditJson = await auditResponse.json()
  const firstAudit = Array.isArray(auditJson?.data) ? auditJson.data[0] : null

  if (firstAudit?.createdAt) {
    const expectedAuditTime = await formatExpected(page, firstAudit.createdAt, TARGET_TIMEZONE, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    await expect(page.getByText(expectedAuditTime).first()).toBeVisible()
  } else {
    await expect(page.getByText(/No audit entries yet/i)).toBeVisible()
  }

  await page.goto("/admin?tab=signups")
  await expect(page.getByRole("heading", { name: "Recent Signups" }).first()).toBeVisible()

  const signupsStatsResponse = await page.request.get("/api/admin/signups/stats")
  expect(signupsStatsResponse.ok()).toBeTruthy()
  const signupsStatsJson = await signupsStatsResponse.json()
  const firstSignup = Array.isArray(signupsStatsJson?.recentSignups)
    ? signupsStatsJson.recentSignups[0]
    : null

  if (firstSignup?.createdAt) {
    const expectedSignupDateTime = await formatExpected(
      page,
      firstSignup.createdAt,
      TARGET_TIMEZONE,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    )
    await expect(page.getByText(expectedSignupDateTime).first()).toBeVisible()
  } else {
    await expect(page.getByText(/No signups in the last 48 hours/i)).toBeVisible()
  }
})
