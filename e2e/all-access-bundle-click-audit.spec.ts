import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

function featureFromRequestUrl(url: string): string {
  const parsed = new URL(url)
  return String(parsed.searchParams.get('feature') ?? '')
}

function resolvePlanForFeature(featureId: string): {
  requiredPlanLabel: string
  upgradePath: string
} {
  if (featureId === 'commissioner_automation') {
    return {
      requiredPlanLabel: 'AF Commissioner',
      upgradePath: `/commissioner-upgrade?feature=${encodeURIComponent(featureId)}`,
    }
  }
  if (featureId === 'draft_strategy_build') {
    return {
      requiredPlanLabel: 'AF War Room',
      upgradePath: `/war-room?feature=${encodeURIComponent(featureId)}`,
    }
  }
  return {
    requiredPlanLabel: 'AF Pro',
    upgradePath: `/upgrade?plan=pro&feature=${encodeURIComponent(featureId)}`,
  }
}

async function mockAllAccessBundleMonetization(page: Page, mode: 'locked' | 'bundle') {
  await page.route('**/api/monetization/context**', async (route) => {
    const reqUrl = route.request().url()
    const parsed = new URL(reqUrl)
    const featureId = featureFromRequestUrl(reqUrl) || 'trade_analyzer'
    const ruleCodes = parsed.searchParams.getAll('ruleCode')
    const primaryRuleCode = ruleCodes[0] ?? 'ai_trade_analyzer_full_review'
    const plan = resolvePlanForFeature(featureId)
    const entitled = mode === 'bundle'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: {
          plans: entitled ? ['all_access'] : [],
          status: entitled ? 'active' : 'none',
          currentPeriodEnd: null,
          gracePeriodEnd: null,
        },
        bundleInheritance: {
          hasAllAccess: entitled,
          inheritedPlanIds: entitled ? ['pro', 'commissioner', 'war_room'] : [],
          effectivePlanIds: entitled ? ['all_access', 'pro', 'commissioner', 'war_room'] : [],
        },
        entitlementMessage: entitled
          ? 'Access granted via AF All-Access.'
          : 'Upgrade to unlock this premium workflow.',
        feature: {
          featureId,
          hasAccess: entitled,
          requiredPlan: plan.requiredPlanLabel,
          upgradePath: plan.upgradePath,
          message: entitled ? 'Access granted via AF All-Access.' : `${plan.requiredPlanLabel} is required for this workflow.`,
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
              featureLabel: 'Premium AI action',
              tokenCost: 3,
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

test.describe('@monetization all-access bundle click audit', () => {
  test('all-access spotlight communicates value and upgrade paths cleanly', async ({ page }) => {
    await mockAllAccessBundleMonetization(page, 'locked')
    await page.goto('/e2e/all-access-bundle', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('heading', { name: /e2e all-access bundle harness/i })).toBeVisible()

    await expect(page.getByTestId('af-all-access-spotlight')).toBeVisible()
    await expect(page.getByTestId('af-all-access-price-monthly')).toContainText('$19.99 monthly')
    await expect(page.getByTestId('af-all-access-price-yearly')).toContainText('$199.99 yearly')
    await expect(page.getByTestId('af-all-access-upgrade-link')).toHaveAttribute('href', /\/upgrade\?plan=all_access/)
    await expect(page.getByTestId('af-all-access-token-clarity-copy')).toBeVisible()
    await expect(page.getByTestId('af-all-access-includes-af-pro')).toBeVisible()
    await expect(page.getByTestId('af-all-access-includes-af-commissioner')).toBeVisible()
    await expect(page.getByTestId('af-all-access-includes-af-war-room')).toBeVisible()
    await expect(page.getByTestId('af-all-access-switch-from-pro')).toHaveAttribute('href', /\/upgrade\?plan=all_access&from=pro/)
    await expect(page.getByTestId('af-all-access-switch-from-commissioner')).toHaveAttribute('href', /\/upgrade\?plan=all_access&from=commissioner/)
    await expect(page.getByTestId('af-all-access-switch-from-war-room')).toHaveAttribute('href', /\/upgrade\?plan=all_access&from=war_room/)

    const prefixes = ['all-access-pro', 'all-access-commissioner', 'all-access-war-room']
    for (const prefix of prefixes) {
      await expect(page.getByTestId(`${prefix}-upgrade-cta`)).toBeVisible()
      await expect(page.getByTestId(`${prefix}-buy-tokens-cta`)).toBeVisible()
      await expect(page.getByTestId(`${prefix}-all-access-cta`)).toHaveAttribute('href', /\/all-access/)
    }
  })

  test('all-access entitlement prevents token confusion on included features', async ({ page }) => {
    await mockAllAccessBundleMonetization(page, 'bundle')
    await page.goto('/e2e/all-access-bundle', { waitUntil: 'domcontentloaded' })

    const prefixes = ['all-access-pro', 'all-access-commissioner', 'all-access-war-room']
    for (const prefix of prefixes) {
      await expect(page.getByTestId(`${prefix}-card`)).toBeVisible()
      await expect(page.getByTestId(`${prefix}-loading`)).toHaveCount(0)
      await expect(page.getByTestId(`${prefix}-entitlement-state`)).toContainText('AF All-Access bundle inheritance')
      await expect(page.getByTestId(`${prefix}-token-clarity-note`)).toBeVisible()
      await expect(page.getByTestId(`${prefix}-buy-tokens-cta`)).toHaveCount(0)
      await expect(page.getByTestId(`${prefix}-upgrade-cta`)).toHaveCount(0)
      await expect(page.getByTestId(`${prefix}-all-access-cta`)).toHaveCount(0)
    }
  })
})
