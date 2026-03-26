import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 120_000 })

test.describe("@admin social publish status click audit", () => {
  test("audits latest-log drill-down view/hide and refresh wiring", async ({ page }) => {
    let socialHealthRequests = 0
    let systemHealthRequests = 0

    await page.route("**/api/admin/system/health", async (route) => {
      systemHealthRequests += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          api: {
            sleeper: { status: "active", latency: 120, lastCheck: new Date().toISOString() },
            grok: { status: "active", latency: 230, lastCheck: new Date().toISOString() },
          },
          database: "healthy",
          databaseLatencyMs: 22,
          workerQueue: {
            status: "healthy",
            queued: 2,
            running: 1,
            failedLast24h: 0,
            lastCheck: new Date().toISOString(),
          },
          sportsAlerts: {
            windowHours: 24,
            totalAlerts: 12,
            sampledAlerts: 11,
            p50Ms: 84,
            p95Ms: 180,
            p99Ms: 240,
            maxMs: 380,
            lastAlertAt: new Date().toISOString(),
            byType: [
              { alertType: "injury_alert", totalAlerts: 4, sampledAlerts: 4, p50Ms: 75, p95Ms: 160, maxMs: 320 },
              {
                alertType: "performance_alert",
                totalAlerts: 5,
                sampledAlerts: 4,
                p50Ms: 86,
                p95Ms: 188,
                maxMs: 360,
              },
              { alertType: "lineup_alert", totalAlerts: 3, sampledAlerts: 3, p50Ms: 95, p95Ms: 200, maxMs: 380 },
            ],
          },
        }),
      })
    })

    await page.route("**/api/admin/system/social-publish-health", async (route) => {
      socialHealthRequests += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          generatedAt: "2026-03-25T18:00:00.000Z",
          platforms: [
            {
              platform: "x",
              providerId: "x",
              adapterAvailable: true,
              configured: true,
              requiredEnvKeys: ["X_PUBLISH_ACCESS_TOKEN"],
              connectedTargets: 4,
              autoPostEnabledTargets: 3,
              pendingCount: 1,
              successLast24h: 17,
              failedLast24h: 2,
              providerUnavailableLast24h: 0,
              lastStatus: "failed",
              lastPublishAt: "2026-03-25T17:58:00.000Z",
              latestResponseMetadata: {
                requestId: "req_x_1",
                error: "rate_limit",
                statusCode: 429,
              },
              latestErrorSummary: "rate_limit",
            },
            {
              platform: "instagram",
              providerId: "instagram",
              adapterAvailable: true,
              configured: true,
              requiredEnvKeys: ["INSTAGRAM_PUBLISH_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ACCOUNT_ID"],
              connectedTargets: 2,
              autoPostEnabledTargets: 1,
              pendingCount: 0,
              successLast24h: 8,
              failedLast24h: 0,
              providerUnavailableLast24h: 0,
              lastStatus: "success",
              lastPublishAt: "2026-03-25T17:42:00.000Z",
              latestResponseMetadata: {
                id: "17890123456789",
                containerId: "179876543210",
              },
              latestErrorSummary: null,
            },
          ],
        }),
      })
    })

    await page.goto("/e2e/admin-dashboard?tab=system", { waitUntil: "domcontentloaded" })
    const openButton = page.getByTestId("admin-open-dashboard-button")
    const systemRefresh = page.getByTestId("admin-system-refresh")
    for (let i = 0; i < 20; i += 1) {
      if (await systemRefresh.isVisible().catch(() => false)) break
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click().catch(() => {})
      }
      await page.waitForTimeout(300)
    }
    if (!(await systemRefresh.isVisible().catch(() => false))) {
      await page.reload({ waitUntil: "domcontentloaded" })
      for (let i = 0; i < 12; i += 1) {
        if (await systemRefresh.isVisible().catch(() => false)) break
        if (await openButton.isVisible().catch(() => false)) {
          await openButton.click().catch(() => {})
        }
        await page.waitForTimeout(300)
      }
    }

    await expect(systemRefresh).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("admin-social-publish-status-panel")).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => socialHealthRequests).toBeGreaterThan(0)
    expect(systemHealthRequests).toBeGreaterThan(0)

    const xPayload = page.getByTestId("admin-social-publish-log-payload-x")
    await expect(xPayload).toHaveCount(0)

    await page.getByTestId("admin-social-publish-log-toggle-x").click()
    await expect(xPayload).toBeVisible()
    await expect(xPayload).toContainText('"requestId": "req_x_1"')
    await expect(xPayload).toContainText('"error": "rate_limit"')
    await expect(page.getByText("Error summary: rate_limit")).toBeVisible()

    await page.getByTestId("admin-social-publish-log-toggle-x").click()
    await expect(xPayload).toHaveCount(0)

    const instagramPayload = page.getByTestId("admin-social-publish-log-payload-instagram")
    await expect(instagramPayload).toHaveCount(0)
    await page.getByTestId("admin-social-publish-log-toggle-instagram").click()
    await expect(instagramPayload).toBeVisible()
    await expect(instagramPayload).toContainText('"id": "17890123456789"')

    await page.getByTestId("admin-social-publish-status-panel").getByRole("button", { name: "Refresh" }).click()
    await expect.poll(() => socialHealthRequests).toBeGreaterThan(1)
  })
})
