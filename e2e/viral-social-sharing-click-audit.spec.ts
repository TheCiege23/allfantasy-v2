import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 120_000 })

test.describe("@growth viral social sharing click audit", () => {
  test("share and copy link buttons work across social networks", async ({ page }) => {
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

    await page.goto("/e2e/viral-social-sharing", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Viral Social Sharing Harness" })).toBeVisible()
    await expect(page.getByTestId("viral-social-sharing-hydrated-flag")).toContainText("hydrated")

    await page.getByTestId("viral-share-type-winning_matchup").click()
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

    await page.getByTestId("viral-copy-link-button").click()
    await expect.poll(async () => {
      return page.evaluate(() => (window as any).__viralClipboard as string)
    }).toContain("/share/achievements?type=winning_matchup")
  })
})
