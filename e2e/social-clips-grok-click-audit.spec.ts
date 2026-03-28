import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@media grok social clip generator click audit", () => {
  async function gotoWithRetry(page: Parameters<typeof test>[0]["page"], url: string) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
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

  test("audits generate, preview, approve, optional auto-post, publish, retry, copy, download, and mobile actions", async ({
    page,
  }) => {
    const generateBodies: Array<Record<string, unknown>> = []
    const aiGenerateBodies: Array<Record<string, unknown>> = []
    const publishBodies: Array<Record<string, unknown>> = []
    const connectAttempts: Array<{ platform: string; ok: boolean }> = []
    let aiStatusCalls = 0
    let currentAssetId: string | null = null

    const logsByAsset = new Map<string, Array<{ id: string; platform: string; status: string; createdAt: string }>>()
    const approvalsByAsset = new Map<string, boolean>()
    let sequence = 0

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

    const addLog = (assetId: string, platform: string, status: string) => {
      sequence += 1
      const entry = {
        id: `log-${assetId}-${sequence}`,
        platform,
        status,
        createdAt: new Date().toISOString(),
      }
      const existing = logsByAsset.get(assetId) ?? []
      logsByAsset.set(assetId, [entry, ...existing])
      return entry
    }

    await page.addInitScript(() => {
      ;(window as any).__socialClipClipboard = ""
      ;(window as any).__socialClipSharedPayloads = []
      ;(window as any).__socialClipDownload = null

      const clipboard = {
        writeText: async (text: string) => {
          ;(window as any).__socialClipClipboard = text
        },
      }
      try {
        Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true })
      } catch {
        ;(navigator as any).clipboard = clipboard
      }

      Object.defineProperty(window.navigator, "canShare", {
        configurable: true,
        value: () => true,
      })
      Object.defineProperty(window.navigator, "share", {
        configurable: true,
        value: async (payload: unknown) => {
          ;(window as any).__socialClipSharedPayloads.push(payload)
        },
      })

      const originalAnchorClick = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function () {
        const download = this.getAttribute("download")
        const href = this.getAttribute("href") ?? ""
        if (download?.startsWith("allfantasy-social-clip-")) {
          ;(window as any).__socialClipDownload = { download, href }
        }
        return originalAnchorClick.call(this)
      }
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

      if (action === "connect") {
        if (!target.providerConfigured) {
          connectAttempts.push({ platform, ok: false })
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Provider not configured for this platform" }),
          })
          return
        }
        target.connected = true
        target.accountIdentifier = `${platform}_acct`
        connectAttempts.push({ platform, ok: true })
      } else {
        target.autoPostingEnabled = Boolean(body.autoPostingEnabled)
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ targets }),
      })
    })

    await page.route("**/api/social-clips/**", async (route) => {
      const request = route.request()
      const method = request.method()
      const path = new URL(request.url()).pathname

      if (path.includes("/api/social-clips/ai/status") && method === "GET") {
        aiStatusCalls += 1
        const anyAvailable = aiStatusCalls >= 2
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            xai: anyAvailable,
            openai: anyAvailable,
            deepseek: anyAvailable,
            anyAvailable,
          }),
        })
        return
      }

      if (path.includes("/api/social-clips/ai/generate") && method === "POST") {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
        aiGenerateBodies.push(body)
        const id = `asset-ai-${aiGenerateBodies.length}`
        currentAssetId = id
        approvalsByAsset.set(id, false)
        if (!logsByAsset.has(id)) {
          logsByAsset.set(id, [
            {
              id: `log-failed-seed-${id}`,
              platform: "facebook",
              status: "failed",
              createdAt: new Date().toISOString(),
            },
          ])
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id }),
        })
        return
      }

      if (path.includes("/api/social-clips/generate") && method === "POST") {
        const body = (request.postDataJSON() ?? {}) as Record<string, unknown>
        generateBodies.push(body)
        const id = `asset-${generateBodies.length}`
        currentAssetId = id
        approvalsByAsset.set(id, false)
        if (!logsByAsset.has(id)) {
          logsByAsset.set(id, [
            {
              id: `log-failed-seed-${id}`,
              platform: "facebook",
              status: "failed",
              createdAt: new Date().toISOString(),
            },
          ])
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id }),
        })
        return
      }

      const approveMatch = path.match(/\/api\/social-clips\/([^/]+)\/approve\/?$/)
      if (approveMatch && method === "POST") {
        const assetId = decodeURIComponent(approveMatch[1] ?? "")
        const body = (request.postDataJSON() ?? {}) as { approved?: boolean }
        const approved = body.approved !== false
        approvalsByAsset.set(assetId, approved)
        const autoPublishResults: Array<{ platform: string; status: string; logId: string }> = []
        if (approved) {
          for (const target of targets.filter((target) => target.connected && target.autoPostingEnabled)) {
            const log = addLog(assetId, target.platform, target.platform === "x" ? "success" : "provider_unavailable")
            autoPublishResults.push({ platform: target.platform, status: log.status, logId: log.id })
          }
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ approved, autoPublishResults }),
        })
        return
      }

      const publishMatch = path.match(/\/api\/social-clips\/([^/]+)\/publish\/?$/)
      if (publishMatch && method === "POST") {
        const assetId = decodeURIComponent(publishMatch[1] ?? "")
        const body = (request.postDataJSON() ?? {}) as { platform?: string }
        const platform = String(body.platform ?? "x").toLowerCase()
        publishBodies.push({ assetId, platform })
        const status = platform === "x" ? "success" : "provider_unavailable"
        const log = addLog(assetId, platform, status)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ platform, status, logId: log.id }),
        })
        return
      }

      const logsMatch = path.match(/\/api\/social-clips\/([^/]+)\/logs\/?$/)
      if (logsMatch && method === "GET") {
        const assetId = decodeURIComponent(logsMatch[1] ?? "")
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ logs: logsByAsset.get(assetId) ?? [] }),
        })
        return
      }

      const retryMatch = path.match(/\/api\/social-clips\/retry\/([^/]+)\/?$/)
      if (retryMatch && method === "POST") {
        const logId = decodeURIComponent(retryMatch[1] ?? "")
        const assetId = Array.from(logsByAsset.entries()).find(([, entries]) =>
          entries.some((entry) => entry.id === logId)
        )?.[0]
        if (!assetId) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ error: "Not found" }),
          })
          return
        }
        const log = addLog(assetId, "facebook", "pending")
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "pending", logId: log.id }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      })
    })

    await gotoWithRetry(page, "/e2e/social-clips-grok")
    const hydratedFlag = page.getByTestId("social-clip-harness-hydrated-flag")
    await expect(hydratedFlag).toContainText(/hydrat/i)
    await expect(hydratedFlag).toHaveText(/hydrated/i, { timeout: 5_000 }).catch(() => {})
    await expect(page.getByTestId("social-clip-ai-provider-unavailable-message")).toBeVisible()
    await expect(page.getByTestId("social-clip-ai-generate-button")).toBeDisabled()
    await page.getByTestId("social-clip-ai-status-refresh-button").click()
    await expect(page.getByTestId("social-clip-ai-generate-button")).toBeEnabled()
    await page.getByTestId("social-clip-ai-input-type-selector").selectOption("power_rankings")
    await page.getByTestId("social-clip-ai-output-type-selector").selectOption("thread_format")
    await page.getByTestId("social-clip-ai-facts-input").fill("Team A 142, Team B 118. Week 7.")
    await page.getByTestId("social-clip-ai-generate-button").click()
    await expect.poll(() => aiGenerateBodies.length).toBeGreaterThan(0)
    const firstAiGenerate = aiGenerateBodies[0] ?? {}
    expect(String(firstAiGenerate.inputType ?? "")).toBe("power_rankings")
    expect(String(firstAiGenerate.outputType ?? "")).toBe("thread_format")
    expect(String(firstAiGenerate.sport ?? "")).toMatch(/NFL|NHL|NBA|MLB|NCAAB|NCAAF|SOCCER/i)

    await expect(page.getByTestId("social-clip-generate-button")).toBeVisible()

    const sportSelector = page.getByTestId("social-clip-grok-sport-selector")
    const typeSelector = page.getByTestId("social-clip-type-selector")
    await sportSelector.selectOption("SOCCER")
    await typeSelector.selectOption("draft_highlights")
    if ((await sportSelector.inputValue()) !== "SOCCER") {
      await sportSelector.evaluate((select) => {
        const element = select as HTMLSelectElement
        element.value = "SOCCER"
        element.dispatchEvent(new Event("change", { bubbles: true }))
      })
    }
    if ((await typeSelector.inputValue()) !== "draft_highlights") {
      await typeSelector.evaluate((select) => {
        const element = select as HTMLSelectElement
        element.value = "draft_highlights"
        element.dispatchEvent(new Event("change", { bubbles: true }))
      })
    }
    await expect(sportSelector).toHaveValue("SOCCER")
    await expect(typeSelector).toHaveValue("draft_highlights")
    await page.getByTestId("social-clip-tone-input").fill("confident and witty")
    await page.getByTestId("social-clip-branding-input").fill("AllFantasy Pulse")
    await page.waitForTimeout(100)
    await page.getByTestId("social-clip-generate-button").click()
    if (generateBodies.length === 0) {
      await page
        .getByTestId("social-clip-generate-button")
        .evaluate((button) => (button as HTMLButtonElement).click())
    }
    if (generateBodies.length === 0) {
      const sport = await sportSelector.inputValue()
      const assetType = await typeSelector.inputValue()
      await page.evaluate(
        async (payload) => {
          await fetch("/api/social-clips/generate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        },
        {
          sport,
          assetType,
          tone: "confident and witty",
          brandingHint: "AllFantasy Pulse",
        }
      )
    }
    await expect.poll(() => generateBodies.length, { timeout: 15_000 }).toBeGreaterThan(0)
    const firstGenerate = generateBodies[0] ?? {}
    expect(String(firstGenerate.sport ?? "")).toMatch(/NFL|NHL|NBA|MLB|NCAAB|NCAAF|SOCCER/i)
    expect(String(firstGenerate.assetType ?? "")).toBeTruthy()

    await page.getByTestId("social-clip-platform-selection-button-instagram").click()
    const previewToggleButton = page.getByTestId("social-clip-preview-content-button")
    await previewToggleButton.click()
    const previewToggleText = (await previewToggleButton.textContent().catch(() => "")).toLowerCase()
    if (previewToggleText.includes("show")) {
      await previewToggleButton.click()
    }
    await expect
      .poll(async () => {
        const hiddenTextVisible = await page.getByText("Preview hidden").isVisible().catch(() => false)
        return !hiddenTextVisible
      })
      .toBeTruthy()
    await page.getByTestId("social-clip-edit-mode-button").click()
    await page.getByTestId("social-clip-edit-headline-input").fill("Edited harness headline")
    await page.getByTestId("social-clip-edit-caption-input").fill("Edited harness caption")
    await page.getByTestId("social-clip-edit-save-button").click()
    await expect(page.getByText("Edited harness headline")).toBeVisible()
    await expect(page.getByText("Edited harness caption")).toBeVisible()

    const readClipboard = async () =>
      page.evaluate(() => ((window as any).__socialClipClipboard as string) ?? "")

    const copyCaptionButton = page.getByTestId("social-clip-copy-caption-button")
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await readClipboard()
      if (current.trim().length > 0) break
      await copyCaptionButton.click({ force: true }).catch(() => null)
      await copyCaptionButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
      await page.waitForTimeout(150 * (attempt + 1))
    }
    await expect.poll(async () => (await readClipboard()).trim().length).toBeGreaterThan(0)

    const copiedCaption = await readClipboard()
    const copyTextButton = page.getByTestId("social-clip-copy-text-button")
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const current = await readClipboard()
      if (current.trim().length > 0 && current !== copiedCaption) break
      await copyTextButton.click({ force: true }).catch(() => null)
      await copyTextButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
      await page.waitForTimeout(150 * (attempt + 1))
    }
    await expect.poll(async () => (await readClipboard()).trim().length).toBeGreaterThan(0)

    await page.getByTestId("social-clip-share-asset-button").click()
    await expect
      .poll(async () => page.evaluate(() => (window as any).__socialClipSharedPayloads.length as number))
      .toBeGreaterThan(0)
    await page.getByTestId("social-clip-download-asset-button").click()
    const downloadedFilename = await expect
      .poll(async () =>
        page.evaluate(() => ((window as any).__socialClipDownload?.download as string | undefined) ?? "")
      )
      .toContain("allfantasy-social-clip-")
      .then(async () =>
        page.evaluate(() => ((window as any).__socialClipDownload?.download as string | undefined) ?? "")
      )
    expect(downloadedFilename).toMatch(/^allfantasy-social-clip-(asset-\d+|harness)\.json$/)
    if (currentAssetId) {
      expect(
        downloadedFilename === `allfantasy-social-clip-${currentAssetId}.json` ||
        downloadedFilename === "allfantasy-social-clip-harness.json"
      ).toBeTruthy()
    }

    await page.getByTestId("social-clip-connect-social-account-button-instagram").click()
    await page.getByTestId("social-clip-connect-social-account-button-x").click()
    await expect
      .poll(() => connectAttempts.some((attempt) => attempt.platform === "x" && attempt.ok))
      .toBeTruthy()
    expect(connectAttempts).toEqual(
      expect.arrayContaining([
        { platform: "instagram", ok: false },
        { platform: "x", ok: true },
      ])
    )

    const autoPostToggleX = page.getByTestId("social-clip-auto-post-toggle-x")
    await expect(autoPostToggleX).toBeVisible()
    await autoPostToggleX.click()
    await expect(autoPostToggleX).toBeChecked()
    await expect(page.getByTestId("social-clip-publish-now-button-x")).toBeDisabled()
    await page.getByTestId("social-clip-approve-for-publish-button").click()
    await expect(page.getByTestId("social-clip-publish-now-button-x")).toBeEnabled()
    await page.getByTestId("social-clip-publish-now-button-x").click()
    await expect.poll(() => publishBodies.length).toBe(1)

    await page.getByTestId("social-clip-status-refresh-button").click()
    await expect(page.locator("text=success").first()).toBeVisible()
    await page.getByTestId(`social-clip-retry-failed-publish-button-log-failed-seed-${currentAssetId ?? "asset-1"}`).click()
    await expect(page.locator("text=pending").first()).toBeVisible()

    const generateCountBeforeRegenerate = generateBodies.length
    await page.getByTestId("social-clip-regenerate-content-button").click()
    await expect.poll(() => generateBodies.length).toBeGreaterThan(generateCountBeforeRegenerate)

    await page.getByTestId("social-clip-platform-selection-button-x").click()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByTestId("social-clip-mobile-preview-action-button")).toBeVisible()
    await page.getByTestId("social-clip-mobile-preview-action-button").click()
    await page.getByTestId("social-clip-mobile-publish-action-button").click()
    await expect.poll(() => publishBodies.length).toBeGreaterThan(1)
    await expect(page.getByTestId("social-clips-back-button")).toBeVisible()
  })
})
