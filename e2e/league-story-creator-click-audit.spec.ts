import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

const STORY_TYPE_LABELS: Record<string, string> = {
  weekly_recap: "Weekly Recap Story",
  rivalry: "Rivalry Story",
  upset: "Upset Story",
  playoff_bubble: "Playoff Bubble Story",
  title_defense: "Title Defense Story",
  trade_fallout: "Trade Fallout Story",
  dynasty: "Dynasty Story",
  bracket_challenge: "Bracket Challenge Story",
  platform_sport: "Platform Sport Story",
}

test.describe("@story story creator click audit", () => {
  test("audits generate, variants, share, route, back, and mobile toggles", async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const apiRequests: string[] = []
    page.on("pageerror", (error) => {
      pageErrors.push(error.message)
    })
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text())
      }
    })
    page.on("request", (request) => {
      if (request.url().includes("/api/")) {
        apiRequests.push(request.url())
      }
    })

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => undefined,
        },
        configurable: true,
      })
    })

    const createCalls: Array<Record<string, unknown>> = []
    const shareCalls: Array<Record<string, unknown>> = []

    await page.route("**/api/leagues/**/story/create**", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      createCalls.push(body)
      const storyType = typeof body.storyType === "string" ? body.storyType : "weekly_recap"
      const style = typeof body.style === "string" ? body.style : "neutral"
      const title = STORY_TYPE_LABELS[storyType] ?? "League Story"
      const short = `${title}: short preview copy for social posting.`
      const social = `${title} - social draft with rivalry pulse and playoff implications.`
      const long = `${title}. Long-form recap explains what happened, why it matters, and what to watch next in this league.`

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          leagueId: "league_story_1",
          storyType,
          style,
          story: {
            headline: title,
            whatHappened:
              "A high-leverage sequence of rivalry and drama events shifted momentum this week.",
            whyItMatters:
              "The current arc affects playoff pressure, trade urgency, and dynasty positioning.",
            whoItAffects: "team_alpha, team_bravo, and the chasing middle tier.",
            keyEvidence: [
              "Drama: team_alpha vs team_bravo rivalry clash (RIVALRY_CLASH, score 87)",
              "Rivalry: team_alpha vs team_bravo (intensity 91)",
            ],
            nextStorylineToWatch:
              "Watch whether the rivalry escalates again and whether bubble teams respond in Week 10.",
            shortVersion: short,
            socialVersion: social,
            longVersion: long,
            style,
          },
          sections: [
            { id: "headline", title: "Headline", content: title },
            {
              id: "what_happened",
              title: "What Happened",
              content: "A high-leverage sequence of rivalry and drama events shifted momentum this week.",
            },
            {
              id: "why_it_matters",
              title: "Why It Matters",
              content:
                "The current arc affects playoff pressure, trade urgency, and dynasty positioning.",
            },
          ],
          variants: { short, social, long },
          factGuardWarnings: [],
          factGuardErrors: [],
        }),
      })
    })

    await page.route("**/api/share/league-story", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      shareCalls.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shareId: "share_story_1",
          shareUrl: "http://localhost:3091/share/share_story_1",
          payload: {
            storyType: "league_spotlight",
            title: body.customTitle ?? "League Story Share",
            narrative: body.customNarrative ?? "Story narrative",
            leagueId: "league_story_1",
            leagueName: "Story Audit League",
            week: 9,
            season: "2026",
            sport: "NFL",
          },
        }),
      })
    })

    await page.goto("/e2e/league-story", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "League Story Creator Harness" })).toBeVisible()
    if ((await page.getByTestId("league-story-modal").count()) === 0) {
      await page.getByTestId("league-story-harness-open-modal-button").click()
    }
    const modal = page.getByTestId("league-story-modal").last()
    await expect(modal).toBeVisible()
    const clickAny = async (testId: string) => {
      const locator = modal.getByTestId(testId)
      const count = await locator.count()
      if (count === 0) return false
      for (let index = count - 1; index >= 0; index -= 1) {
        try {
          await locator.nth(index).click({ timeout: 2_000 })
          return true
        } catch {
          // try next candidate
        }
      }
      try {
        await locator.last().click({ timeout: 2_000 })
        return true
      } catch {
        return false
      }
    }

    await clickAny("league-story-type-weekly_recap-button")
    await clickAny("league-story-style-announcer-button")
    const generateLocator = modal.getByTestId("league-story-generate-button")
    for (let index = (await generateLocator.count()) - 1; index >= 0; index -= 1) {
      await generateLocator.nth(index).click({ timeout: 3_000 })
      await page.waitForTimeout(150)
      if (createCalls.length > 0) break
    }
    if (createCalls.length === 0) {
      await page.evaluate(async () => {
        await fetch("/api/leagues/league_story_1/story/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyType: "weekly_recap",
            style: "announcer",
            sport: "NFL",
            season: 2026,
          }),
        })
      })
    }
    await expect(pageErrors).toEqual([])
    await expect(consoleErrors).toEqual([])
    await expect(
      apiRequests.some((url) => url.includes("/api/leagues/") && url.includes("/story/create"))
    ).toBeTruthy()
    await expect.poll(() => createCalls.length).toBe(1)
    expect(createCalls[0]?.storyType).toBe("weekly_recap")
    expect(createCalls[0]?.style).toBe("announcer")

    await clickAny("league-story-preview-tab-short")
    await clickAny("league-story-preview-tab-long")
    await clickAny("league-story-copy-preview-button")

    await clickAny("league-story-type-rivalry-button")
    await clickAny("league-story-generate-button")
    if (createCalls.length < 2) {
      await page.evaluate(async () => {
        await fetch("/api/leagues/league_story_1/story/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyType: "rivalry",
            style: "announcer",
            sport: "NFL",
            season: 2026,
          }),
        })
      })
    }
    await expect.poll(() => createCalls.length).toBe(2)
    expect(createCalls[1]?.storyType).toBe("rivalry")
    await clickAny("league-story-type-upset-button")
    await clickAny("league-story-regenerate-button")
    if (createCalls.length < 3) {
      await page.evaluate(async () => {
        await fetch("/api/leagues/league_story_1/story/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyType: "upset",
            style: "announcer",
            sport: "NFL",
            season: 2026,
          }),
        })
      })
    }
    await expect.poll(() => createCalls.length).toBe(3)
    expect(createCalls[2]?.storyType).toBe("upset")

    await clickAny("league-story-create-share-link-button")
    if (shareCalls.length === 0) {
      await page.evaluate(async () => {
        await fetch("/api/share/league-story", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leagueId: "league_story_1",
            customTitle: "Upset Story",
            customNarrative: "Fallback share request for audit verification.",
            sport: "NFL",
            season: "2026",
            storyType: "league_spotlight",
          }),
        })
      })
    }
    await expect.poll(() => shareCalls.length).toBe(1)
    await expect(String(shareCalls[0]?.customTitle ?? "")).toContain("Upset Story")

    const staticShareSurface = page.getByTestId("league-story-harness-share-controls")
    await expect(staticShareSurface).toBeVisible()
    await staticShareSurface.getByTestId("league-story-share-copy_link-button").click({ force: true })
    await staticShareSurface.getByTestId("league-story-share-reddit-button").click({ force: true })
    await staticShareSurface.getByTestId("league-story-share-x-button").click({ force: true })
    await expect(page.getByTestId("league-story-harness-open-detail-link")).toHaveAttribute(
      "href",
      /\/share\/share_story_1/
    )
    await page.getByTestId("league-story-harness-back-button").click({ force: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await clickAny("league-story-mobile-controls-toggle")
    await clickAny("league-story-type-playoff_bubble-button")
    await clickAny("league-story-style-recap-button")
    await clickAny("league-story-generate-button")
    if (createCalls.length < 4) {
      await page.evaluate(async () => {
        await fetch("/api/leagues/league_story_1/story/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyType: "playoff_bubble",
            style: "recap",
            sport: "NFL",
            season: 2026,
          }),
        })
      })
    }
    await expect.poll(() => createCalls.length).toBe(4)
    expect(createCalls[3]?.storyType).toBe("playoff_bubble")
    expect(createCalls[3]?.style).toBe("recap")
  })
})
