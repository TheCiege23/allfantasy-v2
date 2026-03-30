import { expect, test, type Page } from '@playwright/test'

function featureFromRequestUrl(url: string): string {
  const parsed = new URL(url)
  return String(parsed.searchParams.get('feature') ?? '')
}

async function mockAfWarRoomMonetization(page: Page) {
  await page.route('**/api/config/features', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ features: { aiAssistant: true } }),
    })
  })

  await page.route('**/api/subscription/entitlements**', async (route) => {
    const reqUrl = route.request().url()
    const featureId = featureFromRequestUrl(reqUrl) || 'future_planning'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: {
          plans: [],
          status: 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        hasAccess: false,
        message: 'Upgrade to AF War Room to unlock this strategy workflow.',
        requiredPlan: 'AF War Room',
        upgradePath: `/upgrade?plan=war_room&feature=${encodeURIComponent(featureId)}`,
      }),
    })
  })

  await page.route('**/api/tokens/spend/preview**', async (route) => {
    const parsed = new URL(route.request().url())
    const ruleCode = String(parsed.searchParams.get('ruleCode') ?? 'ai_war_room_multi_step_planning')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        preview: {
          ruleCode,
          featureLabel: 'AF War Room AI action',
          tokenCost: 6,
          currentBalance: 0,
          canSpend: false,
          requiresConfirmation: true,
        },
      }),
    })
  })

  await page.route('**/api/monetization/context**', async (route) => {
    const reqUrl = route.request().url()
    const parsed = new URL(reqUrl)
    const featureId = featureFromRequestUrl(reqUrl) || 'future_planning'
    const ruleCodes = parsed.searchParams.getAll('ruleCode')
    const primaryRuleCode = ruleCodes[0] ?? 'ai_war_room_multi_step_planning'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: {
          plans: [],
          status: 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        entitlementMessage: 'Upgrade to AF War Room for premium strategy and drafting tools.',
        feature: {
          featureId,
          hasAccess: false,
          requiredPlan: 'AF War Room',
          upgradePath: `/upgrade?plan=war_room&feature=${encodeURIComponent(featureId)}`,
          message: 'AF War Room is required for this strategy workflow.',
        },
        tokenBalance: {
          balance: 0,
          lifetimePurchased: 0,
          lifetimeSpent: 0,
          lifetimeRefunded: 0,
          updatedAt: new Date().toISOString(),
        },
        tokenPreviews: [
          {
            ruleCode: primaryRuleCode,
            preview: {
              ruleCode: primaryRuleCode,
              featureLabel: 'AF War Room AI action',
              tokenCost: 6,
              currentBalance: 0,
              canSpend: false,
              requiresConfirmation: true,
            },
            error: null,
          },
        ],
      }),
    })
  })
}

test.describe('@monetization af war room monetization click audit', () => {
  test('war room spotlight plus draft and strategy upgrade routes are wired', async ({ page }) => {
    await mockAfWarRoomMonetization(page)
    await page.goto('/e2e/af-war-room-monetization', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /e2e af war room monetization harness/i })).toBeVisible()

    await expect(page.getByTestId('af-war-room-spotlight')).toBeVisible()
    await expect(page.getByTestId('af-war-room-upgrade-link')).toHaveAttribute('href', /\/upgrade\?plan=war_room/)
    await expect(page.getByTestId('af-war-room-token-link')).toHaveAttribute(
      'href',
      /\/tokens\?ruleCode=ai_war_room_multi_step_planning/
    )

    await expect(page.getByTestId('af-war-room-plan-diff-af-war-room')).toBeVisible()
    await expect(page.getByTestId('af-war-room-plan-diff-af-pro')).toBeVisible()
    await expect(page.getByTestId('af-war-room-plan-diff-af-commissioner')).toBeVisible()

    const cardPrefixes = ['draft-prep-monetization', 'draft-helper-monetization', 'legacy-war-room-monetization']
    for (const prefix of cardPrefixes) {
      await expect(page.getByTestId(`${prefix}-upgrade-cta`)).toHaveAttribute(
        'href',
        /\/upgrade\?plan=war_room&feature=/
      )
      await expect(page.getByTestId(`${prefix}-buy-tokens-cta`)).toHaveAttribute(
        'href',
        /\/tokens\?ruleCode=/
      )
    }

    const futurePlanningLockCard = page.getByRole('region', { name: /af war room future planning is locked/i })
    await expect(futurePlanningLockCard).toBeVisible()
    await expect(futurePlanningLockCard.getByTestId('locked-feature-upgrade-link')).toHaveAttribute(
      'href',
      /\/upgrade\?plan=war_room&feature=future_planning/
    )
  })
})
