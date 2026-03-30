import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

function buildCatalogPayload() {
  const subscriptions = [
    {
      sku: 'af_pro_monthly',
      type: 'subscription',
      title: 'AF Pro Monthly',
      description: 'Player-specific AI features for active fantasy managers.',
      amountUsd: 9.99,
      currency: 'usd',
      interval: 'month',
      tokenAmount: null,
      planFamily: 'af_pro',
      stripePriceId: 'price_af_pro_monthly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_pro_yearly',
      type: 'subscription',
      title: 'AF Pro Yearly',
      description: 'Player-specific AI features for active fantasy managers.',
      amountUsd: 99.99,
      currency: 'usd',
      interval: 'year',
      tokenAmount: null,
      planFamily: 'af_pro',
      stripePriceId: 'price_af_pro_yearly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_commissioner_monthly',
      type: 'subscription',
      title: 'AF Commissioner Monthly',
      description: 'League-specific commissioner tools and automation controls.',
      amountUsd: 4.99,
      currency: 'usd',
      interval: 'month',
      tokenAmount: null,
      planFamily: 'af_commissioner',
      stripePriceId: 'price_af_commissioner_monthly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_commissioner_yearly',
      type: 'subscription',
      title: 'AF Commissioner Yearly',
      description: 'League-specific commissioner tools and automation controls.',
      amountUsd: 49.99,
      currency: 'usd',
      interval: 'year',
      tokenAmount: null,
      planFamily: 'af_commissioner',
      stripePriceId: 'price_af_commissioner_yearly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_war_room_monthly',
      type: 'subscription',
      title: 'AF War Room Monthly',
      description: 'Draft strategy and long-term planning tools for one user.',
      amountUsd: 9.99,
      currency: 'usd',
      interval: 'month',
      tokenAmount: null,
      planFamily: 'af_war_room',
      stripePriceId: 'price_af_war_room_monthly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_war_room_yearly',
      type: 'subscription',
      title: 'AF War Room Yearly',
      description: 'Draft strategy and long-term planning tools for one user.',
      amountUsd: 99.99,
      currency: 'usd',
      interval: 'year',
      tokenAmount: null,
      planFamily: 'af_war_room',
      stripePriceId: 'price_af_war_room_yearly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_all_access_monthly',
      type: 'subscription',
      title: 'AF All-Access Monthly',
      description: 'AF Pro + AF Commissioner + AF War Room in one bundle.',
      amountUsd: 19.99,
      currency: 'usd',
      interval: 'month',
      tokenAmount: null,
      planFamily: 'af_all_access',
      stripePriceId: 'price_af_all_access_monthly',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_all_access_yearly',
      type: 'subscription',
      title: 'AF All-Access Yearly',
      description: 'AF Pro + AF Commissioner + AF War Room in one bundle.',
      amountUsd: 199.99,
      currency: 'usd',
      interval: 'year',
      tokenAmount: null,
      planFamily: 'af_all_access',
      stripePriceId: 'price_af_all_access_yearly',
      stripePriceConfigured: true,
    },
  ]

  const tokenPacks = [
    {
      sku: 'af_tokens_5',
      type: 'token_pack',
      title: 'AllFantasy AI Tokens (5)',
      description: '5 AI tokens for metered premium AI actions.',
      amountUsd: 4.99,
      currency: 'usd',
      interval: null,
      tokenAmount: 5,
      planFamily: null,
      stripePriceId: 'price_af_tokens_5',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_tokens_10',
      type: 'token_pack',
      title: 'AllFantasy AI Tokens (10)',
      description: '10 AI tokens for metered premium AI actions.',
      amountUsd: 8.99,
      currency: 'usd',
      interval: null,
      tokenAmount: 10,
      planFamily: null,
      stripePriceId: 'price_af_tokens_10',
      stripePriceConfigured: true,
    },
    {
      sku: 'af_tokens_25',
      type: 'token_pack',
      title: 'AllFantasy AI Tokens (25)',
      description: '25 AI tokens for metered premium AI actions.',
      amountUsd: 19.99,
      currency: 'usd',
      interval: null,
      tokenAmount: 25,
      planFamily: null,
      stripePriceId: 'price_af_tokens_25',
      stripePriceConfigured: true,
    },
  ]

  return {
    catalog: {
      subscriptions,
      tokenPacks,
      all: [...subscriptions, ...tokenPacks],
    },
    fancredBoundary: {
      version: '2026-03-28',
      short:
        'Paid league dues and payouts are handled externally via FanCred. AllFantasy does not process league dues, hold funds, or distribute winnings.',
      long:
        'AllFantasy league creation and league operation are free. If your league uses paid dues, commissioners must manage dues and payouts externally through FanCred.',
      checklist: [],
    },
  }
}

async function mockPricingApis(page: Page) {
  await page.route('**/api/monetization/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildCatalogPayload()),
    })
  })

  await page.route('**/api/subscription/entitlements**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entitlement: { plans: [], status: 'none', currentPeriodEnd: null, gracePeriodEnd: null },
        hasAccess: false,
        message: 'Upgrade to access this feature.',
      }),
    })
  })

  await page.route('**/api/tokens/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 0, updatedAt: new Date().toISOString() }),
    })
  })
}

async function waitForPricingReady(page: Page) {
  await expect(page.getByText('Loading pricing catalog...')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.getByTestId('pricing-subscription-cta-af_pro_monthly')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('pricing-token-cta-af_tokens_10')).toBeVisible({ timeout: 20_000 })
}

test.describe('@monetization checkout click audit', () => {
  test('desktop subscription CTA dispatches checkout payload and redirects', async ({ page }) => {
    await mockPricingApis(page)
    let checkoutBody: unknown = null

    await page.route('**/api/monetization/checkout/subscription', async (route) => {
      checkoutBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:3000/e2e/subscription-checkout-success',
          sessionId: 'cs_sub_1',
          sku: 'af_pro_monthly',
        }),
      })
    })

    await page.route('**/e2e/subscription-checkout-success', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>subscription success</body></html>',
      })
    })

    await page.setViewportSize({ width: 1366, height: 900 })
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await waitForPricingReady(page)
    await expect(page.getByTestId('pricing-subscription-cta-af_pro_monthly')).toBeVisible()

    await page.getByTestId('pricing-subscription-cta-af_pro_monthly').click()
    await page.waitForURL('**/e2e/subscription-checkout-success')

    expect(checkoutBody).toMatchObject({
      sku: 'af_pro_monthly',
      returnPath: '/pricing',
    })
  })

  test('mobile token CTA dispatches checkout payload and redirects', async ({ page }) => {
    await mockPricingApis(page)
    let checkoutBody: unknown = null

    await page.route('**/api/monetization/checkout/tokens', async (route) => {
      checkoutBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:3000/e2e/token-checkout-success',
          sessionId: 'cs_tok_1',
          sku: 'af_tokens_10',
          tokenAmount: 10,
        }),
      })
    })

    await page.route('**/e2e/token-checkout-success', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>token success</body></html>',
      })
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await waitForPricingReady(page)
    await expect(page.getByTestId('pricing-token-cta-af_tokens_10')).toBeVisible()

    await page.getByTestId('pricing-token-cta-af_tokens_10').click()
    await page.waitForURL('**/e2e/token-checkout-success')

    expect(checkoutBody).toMatchObject({
      sku: 'af_tokens_10',
      returnPath: '/pricing',
    })
  })

  test('checkout API failure shows actionable fallback message (no dead end)', async ({ page }) => {
    await mockPricingApis(page)

    await page.route('**/api/monetization/checkout/subscription', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Checkout is temporarily unavailable for this plan.' }),
      })
    })

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await waitForPricingReady(page)
    await page.getByTestId('pricing-subscription-cta-af_pro_monthly').click()

    await expect(page.getByText('Checkout is temporarily unavailable for this plan.')).toBeVisible()
    await expect(page).toHaveURL(/\/pricing/)
    await expect(page.getByTestId('pricing-token-cta-af_tokens_10')).toBeVisible()
  })

  test('full product matrix CTAs map to correct checkout routes', async ({ page }) => {
    await mockPricingApis(page)
    const seenSubscriptionSkus = new Set<string>()
    const seenTokenSkus = new Set<string>()

    await page.route('**/api/monetization/checkout/subscription', async (route) => {
      const body = route.request().postDataJSON() as { sku?: string; returnPath?: string }
      if (body?.sku) seenSubscriptionSkus.add(body.sku)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: `http://localhost:3000/e2e/checkout-success?sku=${encodeURIComponent(String(body?.sku ?? ''))}`,
          sku: body?.sku,
          purchaseType: 'subscription',
        }),
      })
    })

    await page.route('**/api/monetization/checkout/tokens', async (route) => {
      const body = route.request().postDataJSON() as { sku?: string; returnPath?: string }
      if (body?.sku) seenTokenSkus.add(body.sku)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: `http://localhost:3000/e2e/checkout-success?sku=${encodeURIComponent(String(body?.sku ?? ''))}`,
          sku: body?.sku,
          purchaseType: 'tokens',
        }),
      })
    })

    await page.route('**/e2e/checkout-success**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>checkout success</body></html>',
      })
    })

    const subscriptionSkus = [
      'af_pro_monthly',
      'af_pro_yearly',
      'af_commissioner_monthly',
      'af_commissioner_yearly',
      'af_war_room_monthly',
      'af_war_room_yearly',
      'af_all_access_monthly',
      'af_all_access_yearly',
    ]
    const tokenSkus = ['af_tokens_5', 'af_tokens_10', 'af_tokens_25']

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
    await waitForPricingReady(page)
    await expect(page.getByRole('heading', { name: 'AF Pro' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'AF Commissioner' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'AF War Room' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'AF All-Access' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Checkout monthly' })).toHaveCount(4)
    await expect(page.getByRole('button', { name: 'Checkout yearly' })).toHaveCount(4)
    await expect(page.getByText('AllFantasy AI Tokens (5)')).toBeVisible()
    await expect(page.getByText('AllFantasy AI Tokens (10)')).toBeVisible()
    await expect(page.getByText('AllFantasy AI Tokens (25)')).toBeVisible()

    for (const sku of subscriptionSkus) {
      const cta = page.getByTestId(`pricing-subscription-cta-${sku}`)
      await expect(cta).toBeEnabled()
      await cta.click()
      await page.waitForURL('**/e2e/checkout-success?sku=*')
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await waitForPricingReady(page)
    }

    for (const sku of tokenSkus) {
      const cta = page.getByTestId(`pricing-token-cta-${sku}`)
      await expect(cta).toBeEnabled()
      await cta.click()
      await page.waitForURL('**/e2e/checkout-success?sku=*')
      await page.goto('/pricing', { waitUntil: 'domcontentloaded' })
      await waitForPricingReady(page)
    }

    expect(Array.from(seenSubscriptionSkus).sort()).toEqual(subscriptionSkus.slice().sort())
    expect(Array.from(seenTokenSkus).sort()).toEqual(tokenSkus.slice().sort())
  })

  test('purchase entry pages render and checkout CTAs remain wired', async ({ page }) => {
    await mockPricingApis(page)
    const recordedReturnPaths: string[] = []

    await page.route('**/api/monetization/checkout/subscription', async (route) => {
      const body = route.request().postDataJSON() as { sku?: string; returnPath?: string }
      if (body?.returnPath) recordedReturnPaths.push(body.returnPath)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:3000/e2e/entry-checkout-success',
          sku: body?.sku,
          purchaseType: 'subscription',
        }),
      })
    })
    await page.route('**/api/monetization/checkout/tokens', async (route) => {
      const body = route.request().postDataJSON() as { sku?: string; returnPath?: string }
      if (body?.returnPath) recordedReturnPaths.push(body.returnPath)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:3000/e2e/entry-checkout-success',
          sku: body?.sku,
          purchaseType: 'tokens',
        }),
      })
    })
    await page.route('**/e2e/entry-checkout-success', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><body>ok</body></html>',
      })
    })

    const entryPages = [
      { url: '/upgrade?plan=pro', returnPath: '/upgrade' },
      { url: '/commissioner-upgrade', returnPath: '/commissioner-upgrade' },
      { url: '/war-room', returnPath: '/war-room' },
      { url: '/pro', returnPath: '/pro' },
      { url: '/all-access', returnPath: '/all-access' },
    ]

    for (const entry of entryPages) {
      await page.goto(entry.url, { waitUntil: 'domcontentloaded' })
      await waitForPricingReady(page)
      await expect(page.getByTestId('monetization-fancred-link')).toBeVisible()
      await expect(page.getByTestId('monetization-fancred-link')).toHaveAttribute(
        'href',
        /fancred\.com/
      )
      await expect(page.getByTestId('pricing-subscription-cta-af_pro_monthly')).toBeVisible()
      await expect(page.getByTestId('pricing-subscription-cta-af_pro_monthly')).toBeEnabled()
      await expect(page.getByTestId('pricing-token-cta-af_tokens_10')).toBeVisible()
      await expect(page.getByTestId('pricing-token-cta-af_tokens_10')).toBeEnabled()

      await page.getByTestId('pricing-subscription-cta-af_pro_monthly').click()
      await page.waitForURL('**/e2e/entry-checkout-success')
    }

    for (const expected of entryPages.map((entry) => entry.returnPath)) {
      expect(recordedReturnPaths).toContain(expected)
    }
  })
})
