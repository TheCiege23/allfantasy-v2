import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test.describe('@avatar profile image click audit', () => {
  test('audits signup, settings, upload, remove, and identity surface propagation', async ({ page }) => {
    const patchPosts: Array<Record<string, unknown>> = []
    let uploadCount = 0

    await page.route('**/api/user/profile/avatar', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      uploadCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: `/uploads/avatars/e2e-upload-${uploadCount}.png` }),
      })
    })

    await page.route('**/api/user/profile', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchPosts.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>)
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto('/e2e/profile-avatar-click-audit')
    await expect(page.getByRole('heading', { name: /profile avatar click audit harness/i })).toBeVisible()

    await expect(page.getByTestId('signup-preset-option')).toHaveCount(20)
    await expect(page.getByTestId('settings-preset-option')).toHaveCount(20)

    await page.getByTestId('signup-preset-option').nth(18).click()
    await expect(page.getByTestId('signup-preview-surface')).toContainText('soccer')

    await page.getByTestId('signup-preset-initial').click()
    await expect(page.getByTestId('signup-preview-surface')).toContainText('initial')

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAJqLx2sAAAAASUVORK5CYII=',
      'base64'
    )

    await page.getByTestId('signup-upload-input').setInputFiles({
      name: 'signup-avatar.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    })
    await expect(page.getByTestId('signup-upload-preview-image')).toBeVisible()
    await page.getByTestId('signup-remove-upload').click()
    await expect(page.getByTestId('signup-upload-preview-image')).toHaveCount(0)

    await page.getByTestId('settings-preset-option').nth(15).click()
    await page.getByTestId('settings-save-profile').click()
    await expect(page.getByTestId('settings-save-status')).toContainText('saved')

    expect(patchPosts.length).toBeGreaterThan(0)
    expect(patchPosts[0]).toMatchObject({
      avatarPreset: 'basketball',
      avatarUrl: null,
    })

    await expect(page.getByTestId('surface-nav-avatar')).toContainText('🏀')

    await page.getByTestId('settings-upload-input').setInputFiles({
      name: 'settings-avatar.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    })

    const navImage = page.getByTestId('surface-nav-avatar').locator('img')
    await expect(navImage).toBeVisible()
    await expect(navImage).toHaveAttribute('src', /e2e-upload-1\.png/)

    await page.getByTestId('settings-remove-image').click()
    await page.getByTestId('settings-preset-initial').click()
    await page.getByTestId('settings-save-profile').click()

    const lastPatch = patchPosts[patchPosts.length - 1] ?? {}
    expect(lastPatch).toMatchObject({
      avatarPreset: null,
      avatarUrl: null,
    })

    await expect(page.getByTestId('surface-nav-avatar')).toContainText('A')

    await page.reload()
    await expect(page.getByTestId('state-summary-avatar-preset')).toContainText('initial')
    await expect(page.getByTestId('state-summary-avatar-url-echo')).toContainText('none')
  })
})
