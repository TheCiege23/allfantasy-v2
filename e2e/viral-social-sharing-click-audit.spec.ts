import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@growth viral social sharing click audit", () => {
  test("audits generation, Grok copy, preview, copy, optional auto-post, publish, retry, and mobile share actions", async ({ page }) => {
    const momentBodies: Array<Record<string, unknown>> = []
    const copyBodies: Array<Record<string, unknown>> = []
    const approveBodies: Array<{ shareId: string; approved: boolean }> = []
    const publishBodies: Array<Record<string, unknown>> = []
    const retryBodies: Array<Record<string, unknown>> = []
    const targetActions: Array<{ platform: string; action: string; autoPostingEnabled?: boolean }> = []

    const logsByShare = new Map<string, Array<{ id: string; platform: string; status: string; createdAt: string }>>()
    let publishSequence = 0
    let shareSequence = 0
    let xPublishAttemptCount = 0

    let targets: Array<{
      platform: string
      accountIdentifier: string | null
      autoPostingEnabled: boolean
      connected: boolean
      providerConfigured: boolean
    }> = [
      { platform: "x", accountIdentifier: null, autoPostingEnabled: false, connected: false, providerConfigured: true },
      {
        platform: "instagram",
        accountIdentifier: null,
        autoPostingEnabled: false,
        connected: false,
        providerConfigured: false,
      },
      { platform: "tiktok", accountIdentifier: null, autoPostingEnabled: false, connected: false, providerConfigured: false },
      {
        platform: "facebook",
        accountIdentifier: null,
        autoPostingEnabled: false,
        connected: false,
        providerConfigured: false,
      },
    ]

    const addLog = (shareId: string, platform: string, status: string) => {
      publishSequence += 1
      const log = {
        id: `share-log-${publishSequence}`,
        platform,
        status,
        createdAt: new Date().toISOString(),
      }
      const existing = logsByShare.get(shareId) ?? []
      logsByShare.set(shareId, [log, ...existing])
      return log
    }

    await page.addInitScript(() => {
      ;(window as any).__viralOpenCalls = []
      ;(window as any).__viralClipboard = ""
      ;(window as any).__viralNativeShares = []

      const originalOpen = window.open
      window.open = function (...args: any[]) {
        ;(window as any).__viralOpenCalls.push(args[0] ?? "")
        return originalOpen.call(window, "about:blank")
      } as typeof window.open

      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            ;(window as any).__viralClipboard = value
          },
        },
      })

      Object.defineProperty(window.navigator, "canShare", {
        configurable: true,
        value: () => true,
      })

      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async (payload: unknown) => {
          ;(window as any).__viralNativeShares.push(payload)
        },
      })
    })

    await page.route("**/api/share/targets", async (route) => {
      const request = route.request()
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ targets }),
        })
        return
      }
      const body = (request.postDataJSON() ?? {}) as {
        platform?: string
        action?: string
        autoPostingEnabled?: boolean
      }
      const platform = String(body.platform ?? "").toLowerCase()
      const action = String(body.action ?? "toggle_auto_post")
      const target = targets.find((entry) => entry.platform === platform)
      if (!target) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid platform" }),
        })
        return
      }
      targetActions.push({
        platform,
        action,
        autoPostingEnabled: typeof body.autoPostingEnabled === "boolean" ? body.autoPostingEnabled : undefined,
      })
      if (action === "connect") {
        if (!target.providerConfigured) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Provider not configured", code: "PROVIDER_UNAVAILABLE" }),
          })
          return
        }
        target.connected = true
        target.accountIdentifier = `${platform}_acct`
      } else if (action === "disconnect") {
        target.connected = false
        target.accountIdentifier = null
        target.autoPostingEnabled = false
      } else {
        target.autoPostingEnabled = !!body.autoPostingEnabled
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ targets }),
      })
    })

    await page.route("**/api/share/moment", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      momentBodies.push(body)
      shareSequence += 1
      const shareId = `share-${shareSequence}`
      const shareUrl = `https://allfantasy.test/share/${shareId}`
      logsByShare.set(shareId, [])
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shareId,
          shareUrl,
          title: `Generated ${String(body.shareType ?? "share")}`,
          summary: "Generated summary",
          createdAt: new Date().toISOString(),
        }),
      })
    })

    await page.route("**/api/share/generate-copy", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      copyBodies.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          caption: "Generated caption for viral moment",
          headline: "Generated viral headline",
          cta: "Join AllFantasy now",
          hashtags: ["AllFantasy", "ViralMoment"],
          fromGrok: true,
          platformVariants: {
            x: { caption: "X variant caption", hashtags: ["AllFantasy", "XPost"] },
          },
        }),
      })
    })

    await page.route("**/api/share/preview**", async (route) => {
      const url = new URL(route.request().url())
      const shareId = url.searchParams.get("shareId") ?? "share-1"
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shareUrl: `https://allfantasy.test/share/${shareId}`,
          title: "Preview title",
          caption: "Preview caption",
          cta: "Preview CTA",
          hashtags: ["AllFantasy", "Preview"],
          approvedForPublish: false,
        }),
      })
    })

    await page.route("**/api/share/*/approve", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as { approved?: boolean }
      const approved = body.approved !== false
      const parts = route.request().url().split("/")
      const shareId = parts[parts.length - 2] ?? "share-1"
      approveBodies.push({ shareId, approved })

      if (approved) {
        const xTarget = targets.find((target) => target.platform === "x")
        if (xTarget?.connected && xTarget.autoPostingEnabled) {
          addLog(shareId, "x", "success")
        }
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          shareId,
          approved,
          autoPublishResults: approved ? [{ platform: "x", status: "success", logId: "auto-1" }] : [],
          logs: logsByShare.get(shareId) ?? [],
        }),
      })
    })

    await page.route("**/api/share/publish**", async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (request.method() === "GET") {
        const shareId = url.searchParams.get("shareId") ?? "share-1"
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            logs: logsByShare.get(shareId) ?? [],
          }),
        })
        return
      }

      const body = (request.postDataJSON() ?? {}) as {
        action?: string
        shareId?: string
        platform?: string
        logId?: string
      }
      const action = String(body.action ?? "publish").toLowerCase()
      if (action === "retry") {
        retryBodies.push(body as Record<string, unknown>)
        const logId = String(body.logId ?? "")
        const retrySource = Array.from(logsByShare.values())
          .flat()
          .find((entry) => entry.id === logId)
        const shareId = retrySource ? Array.from(logsByShare.entries()).find(([, items]) => items.some((item) => item.id === logId))?.[0] : null
        const targetShareId = shareId ?? "share-1"
        addLog(targetShareId, retrySource?.platform ?? "x", "success")
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            platform: retrySource?.platform ?? "x",
            status: "success",
            logId: "retry-success",
          }),
        })
        return
      }

      publishBodies.push(body as Record<string, unknown>)
      const shareId = String(body.shareId ?? "share-1")
      const platform = String(body.platform ?? "x")
      let status = "success"
      if (platform === "x") {
        xPublishAttemptCount += 1
        status = xPublishAttemptCount === 1 ? "failed" : "success"
      }
      addLog(shareId, platform, status)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          platform,
          status,
          logId: `publish-${platform}-${xPublishAttemptCount}`,
          message: status === "failed" ? "Publish failed" : "Published",
          logs: logsByShare.get(shareId) ?? [],
        }),
      })
    })

    await page.goto("/e2e/viral-social-sharing", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Viral Social Sharing Harness" })).toBeVisible()
    await expect
      .poll(async () => (await page.getByTestId("viral-social-sharing-hydrated-flag").textContent()) ?? "", {
        timeout: 20_000,
      })
      .toContain("hydrated")

    await page.getByTestId("viral-share-sport-selector").selectOption("SOCCER")
    await expect(page.getByTestId("viral-share-sport-selector")).toHaveValue("SOCCER")
    await page.getByTestId("viral-share-type-selector").selectOption("major_upset")
    await expect(page.getByTestId("viral-share-type-selector")).toHaveValue("major_upset")

    await page.getByTestId("viral-generate-share-card-button").click()
    await expect.poll(() => momentBodies.length).toBe(1)
    expect(momentBodies[0]?.sport).toBe("SOCCER")
    expect(momentBodies[0]?.shareType).toBe("major_upset")

    await page.getByTestId("viral-generate-social-copy-button").click()
    await expect.poll(() => copyBodies.length).toBe(1)
    expect(copyBodies[0]?.shareType).toBe("major_upset")

    await page.getByTestId("viral-preview-card-button").click()
    await expect(page.getByTestId("viral-preview-card")).toBeVisible()

    await page.getByTestId("viral-copy-link-button").click()
    await expect.poll(async () => page.evaluate(() => (window as any).__viralClipboard as string)).toContain(
      "/share/share-1"
    )

    await page.getByTestId("viral-copy-caption-button").click()
    await expect.poll(async () => page.evaluate(() => (window as any).__viralClipboard as string)).toContain(
      "Preview caption"
    )

    await page.getByTestId("viral-share-button").click()
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).__viralNativeShares.length)
    }).toBe(1)

    await page.getByTestId("viral-share-button-x").click()
    await page.getByTestId("viral-share-button-facebook").click()
    await page.getByTestId("viral-share-button-reddit").click()

    await expect.poll(async () => {
      const urls = await page.evaluate(() => (window as any).__viralOpenCalls as string[])
      return urls.length
    }).toBeGreaterThanOrEqual(3)

    await expect.poll(async () => {
      const urls = await page.evaluate(() => (window as any).__viralOpenCalls as string[])
      return urls.some((url) => url.includes("twitter.com/intent/tweet"))
    }).toBe(true)
    await expect.poll(async () => {
      const urls = await page.evaluate(() => (window as any).__viralOpenCalls as string[])
      return urls.some((url) => url.includes("facebook.com/sharer/sharer.php"))
    }).toBe(true)
    await expect.poll(async () => {
      const urls = await page.evaluate(() => (window as any).__viralOpenCalls as string[])
      return urls.some((url) => url.includes("reddit.com/submit"))
    }).toBe(true)

    await page.getByTestId("viral-platform-selector").selectOption("x")
    await page.getByTestId("viral-connect-account-button").click()
    await expect.poll(() => targetActions.some((entry) => entry.platform === "x" && entry.action === "connect")).toBeTruthy()
    await expect(page.getByTestId("viral-disconnect-account-button")).toBeVisible()

    const autoPostToggle = page.getByTestId("viral-auto-post-toggle")
    await expect(autoPostToggle).toBeEnabled()
    await autoPostToggle.click()
    await expect.poll(() => targetActions.some((entry) => entry.platform === "x" && entry.action === "toggle_auto_post" && entry.autoPostingEnabled === true)).toBeTruthy()
    await expect(autoPostToggle).toBeChecked()

    await page.getByTestId("viral-approve-publish-button").click()
    await expect.poll(() => approveBodies.length).toBe(1)
    expect(approveBodies[0]).toMatchObject({ shareId: "share-1", approved: true })

    await page.getByTestId("viral-publish-now-button").click()
    await expect.poll(() => publishBodies.length).toBe(1)
    expect(publishBodies[0]).toMatchObject({ shareId: "share-1", platform: "x" })

    await page.getByTestId("viral-status-refresh-button").click()
    await expect(page.locator("text=x: failed").first()).toBeVisible()

    await page.getByTestId("viral-retry-publish-button-share-log-2").click()
    await expect.poll(() => retryBodies.length).toBe(1)
    await page.getByTestId("viral-status-refresh-button").click()
    await expect(page.locator("text=x: success").first()).toBeVisible()

    await page.getByTestId("viral-mobile-share-button").click()
    await expect.poll(async () => page.evaluate(() => (window as any).__viralNativeShares.length)).toBe(2)

    await page.getByTestId("viral-close-preview-button").click()
    await expect(page.getByTestId("viral-open-preview-button")).toBeVisible()
  })
})
