import { expect, test } from '@playwright/test'

test.describe('@ai reliability click audit', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })

  test('audits confidence, fallback, and provider failure interactions', async ({ page }) => {
    let providerStatusCalls = 0
    let runCalls = 0
    const runBodies: Array<Record<string, unknown>> = []

    await page.route('**/api/ai/providers/status', async (route) => {
      providerStatusCalls += 1
      if (providerStatusCalls === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'provider status down' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          openai: true,
          deepseek: true,
          grok: true,
          openclaw: true,
          openclawGrowth: true,
        }),
      })
    })

    await page.route('**/api/ai/compare', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          evidence: ['OpenAI and Grok diverge on acceptance risk'],
          aiExplanation: 'Consensus mode completed with disagreement noted.',
          actionPlan: 'Use the most risk-aware path.',
          confidence: 61,
          confidenceLabel: 'medium',
          confidenceReason: 'Confidence reduced due to provider disagreement.',
          uncertainty: 'Provider disagreement increases execution risk.',
          providerResults: [
            { provider: 'openai', raw: 'Accept with a small sweetener.' },
            { provider: 'grok', raw: 'Hold for one more week.' },
            { provider: 'deepseek', raw: '', error: 'timeout', skipped: false },
          ],
          usedDeterministicFallback: false,
          reliability: {
            usedDeterministicFallback: false,
            message: "Some AI providers didn't respond; results are based on openai and grok.",
            dataQualityWarnings: ['injury_feed missing'],
            confidence: 61,
            partialProviderFailure: true,
            providerStatus: [
              { provider: 'openai', status: 'ok' },
              { provider: 'grok', status: 'ok' },
              { provider: 'deepseek', status: 'timeout', error: 'timeout' },
            ],
            disagreement: {
              hasDisagreement: true,
              explanation: 'Providers gave different verdicts; showing highest-confidence result.',
              primaryVerdict: 'accept',
              primaryConfidence: 61,
              alternateVerdicts: [{ verdict: 'hold', confidence: 58, provider: 'grok' }],
            },
          },
          alternateOutputs: [{ provider: 'grok', text: 'Alternate output: hold and reassess after waivers.' }],
          factGuardWarnings: ['injury_feed missing'],
        }),
      })
    })

    await page.route('**/api/ai/run', async (route) => {
      runCalls += 1
      let body: Record<string, unknown> = {}
      try {
        body = (route.request().postDataJSON() as Record<string, unknown>) ?? {}
      } catch {
        body = {}
      }
      runBodies.push(body)

      if (runCalls === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            evidence: ['Fairness score 52', 'Missing injury feed'],
            aiExplanation: 'Primary output: slight edge if risk tolerance is medium.',
            actionPlan: 'If accepted, rebalance RB depth this week.',
            confidence: 64,
            confidenceLabel: 'medium',
            confidenceReason: 'Data coverage 62% with one stale feed.',
            uncertainty: 'Injury updates are stale and can change projections.',
            providerResults: [
              { provider: 'openai', raw: 'Primary output: slight edge if risk tolerance is medium.' },
              { provider: 'deepseek', raw: '', error: 'timeout', skipped: false },
              { provider: 'grok', raw: 'Alternative output: wait one week for injury clarity.' },
            ],
            usedDeterministicFallback: false,
            reliability: {
              usedDeterministicFallback: false,
              message: "Some AI providers didn't respond; results are based on openai and grok.",
              dataQualityWarnings: ['injury_feed missing', 'valuation_snapshot stale'],
              confidence: 64,
              confidenceSource: 'capped',
              partialProviderFailure: true,
              providerStatus: [
                { provider: 'openai', status: 'ok' },
                { provider: 'deepseek', status: 'timeout', error: 'timeout' },
                { provider: 'grok', status: 'ok' },
              ],
              disagreement: {
                hasDisagreement: true,
                explanation: 'Providers gave different verdicts; showing highest-confidence result.',
                primaryVerdict: 'accept',
                primaryConfidence: 64,
                alternateVerdicts: [{ verdict: 'hold', confidence: 58, provider: 'grok' }],
              },
            },
            alternateOutputs: [
              { provider: 'grok', text: 'Alternative output: wait one week for injury clarity.' },
            ],
            factGuardWarnings: ['injury_feed missing', 'valuation_snapshot stale'],
          }),
        })
        return
      }

      if (runCalls === 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            evidence: ['Deterministic fairness score 51'],
            aiExplanation: 'Deterministic fallback output only.',
            actionPlan: 'Retry for full provider analysis.',
            confidence: 52,
            confidenceLabel: 'low',
            confidenceReason: 'All providers failed; deterministic-only output.',
            uncertainty: 'Provider outages reduced output depth.',
            providerResults: [
              { provider: 'openai', raw: '', error: 'timeout', skipped: false },
              { provider: 'deepseek', raw: '', error: 'timeout', skipped: false },
              { provider: 'grok', raw: '', error: 'timeout', skipped: false },
            ],
            usedDeterministicFallback: true,
            reliability: {
              usedDeterministicFallback: true,
              fallbackExplanation:
                'AI providers are temporarily unavailable. Showing deterministic (data-only) guidance while preserving tool output.',
              dataQualityWarnings: ['deterministic_only'],
              confidence: 52,
              providerStatus: [
                { provider: 'openai', status: 'timeout', error: 'timeout' },
                { provider: 'deepseek', status: 'timeout', error: 'timeout' },
                { provider: 'grok', status: 'timeout', error: 'timeout' },
              ],
            },
            factGuardWarnings: ['deterministic_only'],
          }),
        })
        return
      }

      if (runCalls === 3) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ userMessage: 'Temporary reliability failure. Retry.' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          evidence: ['Recovered provider output'],
          aiExplanation: 'Recovery output after retry.',
          actionPlan: 'Continue with standard execution.',
          confidence: 70,
          confidenceLabel: 'medium',
          confidenceReason: 'Recovered after retry.',
          uncertainty: 'Monitor for renewed outages.',
          providerResults: [{ provider: 'openai', raw: 'Recovery output after retry.' }],
          usedDeterministicFallback: false,
          reliability: {
            usedDeterministicFallback: false,
            confidence: 70,
            providerStatus: [{ provider: 'openai', status: 'ok' }],
          },
          factGuardWarnings: [],
        }),
      })
    })

    await page.goto('/ai/tools', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('unified-ai-workbench')).toBeVisible()

    await expect(page.getByText('Unable to load').first()).toBeVisible()
    await page.getByTestId('ai-provider-status-retry-button').click()
    await expect(page.getByText(/OpenAI/i).first()).toBeVisible()

    await page.getByTestId('unified-ai-tool-selector').selectOption('trade_analyzer')
    await page.getByTestId('unified-ai-sport-selector').selectOption('SOCCER')
    await page.getByTestId('unified-ai-quick-chip-risk').click()
    await page.getByTestId('unified-ai-run-button').click()

    const resultPanel = page.getByTestId('unified-ai-result-panel')
    await expect(resultPanel).toBeVisible()
    await expect(resultPanel.getByTestId('ai-failure-state-renderer')).toBeVisible()
    await expect(resultPanel.getByTestId('ai-fallback-explanation')).toContainText(/Some AI providers/i)

    await resultPanel.getByTestId('ai-data-quality-toggle-button').click()
    await expect(resultPanel.getByTestId('ai-data-quality-details')).toBeVisible()

    await resultPanel.getByTestId('ai-confidence-info-button').click()
    await expect(resultPanel.getByTestId('ai-confidence-reason-text')).toContainText(/Data coverage/i)

    await resultPanel.getByTestId('ai-sources-toggle-button').click()
    await expect(resultPanel.getByText(/Fairness score 52/i)).toBeVisible()

    await resultPanel.getByTestId('ai-compare-providers-toggle-button').click()
    await expect(resultPanel.getByTestId('ai-provider-failure-note')).toBeVisible()
    await expect(resultPanel.getByTestId('ai-provider-output-deepseek')).toContainText(/Provider failed/i)

    await expect(resultPanel.getByTestId('unified-ai-alternate-output-panel')).toBeVisible()
    await resultPanel.getByTestId('unified-ai-alternate-output-grok-button').click()
    await expect(resultPanel.getByTestId('unified-ai-explanation-text')).toContainText(/Alternative output: wait one week/i)
    await expect(resultPanel.getByTestId('unified-ai-disagreement-note')).toContainText(/different verdicts/i)

    await page.getByTestId('unified-ai-regenerate-button').click()
    await expect(resultPanel.getByTestId('ai-fallback-explanation')).toContainText(/deterministic/i)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId('unified-ai-run-button').click()
    await expect(page.getByTestId('unified-ai-mobile-error-state')).toBeVisible()

    await page.getByTestId('unified-ai-mobile-drawer-open-button').click()
    const mobileDrawer = page.getByTestId('unified-ai-mobile-drawer')
    const drawerErrorState = page.getByTestId('unified-ai-mobile-drawer-error-state')
    await expect(drawerErrorState).toBeVisible()
    await drawerErrorState.getByTestId('ai-error-retry-button').click({ force: true })
    await expect(mobileDrawer.getByText(/Recovery output after retry/i)).toBeVisible()
    await page.getByTestId('unified-ai-mobile-drawer-close-button').click()

    await page.getByTestId('unified-ai-back-button').click()
    await expect(page.getByTestId('unified-ai-prompt-input')).toHaveValue('')

    expect(runBodies.length).toBeGreaterThanOrEqual(3)
    expect((runBodies[0] as { sport?: string })?.sport).toBe('SOCCER')
  })
})
