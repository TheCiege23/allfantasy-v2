import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

test.describe("@news fantasy news aggregator click audit", () => {
  test("news card clicks and source links open expected articles", async ({ page }) => {
    await page.goto("/e2e/fantasy-news", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Fantasy News Aggregator Harness" })).toBeVisible()
    await expect(page.getByTestId("fantasy-news-hydrated-flag")).toContainText("hydrated")

    await page.getByTestId("fantasy-news-feed-type-player").click()
    await page.getByTestId("fantasy-news-query-input").fill("Josh Allen")
    await expect(page.getByTestId("fantasy-news-summarize-toggle")).toBeChecked()
    await page.getByTestId("fantasy-news-load-button").click()

    const card = page.getByTestId("fantasy-news-card-news-1")
    const sourceLink = page.getByTestId("fantasy-news-source-link-news-1")
    await expect(card).toBeVisible()
    await expect(sourceLink).toBeVisible()
    await expect(card).toHaveAttribute("href", "about:blank#player-article")
    await expect(card).toHaveAttribute("target", "_blank")
    await expect(sourceLink).toHaveAttribute("href", "about:blank#player-article")
    await expect(sourceLink).toHaveAttribute("target", "_blank")

    const cardPopupPromise = page.waitForEvent("popup", { timeout: 2_500 }).catch(() => null)
    await card.click()
    const cardPopup = await cardPopupPromise
    if (cardPopup) {
      await expect.poll(() => cardPopup.url()).toContain("about:blank#player-article")
      await cardPopup.close()
    }

    const sourcePopupPromise = page.waitForEvent("popup", { timeout: 2_500 }).catch(() => null)
    await sourceLink.click()
    const sourcePopup = await sourcePopupPromise
    if (sourcePopup) {
      await expect.poll(() => sourcePopup.url()).toContain("about:blank#player-article")
      await sourcePopup.close()
    }

    await page.getByTestId("fantasy-news-feed-type-team").click()
    await page.getByTestId("fantasy-news-query-input").fill("KC")
    await page.getByTestId("fantasy-news-load-button").click()
    await expect(page.getByTestId("fantasy-news-card-news-1")).toHaveAttribute(
      "href",
      "about:blank#team-article"
    )
  })
})
