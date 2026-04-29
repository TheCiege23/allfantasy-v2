import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

const HARNESS_PATH = '/e2e/nfl-redraft-league-dashboard'

async function gotoHarnessReady(page: Page): Promise<void> {
  await page.goto(HARNESS_PATH, { waitUntil: 'domcontentloaded', timeout: 120_000 })
  await page.getByTestId('nfl-redraft-league-dashboard-harness').waitFor({ state: 'visible', timeout: 120_000 })
  await page.waitForLoadState('networkidle').catch(() => null)
  await page.getByTestId('league-draftboard-card').waitFor({ state: 'visible', timeout: 30_000 })
}

test.describe('@nfl-redraft @league-shell pre-draft-home', () => {
  test('Home keeps the user on the league dashboard and shows the pre-draft setup surface', async ({ page }) => {
    await gotoHarnessReady(page)

    await expect(page).toHaveURL(new RegExp(`${HARNESS_PATH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
    await expect(page.getByTestId('league-invite-copy')).toBeVisible()
    await expect(page.getByTestId('league-draftboard-card')).toContainText('Draftboard')
    await expect(page.getByTestId('league-draftboard-card')).toContainText('NFL • HALF PPR')
    await expect(page.getByTestId('nfl-redraft-predraft-summary')).toContainText('League fill')
    await expect(page.getByTestId('nfl-redraft-predraft-summary')).toContainText('Draft type')
    await expect(page.getByTestId('nfl-redraft-predraft-summary')).toContainText('Draft date')
    await expect(page.getByTestId('nfl-redraft-predraft-summary')).toContainText('Pick timer')
    await expect(page.getByTestId('league-draftboard-enter-room-help')).toContainText(
      'The live draft room only opens when you click Enter Draft Room.',
    )

    const enterDraftRoomButton = page.getByTestId('league-draftboard-enter-room')
    const setTimeButton = page.getByTestId('league-draftboard-set-time')
    await expect(enterDraftRoomButton.or(setTimeButton)).toBeVisible()

    const order = page.getByTestId('nfl-redraft-draft-order')
    await expect(order).toBeVisible()
    await expect(order).toContainText('Draft order')
    await expect(order).toContainText('Draft order has not been generated yet.')
    await expect(page.getByTestId('nfl-redraft-generate-draft-order')).toBeVisible()
    await expect(page.getByTestId('nfl-redraft-edit-draft-settings')).toBeVisible()
  })
})