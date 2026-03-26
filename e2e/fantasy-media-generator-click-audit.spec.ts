import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@media fantasy media generator click audit", () => {
  test("audits video generation, HeyGen dispatch, retry, playback, and sharing interactions", async ({ page }) => {
    const generateBodies: Array<Record<string, unknown>> = []
    const retryBodies: Array<Record<string, unknown>> = []
    const publishBodies: Array<Record<string, unknown>> = []
    const publishLogs: Array<{ id: string; destinationType: string; status: string; createdAt: string }> = []
    let statusPollCount = 0

    await page.route("**/api/fantasy-media/**", async (route) => {
      const req = route.request()
      const method = req.method()
      const url = new URL(req.url())
      const path = url.pathname

      if (
        path.includes("/api/fantasy-media/episodes") &&
        !path.includes("/status") &&
        !path.includes("/retry") &&
        !path.includes("/publish-logs") &&
        method === "GET"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            episodes: [
              {
                id: "existing-episode",
                sport: "NFL",
                leagueId: null,
                mediaType: "weekly_recap",
                title: "Weekly recap — Existing League",
                status: "completed",
                playbackUrl: "https://cdn.example.com/existing.mp4",
                provider: "heygen",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/script") && method === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            title: "Script preview",
            script: "Intro. Key storylines. Top performers. Waiver targets. Closing CTA.",
          }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/generate") && method === "POST") {
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>
        generateBodies.push(body)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: `generated-${generateBodies.length}`,
            title: "Generated Episode",
            status: "generating",
            createdAt: new Date().toISOString(),
          }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/episodes/media-e2e-1/status") && method === "GET") {
        statusPollCount += 1
        if (statusPollCount === 1) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ status: "failed", playbackUrl: null }),
          })
          return
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "completed",
            playbackUrl: "https://cdn.example.com/generated.mp4",
          }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/episodes/media-e2e-1/retry") && method === "POST") {
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>
        retryBodies.push(body)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "media-e2e-1",
            status: "generating",
            providerJobId: "retry-job-1",
            updatedAt: new Date().toISOString(),
          }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/episodes/media-e2e-1/publish-logs") && method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ logs: publishLogs }),
        })
        return
      }

      if (path.includes("/api/fantasy-media/episodes/media-e2e-1/publish") && method === "POST") {
        const body = (req.postDataJSON() ?? {}) as Record<string, unknown>
        publishBodies.push(body)
        publishLogs.unshift({
          id: `publish-${publishBodies.length}`,
          destinationType: String(body.destinationType ?? "x"),
          status: "provider_unavailable",
          createdAt: new Date().toISOString(),
        })
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            destinationType: String(body.destinationType ?? "x"),
            status: "provider_unavailable",
            publishId: `publish-${publishBodies.length}`,
            message: "Publishing provider not configured yet",
          }),
        })
        return
      }

      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unhandled route in test harness" }),
      })
    })

    await page.addInitScript(() => {
      ;(window as any).__mediaSharedPayloads = []
      ;(window as any).__videoPlayCalls = 0
      ;(window as any).__videoPauseCalls = 0

      Object.defineProperty(window.navigator, "canShare", {
        configurable: true,
        value: () => true,
      })
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async (payload: unknown) => {
          ;(window as any).__mediaSharedPayloads.push(payload)
        },
      })

      const originalPlay = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function () {
        ;(window as any).__videoPlayCalls += 1
        this.dispatchEvent(new Event("play"))
        return Promise.resolve()
      }

      const originalPause = HTMLMediaElement.prototype.pause
      HTMLMediaElement.prototype.pause = function () {
        ;(window as any).__videoPauseCalls += 1
        this.dispatchEvent(new Event("pause"))
        return originalPause.call(this)
      }

      ;(window as any).__restoreMediaFns = () => {
        HTMLMediaElement.prototype.play = originalPlay
        HTMLMediaElement.prototype.pause = originalPause
      }
    })

    await page.goto("/e2e/fantasy-media", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Fantasy Media Harness" })).toBeVisible()
    await expect(page.getByTestId("fantasy-media-hydrated-flag")).toContainText("hydrated", {
      timeout: 20_000,
    })
    await expect(page.getByTestId("fantasy-media-sport-selector")).toBeVisible()

    await page.getByTestId("fantasy-media-sport-selector").selectOption("SOCCER")
    await page.getByTestId("fantasy-media-content-type-selector").selectOption("sport_specific_content")
    await page.getByTestId("fantasy-media-league-selector").fill("AllFantasy Premier League")
    await expect(page.getByTestId("fantasy-media-sport-selector")).toHaveValue("SOCCER")
    await expect(page.getByTestId("fantasy-media-content-type-selector")).toHaveValue("sport_specific_content")
    await expect(page.getByTestId("fantasy-media-league-selector")).toHaveValue("AllFantasy Premier League")

    await page.getByTestId("fantasy-media-preview-script-button").click()
    await page.getByTestId("fantasy-media-edit-script-button").click()
    const scriptEditor = page.getByTestId("fantasy-media-edit-script-textarea")
    await expect(scriptEditor).toBeVisible({ timeout: 20_000 })
    await scriptEditor.fill("Custom intro. Custom key storylines. Custom CTA.")

    await page.getByTestId("fantasy-media-send-to-heygen-button").click()
    await expect(page.getByTestId("fantasy-media-created-episode-id")).toContainText("generated-1")

    await page.getByTestId("fantasy-media-generate-weekly-recap-button").click()
    await page.getByTestId("fantasy-media-generate-waiver-video-button").click()

    await expect.poll(() => generateBodies.length).toBe(3)
    expect(generateBodies[0]?.sport).toBe("SOCCER")
    expect(generateBodies[0]?.contentType).toBe("sport_specific_content")
    expect(String(generateBodies[0]?.script ?? "")).toContain("Custom intro")
    expect(generateBodies[1]?.contentType).toBe("weekly_recap")
    expect(generateBodies[2]?.contentType).toBe("waiver_targets")

    await expect(page.getByTestId("fantasy-media-refresh-status-button")).toBeVisible()
    await page.getByTestId("fantasy-media-refresh-status-button").click()
    await expect(page.getByTestId("fantasy-media-retry-button")).toBeVisible()

    await page.getByTestId("fantasy-media-retry-button").click()
    await expect.poll(() => retryBodies.length).toBe(1)
    await page.getByTestId("fantasy-media-refresh-status-button").click()

    await expect(page.getByTestId("fantasy-media-video-player")).toBeVisible()
    await expect(page.getByTestId("fantasy-media-playback-button")).toBeVisible()
    await page.getByTestId("fantasy-media-playback-button").click()
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).__videoPlayCalls)
    }).toBeGreaterThan(0)

    await page.getByTestId("fantasy-media-copy-share-button").click()
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).__mediaSharedPayloads.length)
    }).toBeGreaterThan(0)
    await expect
      .poll(async () =>
        page.evaluate(() => ((window as any).__mediaSharedPayloads.at(-1) as { url?: string } | undefined)?.url ?? "")
      )
      .toContain("/fantasy-media/media-e2e-1")

    await page.getByTestId("fantasy-media-publish-button").click()
    await expect.poll(() => publishBodies.length).toBe(1)
    expect(publishBodies[0]?.destinationType).toBe("x")
    await expect(page.getByTestId("fantasy-media-publish-status")).toContainText("provider_unavailable")
    await expect(page.getByTestId("fantasy-media-refresh-publish-logs-button")).toBeVisible()
    await page.getByTestId("fantasy-media-refresh-publish-logs-button").click()
    await expect(page.getByTestId("fantasy-media-publish-log-publish-1")).toContainText("x")

    await expect(page.getByTestId("fantasy-media-back-dashboard-link")).toBeVisible()
    await expect(page.getByTestId("fantasy-media-back-button")).toHaveAttribute("href", "/fantasy-media")
  })
})
