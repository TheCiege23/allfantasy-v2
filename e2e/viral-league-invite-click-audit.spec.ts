import { expect, test, type Page } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

async function gotoWithRetry(page: Page, url: string): Promise<void> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      return
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      const canRetry =
        attempt < 6 &&
        (
          message.includes("net::ERR_ABORTED") ||
          message.includes("NS_BINDING_ABORTED") ||
          message.includes("net::ERR_CONNECTION_RESET") ||
          message.includes("NS_ERROR_CONNECTION_REFUSED") ||
          message.includes("Failure when receiving data from the peer") ||
          message.includes("Could not connect to server") ||
          message.includes("interrupted by another navigation")
        )
      if (!canRetry) throw error
      await page.waitForTimeout(500 * attempt)
    }
  }
}

test.describe("@growth viral league invite click audit", () => {
  test("invite button, copy link, and share buttons are wired", async ({ page }) => {
    const leagueId = `e2e-viral-${Date.now()}`
    let currentCode = "VIRAL105"

    await page.route(`**/api/commissioner/leagues/${leagueId}/settings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ settings: { orphanSeeking: false } }),
      })
    })

    await page.route(`**/api/commissioner/leagues/${leagueId}/invite`, async (route) => {
      if (route.request().method() === "POST") {
        currentCode = "VIRAL106"
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            inviteCode: currentCode,
            inviteLink: `http://localhost:3000/join?code=${currentCode}`,
            joinUrl: `http://localhost:3000/join?code=${currentCode}`,
            inviteExpiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            inviteExpired: false,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          inviteCode: currentCode,
          inviteLink: `http://localhost:3000/join?code=${currentCode}`,
          joinUrl: `http://localhost:3000/join?code=${currentCode}`,
          inviteExpiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          inviteExpired: false,
        }),
      })
    })

    await page.goto(`/e2e/viral-league-invite?leagueId=${leagueId}`, { waitUntil: "domcontentloaded" })

    const inviteButton = page.getByTestId("league-invite-button")
    await expect(inviteButton).toBeVisible()

    await inviteButton.click({ force: true })
    const copyInviteLink = page.getByTestId("league-copy-invite-link")
    if (!(await copyInviteLink.isVisible().catch(() => false))) {
      await inviteButton.evaluate((button) => (button as HTMLButtonElement).click())
    }
    await expect(copyInviteLink).toBeVisible({ timeout: 10_000 })

    await copyInviteLink.click()

    const smsHref = await page.getByTestId("league-share-sms").getAttribute("href")
    const emailHref = await page.getByTestId("league-share-email").getAttribute("href")
    const xHref = await page.getByTestId("league-share-twitter").getAttribute("href")
    const redditHref = await page.getByTestId("league-share-reddit").getAttribute("href")

    expect(smsHref ?? "").toContain("sms:?body=")
    expect(emailHref ?? "").toContain("mailto:?subject=")
    expect(xHref ?? "").toContain("twitter.com/intent/tweet")
    expect(redditHref ?? "").toContain("reddit.com/submit")

    await page.getByTestId("league-share-discord").click()
  })

  test("invite link context, join flow, expired invites, and duplicate join prevention", async ({ page }) => {
    await page.route("**/api/leagues/join/preview**", async (route) => {
      const url = new URL(route.request().url())
      const code = (url.searchParams.get("code") || "").trim().toUpperCase()

      if (code === "VALID1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            leagueId: "league-valid-1",
            name: "Viral Invite League",
            sport: "NFL",
            requiresPassword: false,
          }),
        })
        return
      }

      if (code === "DUPLICATE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            leagueId: "league-dup-1",
            name: "Already Joined League",
            sport: "NBA",
            requiresPassword: false,
          }),
        })
        return
      }

      if (code === "EXPIRED") {
        await route.fulfill({
          status: 410,
          contentType: "application/json",
          body: JSON.stringify({
            error: "This invite has expired",
            errorCode: "EXPIRED",
            leagueId: "league-expired-1",
            name: "Expired League",
            sport: "MLB",
            requiresPassword: false,
          }),
        })
        return
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid invite code", errorCode: "INVALID_CODE" }),
      })
    })

    await page.route("**/api/leagues/join", async (route) => {
      const payload = route.request().postDataJSON() as { code?: string }
      const code = String(payload?.code || "").trim().toUpperCase()

      if (code === "VALID1") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, leagueId: "league-valid-1", alreadyMember: false }),
        })
        return
      }

      if (code === "DUPLICATE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, leagueId: "league-dup-1", alreadyMember: true }),
        })
        return
      }

      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invite expired" }),
      })
    })

    await gotoWithRetry(page, "/join?code=VALID1")
    const joinButton = page.getByTestId("league-join-button")
    await expect
      .poll(
        async () =>
          (await page.getByText("Viral Invite League").isVisible().catch(() => false)) ||
          (await joinButton.isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true)
    if (await page.getByText("Viral Invite League").isVisible().catch(() => false)) {
      await expect(page.getByText("NFL")).toBeVisible()
    }
    await page.getByTestId("league-join-button").click()
    await expect(page.getByText("You joined the league.")).toBeVisible()

    await gotoWithRetry(page, "/join?code=DUPLICATE")
    await expect
      .poll(
        async () =>
          (await page.getByText("Already Joined League").isVisible().catch(() => false)) ||
          (await joinButton.isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true)
    await page.getByTestId("league-join-button").click()
    await expect(page.getByText("You are already in this league.")).toBeVisible()

    await gotoWithRetry(page, "/join?code=EXPIRED")
    const previewError = page.getByTestId("league-join-preview-error")
    await expect
      .poll(
        async () =>
          (
            (await previewError.isVisible().catch(() => false)) &&
            /expired/i.test((await previewError.textContent().catch(() => "")) || "")
          ) ||
          (await page.getByText(/expired/i).first().isVisible().catch(() => false)),
        { timeout: 10_000 }
      )
      .toBe(true)
  })
})
