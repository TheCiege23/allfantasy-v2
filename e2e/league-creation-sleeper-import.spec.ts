import { expect, test } from '@playwright/test'

/**
 * The import entry point on the create-league wizard.
 *
 * This file used to drive ten tests that imported a league from Sleeper, ESPN,
 * Yahoo, Fantrax and MFL *through the creation UI* — selecting a "league creation
 * mode" combobox, filling #import-source-input, clicking "fetch & preview" and
 * committing. The G30 wizard has none of that. Its import affordance opens a modal
 * that LISTS providers and links out to /import; the actual import flow lives on
 * that route, covered by import-preview-click-audit and import-sleeper-canonical.
 *
 * So every one of those tests hung for 180s waiting on a combobox that is not
 * rendered, and no amount of locator repair could bring them back — the flow they
 * describe is gone, not renamed.
 *
 * What is worth asserting is what this surface still promises: that the entry
 * point opens, that it states each provider's real status rather than implying
 * they all work, and that the one provider marked available actually goes
 * somewhere. The modal's own copy makes a claim worth pinning — "This provider is
 * visible for planning but cannot be launched from this flow yet" — and a beta
 * provider that quietly grew a live-looking button would be exactly the kind of
 * regression this suite exists to catch.
 */

const BETA_PROVIDERS = ['espn', 'fantrax', 'yahoo', 'mfl'] as const

test.describe('@import create-league import entry point', () => {
  test.describe.configure({ timeout: 120_000 })

  test('opens the import modal and lists every provider', async ({ page }) => {
    await page.goto('/create-league?e2eAuth=1')
    await expect(page.getByTestId('g30-create-league-wizard')).toBeVisible()

    await page.getByTestId('g30-import-league-button').click()

    const modal = page.getByTestId('g30-import-modal')
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: /import from another site/i })).toBeVisible()

    for (const provider of ['sleeper', ...BETA_PROVIDERS, 'manual']) {
      await expect(page.getByTestId(`g30-import-provider-${provider}`)).toBeVisible()
    }
  })

  test('offers a real route only for the provider marked available', async ({ page }) => {
    await page.goto('/create-league?e2eAuth=1')
    await expect(page.getByTestId('g30-create-league-wizard')).toBeVisible()
    await page.getByTestId('g30-import-league-button').click()

    const sleeper = page.getByTestId('g30-import-provider-sleeper')
    await expect(sleeper).toContainText(/available/i)
    // Sleeper is the one provider with a working import path, so it is the one
    // allowed to hand the user a link.
    await expect(sleeper.getByRole('link', { name: /start import/i })).toHaveAttribute(
      'href',
      /\/import\?provider=sleeper/
    )

    for (const provider of BETA_PROVIDERS) {
      const card = page.getByTestId(`g30-import-provider-${provider}`)
      await expect(card).toContainText(/limited beta/i)
      // A beta provider must not present a link that looks like it will import —
      // saying "cannot be launched from this flow yet" and then offering the
      // control anyway is the failure mode worth guarding.
      await expect(card.getByRole('link', { name: /start import/i })).toHaveCount(0)
    }
  })

  test('states plainly that beta providers cannot be launched here', async ({ page }) => {
    await page.goto('/create-league?e2eAuth=1')
    await expect(page.getByTestId('g30-create-league-wizard')).toBeVisible()
    await page.getByTestId('g30-import-league-button').click()

    await expect(
      page.getByTestId('g30-import-provider-espn').getByText(/cannot be launched from this flow yet/i)
    ).toBeVisible()
    await expect(
      page.getByTestId('g30-import-provider-sleeper').getByText(/imported data is not fabricated/i)
    ).toBeVisible()
  })
})
