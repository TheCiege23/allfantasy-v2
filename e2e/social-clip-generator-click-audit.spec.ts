import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@media social clip generator click audit", () => {
  test("audits share graphic, share links, and download graphic", async ({ page }) => {
    const clipId = "clip-audit-001"

    await page.addInitScript(() => {
      ;(window as any).__clipClipboard = ""
      ;(window as any).__clipOpenCalls = []
      ;(window as any).__clipDownload = null

      const clipboard = {
        writeText: async (text: string) => {
          ;(window as any).__clipClipboard = text
        },
      }

      try {
        Object.defineProperty(navigator, "clipboard", {
          value: clipboard,
          configurable: true,
        })
      } catch {
        ;(navigator as any).clipboard = clipboard
      }

      ;(navigator as any).canShare = () => false

      window.open = ((url?: string | URL) => {
        ;(window as any).__clipOpenCalls.push(String(url ?? ""))
        return null
      }) as typeof window.open

      const originalAnchorClick = HTMLAnchorElement.prototype.click
      HTMLAnchorElement.prototype.click = function () {
        const download = this.getAttribute("download")
        const href = this.getAttribute("href") ?? ""
        if (download?.startsWith("allfantasy-clip-")) {
          ;(window as any).__clipDownload = { download, href }
        }
        return originalAnchorClick.call(this)
      }
    })

    await page.route(`**/api/clips/${clipId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: clipId,
          clipType: "biggest_upset",
          title: "Audit Upset Clip",
          subtitle: "The underdog prevails",
          stats: ["Audit League · Week 7", "Underdog victory"],
          createdAt: new Date().toISOString(),
        }),
      })
    })

    await page.goto(`/clips/${clipId}`, { waitUntil: "domcontentloaded" })
    await expect(page.getByText("Audit Upset Clip")).toBeVisible()

    await page.getByTestId("social-clip-share-graphic-button").click()
    const copiedUrl = await page.evaluate(() => (window as any).__clipClipboard as string)
    expect(copiedUrl).toContain(`/clips/${clipId}`)

    await page.goto(copiedUrl)
    await expect(page.getByText("Audit Upset Clip")).toBeVisible()
    await expect(page.getByTestId("social-clip-share-graphic-button")).toBeVisible()

    await page.getByTestId("social-clip-share-x-button").click()
    await page.getByTestId("social-clip-share-facebook-button").click()
    const openCalls = await page.evaluate(() => (window as any).__clipOpenCalls as string[])
    expect(openCalls.some((url) => url.startsWith("https://twitter.com/intent/tweet?"))).toBeTruthy()
    expect(
      openCalls.some((url) => url.startsWith("https://www.facebook.com/sharer/sharer.php?"))
    ).toBeTruthy()

    await page.getByTestId("social-clip-download-graphic-button").click()
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => (window as any).__clipDownload?.download as string | undefined)) ?? "",
        { timeout: 30_000 }
      )
      .toContain("allfantasy-clip-")
    const dataUrl = await page.evaluate(
      () => ((window as any).__clipDownload?.href as string | undefined) ?? ""
    )
    expect(dataUrl.startsWith("data:image/png;base64,")).toBeTruthy()
  })
})
