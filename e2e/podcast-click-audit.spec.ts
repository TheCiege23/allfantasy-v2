import { expect, test } from "@playwright/test"

test.describe("@media podcast click audit", () => {
  test("audits podcast generation, playback toggle, and share", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await page.addInitScript(() => {
      ;(window as any).__podcastSharedPayload = null
      ;(navigator as any).canShare = () => true
      ;(navigator as any).share = async (payload: unknown) => {
        ;(window as any).__podcastSharedPayload = payload
      }
    })

    await page.goto("/e2e/podcast", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Podcast Generator Harness" })).toBeVisible()
    await expect(page.getByTestId("podcast-generated-episode")).toBeVisible()

    await page.getByTestId("podcast-sport-select").selectOption("SOCCER")
    await page.getByTestId("podcast-league-input").fill("AllFantasy Pro League")
    await page.getByTestId("podcast-week-input").fill("Week 8")

    await page.getByTestId("podcast-generate-button").click()
    expect(pageErrors).toEqual([])
    await expect(page.getByTestId("podcast-generated-episode")).toBeVisible()
    await expect(page.getByTestId("podcast-generate-button")).toBeVisible()

    const playButton = page.getByTestId("podcast-play-button")
    await expect(playButton).toHaveAttribute("aria-label", /Play podcast|Pause podcast/)
    await playButton.click()
    await expect(playButton).toBeVisible()
    await playButton.click()
    await expect(playButton).toBeVisible()

    await page.getByTestId("podcast-share-button").click()
    await expect(page.getByTestId("podcast-share-button")).toBeVisible()
  })
})
