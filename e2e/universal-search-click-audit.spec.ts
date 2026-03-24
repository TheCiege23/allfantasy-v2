import { expect, test } from "@playwright/test"
import { registerAndLogin } from "./helpers/auth-flow"

test.describe("@db @search universal search click audit", () => {
  test.describe.configure({ timeout: 240_000, mode: "serial" })

  test("audits universal search and quick actions interactions", async ({ page }) => {
    await registerAndLogin(page)

    const profileState: Record<string, unknown> = {
      userId: "search-audit-user",
      username: "searchaudit",
      email: "search.audit@example.com",
      displayName: "Search Audit",
      profileImageUrl: null,
      avatarPreset: "crest",
      preferredLanguage: "en",
      timezone: "America/New_York",
      themePreference: "dark",
      phone: null,
      phoneVerifiedAt: null,
      emailVerifiedAt: null,
      ageConfirmedAt: null,
      verificationMethod: "EMAIL",
      hasPassword: true,
      profileComplete: true,
      sleeperUsername: null,
      sleeperLinkedAt: null,
      bio: "Search audit profile",
      preferredSports: ["NFL", "NBA", "MLB", "NHL", "NCAAB", "NCAAF", "SOCCER"],
      notificationPreferences: null,
      onboardingStep: null,
      onboardingCompletedAt: null,
      settings: {
        legalAcceptanceState: {
          ageVerified: true,
          disclaimerAccepted: true,
          termsAccepted: true,
          acceptedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    }

    let leagueSearchCalls = 0
    let playerSearchCalls = 0
    let lastLeagueSearchUrl = ""
    let lastPlayerSearchUrl = ""

    await page.route("**/api/user/settings", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile: profileState,
          settings: {
            legalAcceptanceState: (profileState.settings as { legalAcceptanceState: Record<string, unknown> })
              .legalAcceptanceState,
          },
        }),
      })
    })

    await page.route("**/api/user/profile", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(profileState),
      })
    })

    await page.route("**/api/shared/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ notifications: [] }),
      })
    })

    await page.route("**/api/shared/notifications/read-all", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/shared/notifications/*/read", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route("**/api/shared/wallet", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          wallet: {
            currency: "USD",
            balance: 10,
            pendingBalance: 0,
            potentialWinnings: 30,
            totalDeposited: 20,
            totalEntryFees: 10,
            totalWithdrawn: 0,
          },
        }),
      })
    })

    await page.route("**/api/league/search?**", async (route) => {
      leagueSearchCalls += 1
      lastLeagueSearchUrl = route.request().url()
      const url = new URL(route.request().url())
      const query = (url.searchParams.get("q") || "").toLowerCase()
      const sport = (url.searchParams.get("sport") || "").toUpperCase()
      const hasResults = query.includes("soc")
      const hits = hasResults
        ? [
            {
              id: "soccer-league-1",
              name: "Soccer Pro League",
              sport: sport || "SOCCER",
              leagueVariant: "STANDARD",
              leagueSize: 12,
              isDynasty: false,
            },
          ]
        : []
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hits, total: hits.length, limit: 6, offset: 0 }),
      })
    })

    await page.route("**/api/players/search?**", async (route) => {
      playerSearchCalls += 1
      lastPlayerSearchUrl = route.request().url()
      const url = new URL(route.request().url())
      const query = (url.searchParams.get("q") || "").toLowerCase()
      const sport = (url.searchParams.get("sport") || "").toUpperCase()
      const hasResults = query.includes("soc")
      const players = hasResults
        ? [
            {
              id: "player-42",
              name: "Alex Striker",
              position: "FWD",
              team: "LIV",
              sport: sport || "SOCCER",
            },
          ]
        : []
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(players),
      })
    })

    await page.goto("/settings?tab=profile", { waitUntil: "domcontentloaded" })

    const getShellHeader = () =>
      page
        .getByRole("link", { name: "AllFantasy.ai" })
        .first()
        .locator("xpath=ancestor::header[1]")
    let header = getShellHeader()
    const overlay = page.getByTestId("search-overlay-dialog")
    const waitForSettingsReady = async () => {
      await expect(page.getByText("Loading settings...")).toHaveCount(0, { timeout: 20_000 })
    }
    const openSearchOverlay = async () => {
      await waitForSettingsReady()
      await page.keyboard.press("Control+K")
      if (!(await overlay.isVisible())) {
        header = getShellHeader()
        await header.getByRole("button", { name: "Search" }).click()
      }
      await expect(overlay).toBeVisible({ timeout: 15_000 })
    }
    await openSearchOverlay()
    const input = overlay.getByRole("searchbox", { name: "Universal search input" })
    await expect(input).toBeFocused()

    // Focus + submit + live search grouping
    await input.fill("soc")
    await expect.poll(() => leagueSearchCalls).toBeGreaterThan(0)
    await expect.poll(() => playerSearchCalls).toBeGreaterThan(0)
    await expect(overlay.locator('[data-search-result="league-soccer-league-1"]')).toBeVisible()
    await expect(overlay.locator('[data-search-result="player-player-42"]')).toBeVisible()

    // Category tab filter
    await overlay.locator('[data-search-category="league"]').click()
    await expect(overlay.locator('[data-search-result="league-soccer-league-1"]')).toBeVisible()
    await expect(overlay.locator('[data-search-result="player-player-42"]')).toHaveCount(0)

    // Sport filter
    await overlay.locator('[data-search-sport="SOCCER"]').click()
    await expect.poll(() => lastLeagueSearchUrl.includes("sport=SOCCER")).toBe(true)
    await expect.poll(() => lastPlayerSearchUrl.includes("sport=SOCCER")).toBe(true)

    // Search result routing
    await overlay.locator('[data-search-result="league-soccer-league-1"]').click()
    await expect(page).toHaveURL(/\/leagues\/soccer-league-1/, { timeout: 20_000 })

    // Keyboard shortcut open + clear input button
    await page.goto("/settings?tab=profile", { waitUntil: "domcontentloaded" })
    await waitForSettingsReady()
    await openSearchOverlay()
    await input.fill("trade")
    await expect(overlay.getByRole("button", { name: "Clear search" })).toBeVisible()
    await overlay.getByRole("button", { name: "Clear search" }).click()
    await expect(input).toHaveValue("")

    // Quick action click path
    await overlay.locator('[data-search-category="quick_action"]').click()
    await overlay.locator('[data-search-quick-action="trade_analyzer"]').click()
    await expect(page).toHaveURL(/\/trade-evaluator/, { timeout: 20_000 })

    // Search submit (enter) routing
    await page.goto("/settings?tab=profile", { waitUntil: "domcontentloaded" })
    await waitForSettingsReady()
    await openSearchOverlay()
    await overlay.locator('[data-search-category="page"]').click()
    await input.fill("profile")
    await input.press("Enter")
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 })

    // Empty state interaction + clear action
    await page.goto("/settings?tab=profile", { waitUntil: "domcontentloaded" })
    await waitForSettingsReady()
    await openSearchOverlay()
    await input.fill("zzz-no-search-hit")
    await expect(overlay.getByText(/No results for/i)).toBeVisible()
    await overlay.getByRole("button", { name: "Clear search" }).last().click()
    await expect(input).toHaveValue("")

    // Close search overlay paths (backdrop + Escape)
    await page.getByTestId("search-overlay-backdrop").click({ position: { x: 8, y: 8 } })
    await expect(overlay).toHaveCount(0)
    await openSearchOverlay()
    await page.keyboard.press("Escape")
    await expect(overlay).toHaveCount(0)

    // Mobile open/close + drawer search entry
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/settings?tab=profile", { waitUntil: "domcontentloaded" })
    await waitForSettingsReady()
    header = getShellHeader()
    await header.getByRole("button", { name: "Open menu" }).click()
    const drawer = page.getByTestId("mobile-nav-drawer")
    await expect(drawer).toBeVisible()
    await drawer.getByRole("button", { name: "Search" }).click()
    await expect(page.getByTestId("mobile-nav-drawer")).toHaveCount(0)
    await expect(page.getByTestId("search-overlay-dialog")).toBeVisible()
    await page.getByRole("button", { name: "Close" }).click()
    await expect(page.getByTestId("search-overlay-dialog")).toHaveCount(0)
  })
})
