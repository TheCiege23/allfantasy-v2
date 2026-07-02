import { expect, test } from "@playwright/test"

test.describe("@dashboard unified dashboard click audit", () => {
  test.describe.configure({ timeout: 210_000, mode: "serial" })

  test("audits current dashboard cards, CTAs, and mobile layout", async ({ page }) => {
    await page.goto("/e2e/dashboard-soccer-grouping")

    await expect(page.getByText(/Welcome back,/i).first()).toBeVisible()
    await expect(page.getByText("Soccer Dashboard Harness League")).toBeVisible()
    await expect(page.getByTestId("league-pulse-card-dashboard")).toBeVisible()
    await expect(page.getByTestId("league-pulse-card-dashboard").getByText("League Pulse")).toBeVisible()
    await expect(page.getByTestId("dashboard-connected-leagues-heading")).toBeVisible()
    await expect(page.getByText("AI and strategy shortcuts")).toBeVisible()
    await expect(page.getByText("Profile and account")).toBeVisible()

    await expect(page.getByRole("link", { name: /Create League/i }).first()).toHaveAttribute(
      "href",
      "/create-league",
    )
    await expect(page.getByRole("link", { name: /Import League/i }).first()).toHaveAttribute(
      "href",
      "/import?returnTo=/dashboard",
    )
    await expect(page.getByRole("link", { name: /Open AI Tools/i }).first()).toHaveAttribute(
      "href",
      "/tools-hub",
    )
    await expect(page.getByRole("link", { name: /Trade Finder/i }).first()).toHaveAttribute(
      "href",
      "/trade-finder",
    )
    await expect(page.getByRole("link", { name: /Waiver AI/i }).first()).toHaveAttribute(
      "href",
      "/waiver-ai",
    )
    await expect(page.getByRole("link", { name: /Season Strategy/i }).first()).toHaveAttribute(
      "href",
      "/season-strategy",
    )
    await expect(page.getByRole("link", { name: /Open profile/i }).first()).toHaveAttribute(
      "href",
      "/settings",
    )

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/e2e/dashboard-soccer-grouping")
    await expect(page.getByText(/Welcome back,/i).first()).toBeVisible()
    await expect(page.getByText("Soccer Dashboard Harness League")).toBeVisible()
    await expect(page.getByTestId("league-pulse-card-dashboard")).toBeVisible()
    const mobileHasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    )
    expect(mobileHasOverflow).toBeFalsy()
  })
})
