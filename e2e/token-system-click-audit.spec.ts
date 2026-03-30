import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

const NOW_ISO = '2026-03-30T12:00:00.000Z'

async function mockTokenCenterApis(page: Page, opts?: { balance?: number; canSpend?: boolean }) {
  const balance = opts?.balance ?? 12
  const canSpend = opts?.canSpend ?? true

  await page.route('**/api/tokens/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance,
        lifetimePurchased: 25,
        lifetimeSpent: 13,
        lifetimeRefunded: 0,
        updatedAt: NOW_ISO,
      }),
    })
  })

  await page.route('**/api/monetization/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        catalog: {
          tokenPacks: [
            {
              sku: 'af_tokens_5',
              title: 'AllFantasy AI Tokens (5)',
              description: '5 AI tokens for metered premium AI actions.',
              amountUsd: 4.99,
              tokenAmount: 5,
              stripePriceConfigured: true,
            },
            {
              sku: 'af_tokens_10',
              title: 'AllFantasy AI Tokens (10)',
              description: '10 AI tokens for metered premium AI actions.',
              amountUsd: 8.99,
              tokenAmount: 10,
              stripePriceConfigured: true,
            },
          ],
        },
      }),
    })
  })

  await page.route('**/api/tokens/spend-rules', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rules: [
          {
            code: 'ai_chimmy_chat_message',
            category: 'ai_feature',
            featureLabel: 'Chimmy chat message',
            description: 'Unified Chimmy chat response generation.',
            tokenCost: 1,
            baseTokenCost: 1,
            pricingTier: 'low',
            requiredPlan: 'pro',
            discountPct: 0,
          },
          {
            code: 'commissioner_ai_cycle_run',
            category: 'commissioner_function',
            featureLabel: 'AI Commissioner cycle run',
            description: 'League-wide commissioner governance cycle.',
            tokenCost: 2,
            baseTokenCost: 3,
            pricingTier: 'high',
            requiredPlan: 'commissioner',
            discountPct: 33,
          },
        ],
      }),
    })
  })

  await page.route('**/api/tokens/history?limit=30', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entries: [
          {
            id: 'ledger-1',
            entryType: 'purchase',
            tokenDelta: 10,
            balanceAfter: 10,
            spendFeatureLabel: null,
            description: 'Stripe purchase: AllFantasy AI Tokens (10)',
            createdAt: NOW_ISO,
          },
        ],
      }),
    })
  })

  await page.route('**/api/tokens/spend/preview?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        preview: {
          ruleCode: 'ai_chimmy_chat_message',
          featureLabel: 'Chimmy chat message',
          tokenCost: 1,
          currentBalance: balance,
          canSpend,
          requiresConfirmation: true,
        },
      }),
    })
  })
}

async function waitForTokensReady(page: Page) {
  await expect(page.getByText('Loading token center...')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.getByTestId('tokens-buy-cta-af_tokens_5')).toBeVisible({ timeout: 20_000 })
}

test.describe('@token-system click audit', () => {
  test('buy tokens CTA dispatches checkout payload', async ({ page }) => {
    await mockTokenCenterApis(page)
    let checkoutBody: unknown = null

    await page.route('**/api/monetization/checkout/tokens', async (route) => {
      checkoutBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:3000/e2e/token-checkout-success',
          sessionId: 'cs_tok_1',
          sku: 'af_tokens_5',
          tokenAmount: 5,
        }),
      })
    })
    await page.route('**/e2e/token-checkout-success', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>ok</body></html>' })
    })

    await page.goto('/tokens', { waitUntil: 'domcontentloaded' })
    await waitForTokensReady(page)
    await expect(page.getByTestId('tokens-balance-display')).toContainText('12')
    await expect(page.getByTestId('monetization-fancred-link')).toBeVisible()
    await expect(page.getByTestId('monetization-fancred-link')).toHaveAttribute('href', /fancred\.com/)
    await page.getByTestId('tokens-buy-cta-af_tokens_5').click()
    await page.waitForURL('**/e2e/token-checkout-success')

    expect(checkoutBody).toMatchObject({
      sku: 'af_tokens_5',
      returnPath: '/tokens',
    })
  })

  test('spend confirmation flow calls spend endpoint', async ({ page }) => {
    await mockTokenCenterApis(page, { balance: 4, canSpend: true })
    let spendBody: unknown = null
    page.on('dialog', (dialog) => dialog.accept())

    await page.route('**/api/tokens/spend', async (route) => {
      spendBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          ledger: {
            id: 'ledger-spend-1',
            balanceAfter: 3,
          },
        }),
      })
    })

    await page.goto('/tokens', { waitUntil: 'domcontentloaded' })
    await waitForTokensReady(page)
    await page.getByTestId('tokens-spend-confirm').click()

    await expect(page.getByTestId('tokens-insufficient-state')).toContainText('Spent 1 token')
    expect(spendBody).toMatchObject({
      ruleCode: 'ai_chimmy_chat_message',
      confirmed: true,
      sourceType: 'tokens_page_simulator',
    })
  })

  test('insufficient balance and usage history toggles are interactive', async ({ page }) => {
    await mockTokenCenterApis(page, { balance: 0, canSpend: false })
    await page.goto('/tokens', { waitUntil: 'domcontentloaded' })
    await waitForTokensReady(page)

    await page.getByTestId('tokens-spend-confirm').click()
    await expect(page.getByTestId('tokens-insufficient-state')).toContainText('Insufficient balance')

    await page.getByTestId('tokens-usage-history-toggle').click()
    await expect(page.getByTestId('tokens-usage-history-panel')).toBeHidden()
    await page.getByTestId('tokens-usage-history-toggle').click()
    await expect(page.getByTestId('tokens-usage-history-panel')).toBeVisible()
  })

  test('pricing matrix search and filters are interactive', async ({ page }) => {
    await mockTokenCenterApis(page)
    await page.goto('/tokens', { waitUntil: 'domcontentloaded' })
    await waitForTokensReady(page)

    await expect(page.getByTestId('tokens-pricing-results-count')).toContainText('Showing 2 of 2 features')

    await page.getByTestId('tokens-pricing-search-input').fill('commissioner')
    await expect(page.getByTestId('tokens-pricing-results-count')).toContainText('Showing 1 of 2 features')

    await page.getByTestId('tokens-pricing-discount-toggle').click()
    await expect(page.getByTestId('tokens-pricing-results-count')).toContainText('Showing 1 of 2 features')

    await page.getByTestId('tokens-pricing-category-select').selectOption('ai_feature')
    await expect(page.getByTestId('tokens-pricing-results-count')).toContainText('Showing 0 of 2 features')

    await page.getByTestId('tokens-pricing-clear-filters').click()
    await expect(page.getByTestId('tokens-pricing-results-count')).toContainText('Showing 2 of 2 features')
  })
})
