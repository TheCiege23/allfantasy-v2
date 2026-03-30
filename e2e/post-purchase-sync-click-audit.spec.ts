import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

type HarnessState = {
  hasAccess: boolean
  tokenBalance: number
}

async function mockPostPurchaseSyncApis(
  page: Page,
  state: HarnessState,
  options?: {
    onPostPurchaseSync?: () => void
  }
) {
  await page.route('**/api/monetization/post-purchase-sync**', async (route) => {
    options?.onPostPurchaseSync?.()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        syncStatus: 'synced',
        syncMessage: 'Purchase processed. Access state refreshed.',
        sessionId: 'test-session',
        syncEvidence: {
          subscription: state.hasAccess,
          tokens: !state.hasAccess,
        },
        entitlement: {
          plans: state.hasAccess ? ['pro'] : [],
          status: state.hasAccess ? 'active' : 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        bundleInheritance: {
          hasAllAccess: false,
          inheritedPlanIds: [],
          effectivePlanIds: state.hasAccess ? ['pro'] : [],
        },
        tokenBalance: {
          balance: state.tokenBalance,
          lifetimePurchased: state.tokenBalance,
          lifetimeSpent: 0,
          lifetimeRefunded: 0,
          updatedAt: new Date().toISOString(),
        },
        resolvedAt: new Date().toISOString(),
      }),
    })
  })

  await page.route('**/api/subscription/entitlements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: {
          plans: state.hasAccess ? ['pro'] : [],
          status: state.hasAccess ? 'active' : 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        hasAccess: state.hasAccess,
        message: state.hasAccess ? 'Access granted.' : 'Upgrade to access this feature.',
        requiredPlan: 'AF Pro',
        upgradePath: '/upgrade?plan=pro&feature=trade_analyzer',
        bundleInheritance: {
          hasAllAccess: false,
          inheritedPlanIds: [],
          effectivePlanIds: state.hasAccess ? ['pro'] : [],
        },
      }),
    })
  })

  await page.route('**/api/tokens/balance**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance: state.tokenBalance,
        lifetimePurchased: state.tokenBalance,
        lifetimeSpent: 0,
        lifetimeRefunded: 0,
        updatedAt: new Date().toISOString(),
      }),
    })
  })

  await page.route('**/api/monetization/context**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: {
          plans: state.hasAccess ? ['pro'] : [],
          status: state.hasAccess ? 'active' : 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        entitlementMessage: state.hasAccess ? 'Access granted.' : 'Upgrade required.',
        feature: {
          featureId: 'trade_analyzer',
          hasAccess: state.hasAccess,
          requiredPlan: 'AF Pro',
          upgradePath: '/upgrade?plan=pro&feature=trade_analyzer',
          message: state.hasAccess ? 'Access granted.' : 'AF Pro required',
        },
        tokenBalance: {
          balance: state.tokenBalance,
          lifetimePurchased: state.tokenBalance,
          lifetimeSpent: 0,
          lifetimeRefunded: 0,
          updatedAt: new Date().toISOString(),
        },
        tokenPreviews: [
          {
            ruleCode: 'ai_trade_analyzer_full_review',
            preview: {
              ruleCode: 'ai_trade_analyzer_full_review',
              featureLabel: 'Trade analyzer full review',
              tokenCost: 3,
              currentBalance: state.tokenBalance,
              canSpend: state.tokenBalance >= 3,
              requiresConfirmation: true,
            },
            error: null,
          },
        ],
      }),
    })
  })
}

test.describe('@monetization post-purchase sync click audit', () => {
  test('returning from checkout updates plan state and clears stale lock UI', async ({ page }) => {
    const state: HarnessState = { hasAccess: false, tokenBalance: 0 }
    await mockPostPurchaseSyncApis(page, state, {
      onPostPurchaseSync: () => {
        state.hasAccess = true
      },
    })

    await page.goto('/e2e/post-purchase-sync?checkout=success&session_id=sub-sync-1', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByTestId('post-purchase-sync-banner')).toBeVisible()
    await expect(page.getByTestId('post-purchase-sync-status')).toContainText('Purchase complete')
    await expect(page.getByTestId('post-purchase-feature-entitlement-state')).toContainText(
      'Included with your plan'
    )
    await expect(page.getByTestId('post-purchase-feature-upgrade-cta')).toHaveCount(0)
    await expect(page.getByTestId('post-purchase-feature-locked-copy')).toHaveCount(0)
  })

  test('token purchase return refreshes token balance correctly', async ({ page }) => {
    const state: HarnessState = { hasAccess: false, tokenBalance: 0 }
    await mockPostPurchaseSyncApis(page, state, {
      onPostPurchaseSync: () => {
        state.tokenBalance = 25
      },
    })

    await page.goto('/e2e/post-purchase-sync?checkout=success&tokens=success&session_id=tok-sync-1', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByTestId('post-purchase-sync-token-balance')).toContainText('25', { timeout: 15_000 })
    await expect.poll(async () => (await page.getByTestId('post-purchase-sync-status').textContent()) ?? '').toMatch(/tokens added/i)
  })

  test('cancelled purchase state is handled cleanly', async ({ page }) => {
    const state: HarnessState = { hasAccess: false, tokenBalance: 0 }
    await mockPostPurchaseSyncApis(page, state)

    await page.goto('/e2e/post-purchase-sync?checkout=cancelled', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByTestId('post-purchase-sync-banner')).toBeVisible()
    await expect(page.getByTestId('post-purchase-sync-status')).toContainText('Checkout cancelled')
    await expect(page.getByTestId('post-purchase-sync-retry')).toHaveCount(0)
    await expect(page.getByTestId('post-purchase-feature-upgrade-cta')).toBeVisible()
  })

  test('post-purchase retry button is wired (no dead button)', async ({ page }) => {
    const state: HarnessState = { hasAccess: false, tokenBalance: 0 }
    let syncCalls = 0

    await mockPostPurchaseSyncApis(page, state, {
      onPostPurchaseSync: () => {
        syncCalls += 1
        state.hasAccess = true
      },
    })

    await page.goto('/e2e/post-purchase-sync?checkout=failed&session_id=retry-sync-1', {
      waitUntil: 'domcontentloaded',
    })

    await expect(page.getByTestId('post-purchase-sync-status')).toContainText(
      'Purchase could not be completed'
    )
    await expect(page.getByTestId('post-purchase-sync-retry')).toBeVisible()
    await page.getByTestId('post-purchase-sync-retry').click()
    await expect(page.getByTestId('post-purchase-sync-status')).toContainText('Purchase complete')
    await expect(page.getByTestId('post-purchase-feature-entitlement-state')).toContainText(
      'Included with your plan'
    )
    expect(syncCalls).toBeGreaterThan(0)
  })
})
