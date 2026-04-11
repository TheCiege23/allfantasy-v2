import { expect, test } from '@playwright/test'

test.describe('@left-chat openChat query', () => {
  test('openChat=league selects league tab', async ({ page }) => {
    await page.goto('/e2e/left-chat-open-query-harness?openChat=league')
    await expect(page.getByTestId('left-chat-tab-league')).toHaveAttribute('aria-pressed', 'true')
  })

  test('openChat=chimmy selects chimmy tab', async ({ page }) => {
    await page.goto('/e2e/left-chat-open-query-harness?openChat=chimmy')
    await expect(page.getByTestId('left-chat-tab-chimmy')).toHaveAttribute('aria-pressed', 'true')
  })

  test('default selects league tab when league context exists', async ({ page }) => {
    await page.goto('/e2e/left-chat-open-query-harness')
    await expect(page.getByTestId('left-chat-tab-league')).toHaveAttribute('aria-pressed', 'true')
  })
})
