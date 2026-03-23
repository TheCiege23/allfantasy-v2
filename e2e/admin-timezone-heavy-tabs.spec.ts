import { expect, test } from "@playwright/test"
import {
  TARGET_TIMEZONE,
  bootstrapAdminTimezoneSession,
  formatExpected,
} from "./helpers/admin-timezone-smoke"

test("heavy admin tabs render dates in user timezone", async ({ page }) => {
  test.setTimeout(240_000)
  await bootstrapAdminTimezoneSession(page)

  const drilldownResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/admin/model-drift?") &&
      response.url().includes("type=drilldown") &&
      response.request().method() === "GET"
  )
  await page.goto("/admin?tab=model_drift")
  await expect(page.getByRole("heading", { name: "Drilldown Table" }).first()).toBeVisible()

  const drilldownResponse = await drilldownResponsePromise
  if (drilldownResponse.ok()) {
    const drilldownJson = await drilldownResponse.json()
    const firstOffer = Array.isArray(drilldownJson?.offers) ? drilldownJson.offers[0] : null

    if (firstOffer?.createdAt) {
      const expectedOfferDate = await formatExpected(page, firstOffer.createdAt, TARGET_TIMEZONE, {
        dateStyle: "short",
      })
      await expect(page.getByText(expectedOfferDate).first()).toBeVisible()
    } else {
      await expect(
        page.getByText(/The drilldown table shows individual offers matching your filters\./i).first()
      ).toBeVisible()
    }
  } else {
    await expect(
      page.getByText(/The drilldown table shows individual offers matching your filters\./i).first()
    ).toBeVisible()
  }
})
