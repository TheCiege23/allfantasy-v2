import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

async function mockAuthAndDraftActions(page: Page, leagueId: string) {
  const bodies: unknown[] = []
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'e2e-commissioner-user', name: 'E2E Commissioner' } }),
    })
  })
  await page.route(`**/api/leagues/${leagueId}/draft/actions`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const raw = route.request().postData()
    try {
      bodies.push(raw ? (JSON.parse(raw) as Record<string, unknown>) : {})
    } catch {
      bodies.push({})
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })
  return { getBodies: () => bodies as Array<Record<string, unknown>> }
}

test.describe('@draft-api commissioner actions route', () => {
  test('POST /draft/actions sends action payload from CommissionerDraftControls', async ({ page }) => {
    const leagueId = `e2e-draft-actions-${Date.now()}`
    const captured = await mockAuthAndDraftActions(page, leagueId)

    await page.goto(`/e2e/draft-api-controls?leagueId=${encodeURIComponent(leagueId)}`)
    await expect(page.getByRole('heading', { name: /e2e draft api controls/i })).toBeVisible()

    await page.getByTestId('draft-commissioner-controls').getByRole('button', { name: /pause/i }).click()
    await expect.poll(() => captured.getBodies().length).toBeGreaterThan(0)
    const last = captured.getBodies()[captured.getBodies().length - 1]
    expect(last).toMatchObject({ action: 'pause' })

    await page.getByTestId('draft-commissioner-controls').getByRole('button', { name: /resume/i }).click()
    await expect.poll(() => captured.getBodies().length).toBeGreaterThanOrEqual(2)
    expect(captured.getBodies().some((b) => b.action === 'resume')).toBe(true)

    await expect(page.getByTestId('draft-api-controls-callback')).toContainText('updated')
  })
})
