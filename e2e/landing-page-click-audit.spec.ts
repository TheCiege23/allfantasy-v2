import { expect, test } from "@playwright/test"

test.describe("@growth landing page click audit", () => {
  test.describe.configure({ timeout: 240_000 })

  test("full click audit: links, tool pages, theme toggle, language toggle, desktop layout", async ({ page, request }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await page.goto("/", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("landing-logo-link")).toBeVisible()
    await expect(page.getByTestId("landing-hero-headline")).toBeVisible()
    await expect(page.getByTestId("landing-open-app-button")).toBeVisible()
    await expect(page.getByTestId("landing-sign-up-button")).toBeVisible()

    // Verify all internal links on the landing surface resolve.
    const hrefs = await page.locator("a[href]").evaluateAll((links) => {
      const origin = window.location.origin
      const unique = new Set<string>()

      for (const node of links) {
        const raw = node.getAttribute("href")
        if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue
        const url = new URL(raw, origin)
        if (url.origin !== origin) continue
        if (url.pathname.startsWith("/api")) continue
        unique.add(`${url.pathname}${url.search}`)
      }

      return Array.from(unique)
    })

    for (const href of hrefs) {
      const res = await request.get(href)
      expect(res.status(), `Expected landing link ${href} to be reachable`).toBeLessThan(400)
    }

    // Verify core tool pages load.
    const toolRoutes = [
      "/trade-analyzer",
      "/waiver-wire",
      "/draft-helper",
      "/player-comparison",
      "/matchup-simulator",
      "/fantasy-coach",
      "/war-room",
      "/brackets",
      "/bracket",
    ]
    for (const route of toolRoutes) {
      const res = await request.get(route)
      expect(res.status(), `Expected tool page ${route} to be reachable`).toBeLessThan(400)
    }

    // Theme toggle behavior
    const themeToggle = page.locator('button[aria-label$="Mode"]').first()
    await expect(themeToggle).toBeVisible()
    const initialMode = await page.locator("html").getAttribute("data-mode")
    await themeToggle.click()
    await expect(page.locator("html")).not.toHaveAttribute("data-mode", initialMode ?? "legacy")
    const nextMode = await page.locator("html").getAttribute("data-mode")

    // Language toggle behavior
    const headlineEn = await page.getByTestId("landing-hero-headline").innerText()
    await page.getByRole("button", { name: "Spanish" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-lang", "es")
    const headlineEs = await page.getByTestId("landing-hero-headline").innerText()
    expect(headlineEs).not.toBe(headlineEn)
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.locator("html")).toHaveAttribute("data-mode", nextMode ?? "dark")
    await expect(page.locator("html")).toHaveAttribute("data-lang", "es")
    await page.getByRole("button", { name: "English" }).click()
    await expect(page.locator("html")).toHaveAttribute("data-lang", "en")

    // Desktop layout sanity
    await expect(page.getByTestId("landing-mobile-sticky-cta")).not.toBeVisible()
    const desktopHasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2
    })
    expect(desktopHasOverflow).toBeFalsy()
  })

  test("mobile layout click audit: sticky CTA + responsive rendering", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "domcontentloaded" })

    await expect(page.getByTestId("landing-hero-headline")).toBeVisible()
    await expect(page.getByTestId("landing-hero-cta-group")).toBeVisible()
    await expect(page.getByTestId("landing-mobile-sticky-cta")).toBeVisible()
    await expect(page.getByTestId("landing-mobile-open-app-button")).toBeVisible()
    await expect(page.getByTestId("landing-mobile-create-account-button")).toBeVisible()

    const mobileHasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2
    })
    expect(mobileHasOverflow).toBeFalsy()

    await page.getByTestId("landing-mobile-open-app-button").click()
    await expect(page).toHaveURL(/\/app/, { timeout: 20_000 })
  })
})
