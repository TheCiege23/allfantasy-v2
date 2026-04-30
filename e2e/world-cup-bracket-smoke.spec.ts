import { expect, test } from "@playwright/test"

test.describe("World Cup bracket smoke", () => {
  test("shows the World Cup bracket entry point", async ({ page }) => {
    await page.goto("/brackets")
    await expect(page.getByTestId("world-cup-bracket-card")).toBeVisible()
  })
})
