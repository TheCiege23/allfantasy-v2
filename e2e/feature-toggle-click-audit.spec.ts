import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

type ConfigSnapshot = {
  features: Record<string, boolean>
  sports: string[]
  raw: Record<string, string>
}

test.describe("@admin feature toggle click audit", () => {
  test("feature toggle panel updates backend config payloads", async ({ page }) => {
    const patchBodies: Array<Record<string, unknown>> = []

    const snapshot: ConfigSnapshot = {
      features: {
        feature_ai_assistant: true,
        feature_mock_drafts: true,
        feature_legacy_mode: true,
        feature_bracket_challenges: true,
        feature_tool_waiver_ai: true,
        feature_tool_trade_analyzer: true,
        feature_tool_rankings: true,
        feature_experimental_legacy_import: false,
        feature_experimental_dynasty: true,
      },
      sports: ["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"],
      raw: {},
    }

    await page.route("**/api/admin/config", async (route) => {
      const method = route.request().method()
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(snapshot),
        })
        return
      }
      if (method === "PATCH") {
        const body = (route.request().postDataJSON() || {}) as Record<string, unknown>
        patchBodies.push(body)
        if (typeof body.key === "string" && typeof body.value === "boolean") {
          snapshot.features[body.key] = body.value
        } else if (Array.isArray(body.sports)) {
          snapshot.sports = body.sports.map((s) => String(s))
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(snapshot),
        })
        return
      }
      await route.fulfill({ status: 405, body: "Method not allowed" })
    })

    await page.goto("/e2e/feature-toggles", { waitUntil: "domcontentloaded" })
    const openButton = page.getByTestId("feature-toggles-open")
    const refreshButton = page.getByTestId("admin-feature-refresh")
    for (let i = 0; i < 20; i += 1) {
      if (await refreshButton.isVisible().catch(() => false)) break
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click().catch(() => {})
      }
      await page.waitForTimeout(250)
    }
    await expect(refreshButton).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("admin-feature-section-ai-features")).toBeVisible()
    await expect(page.getByTestId("admin-feature-section-tools")).toBeVisible()
    await expect(page.getByTestId("admin-feature-section-platform")).toBeVisible()
    await expect(page.getByTestId("admin-feature-section-experimental")).toBeVisible()
    await expect(page.getByTestId("admin-feature-section-sports")).toBeVisible()

    await page.getByTestId("admin-feature-refresh").click()

    const aiToggle = page.getByTestId("admin-feature-toggle-feature_ai_assistant")
    await expect(aiToggle).toHaveAttribute("aria-checked", "true")
    await aiToggle.click()
    await expect.poll(() => patchBodies.some((b) => b.key === "feature_ai_assistant" && b.value === false)).toBe(true)
    await expect(aiToggle).toHaveAttribute("aria-checked", "false")

    const mockDraftToggle = page.getByTestId("admin-feature-toggle-feature_mock_drafts")
    await mockDraftToggle.click()
    await expect.poll(() => patchBodies.some((b) => b.key === "feature_mock_drafts" && b.value === false)).toBe(true)
    await expect(mockDraftToggle).toHaveAttribute("aria-checked", "false")

    const experimentalToggle = page.getByTestId("admin-feature-toggle-feature_experimental_legacy_import")
    await expect(experimentalToggle).toHaveAttribute("aria-checked", "false")
    await experimentalToggle.click()
    await expect.poll(() =>
      patchBodies.some((b) => b.key === "feature_experimental_legacy_import" && b.value === true)
    ).toBe(true)
    await expect(experimentalToggle).toHaveAttribute("aria-checked", "true")

    const soccerToggle = page.getByTestId("admin-feature-sport-SOCCER")
    await expect(soccerToggle).toBeChecked()
    await soccerToggle.uncheck()
    await page.getByTestId("admin-feature-sports-save").click()
    await expect.poll(() =>
      patchBodies.some((b) => Array.isArray(b.sports) && !(b.sports as unknown[]).includes("SOCCER"))
    ).toBe(true)
    await expect(soccerToggle).not.toBeChecked()

    await page.getByTestId("admin-feature-sports-select-all").click()
    await page.getByTestId("admin-feature-sports-save").click()
    await expect.poll(() =>
      patchBodies.some(
        (b) =>
          Array.isArray(b.sports) &&
          ["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"].every((s) =>
            (b.sports as unknown[]).includes(s)
          )
      )
    ).toBe(true)
  })

  test("admin config API is permission-gated", async ({ page }) => {
    const res = await page.request.get("/api/admin/config")
    expect(res.status()).toBe(401)
  })

  test("legacy mode behavior updates immediately from config", async ({ page }) => {
    await page.route("**/api/config/features", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          features: { feature_legacy_mode: false },
          sports: ["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"],
        }),
      })
    })

    await page.goto("/af-legacy", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Legacy mode is temporarily disabled")).toBeVisible({ timeout: 20_000 })
  })
})
