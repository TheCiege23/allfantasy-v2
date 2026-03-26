import { expect, test } from '@playwright/test'

test.describe('@ai unified ai interface click audit', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })

  async function clickEntryAndWaitForPrompt(
    page: Parameters<typeof test>[0]['page'],
    entryTestId: string,
    expectedPattern: RegExp
  ) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page.getByTestId(entryTestId).click({ force: true })
      const value = await page.getByTestId('unified-ai-prompt-input').inputValue()
      if (expectedPattern.test(value)) return
      await page.waitForTimeout(400)
    }
    await expect(page.getByTestId('unified-ai-prompt-input')).toHaveValue(expectedPattern)
  }

  test('audits unified ai workbench interactions end-to-end', async ({ page }) => {
    let runCalls = 0
    let compareCalls = 0
    const runBodies: Array<Record<string, unknown>> = []
    const compareBodies: Array<Record<string, unknown>> = []

    await page.addInitScript(() => {
      ;(window as any).__copiedTexts = []
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text: string) => {
            ;(window as any).__copiedTexts.push(text)
            return Promise.resolve()
          },
        },
      })
    })

    await page.route('**/api/ai/providers/status', async (route) => {
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
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ userMessage: 'Temporary orchestration failure. Retry.' }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          evidence: ['Fairness score 53', 'Acceptance probability 61%'],
          aiExplanation:
            'Based on deterministic context, this move is slightly favorable and improves near-term lineup stability while preserving future flexibility.',
          actionPlan: 'Proceed if your roster can absorb short-term variance.',
          confidence: 72,
          uncertainty: 'Injury volatility can shift the edge quickly.',
          providerResults: [
            { provider: 'openai', raw: 'OpenAI synthesis response.' },
            { provider: 'deepseek', raw: 'DeepSeek analytical response.' },
          ],
          usedDeterministicFallback: false,
        }),
      })
    })

    await page.route('**/api/ai/compare', async (route) => {
      compareCalls += 1
      let body: Record<string, unknown> = {}
      try {
        body = (route.request().postDataJSON() as Record<string, unknown>) ?? {}
      } catch {
        body = {}
      }
      compareBodies.push(body)

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          evidence: ['Consensus agreement on trade value', 'Trend risk elevated'],
          aiExplanation: 'Consensus: favorable value with moderate downside risk.',
          actionPlan: 'Counter with a small sweetener to raise acceptance.',
          confidence: 68,
          uncertainty: 'Market shifts can change acceptance odds.',
          providerResults: [
            { provider: 'openai', raw: 'OpenAI response' },
            { provider: 'deepseek', raw: 'DeepSeek response' },
            { provider: 'grok', raw: 'Grok response' },
          ],
          usedDeterministicFallback: false,
        }),
      })
    })

    await page.goto('/ai', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('ai-system-try-tools-button')).toHaveAttribute('href', '/ai/tools')
    await page.getByTestId('ai-system-try-tools-button').click()
    await expect(page).toHaveURL(/\/ai\/tools/)

    await expect(page.getByTestId('unified-ai-workbench')).toBeVisible()
    await page.waitForTimeout(1200)

    await expect(page.getByTestId('ai-tools-back-link')).toBeVisible()
    await expect(page.getByTestId('ai-tool-card-trade')).toBeVisible()

    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-explain-trade-button', /trade/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-waiver-button', /waiver/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-draft-button', /(clock|pick)/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-rankings-button', /rankings/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-psychological-button', /profile/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-story-button', /storyline/i)
    await clickEntryAndWaitForPrompt(page, 'unified-ai-entry-ask-ai-button', /best move/i)

    await page.getByTestId('unified-ai-tool-selector').selectOption('trade_analyzer')

    await page.getByTestId('unified-ai-quick-chip-trade').click()
    await expect(page.getByTestId('unified-ai-prompt-input')).toHaveValue(/fairness/i)
    await page.getByTestId('unified-ai-sport-selector').selectOption('SOCCER')
    await page.getByTestId('ai-mode-selector').selectOption('consensus')

    await page.getByTestId('unified-ai-run-button').click()
    await expect(page.getByTestId('unified-ai-error-state')).toBeVisible()
    await page.getByRole('button', { name: 'Retry' }).click()

    const primaryResultPanel = page.getByTestId('unified-ai-result-panel').first()
    await expect(primaryResultPanel).toBeVisible()
    await expect(primaryResultPanel.getByText(/slightly favorable/i).first()).toBeVisible()

    await primaryResultPanel.getByTestId('unified-ai-explanation-toggle-button').click()
    await expect(primaryResultPanel.getByTestId('unified-ai-explanation-toggle-button')).toContainText(/Collapse|Expand/i)
    const copyButton = page.getByTestId('unified-ai-copy-button').first()
    await expect(copyButton).toBeEnabled()
    await copyButton.click()

    await expect
      .poll(async () => page.evaluate(() => ((window as any).__copiedTexts as string[]).length))
      .toBeGreaterThan(0)

    await page.getByTestId('ai-provider-compare-button').first().click()
    await expect.poll(() => compareCalls).toBe(1)
    await expect(primaryResultPanel.getByTestId('ai-compare-providers-toggle-button').first()).toBeVisible()
    await primaryResultPanel.getByTestId('ai-compare-providers-toggle-button').first().click()
    await expect(primaryResultPanel.getByText('OpenAI response').first()).toBeVisible()

    await page.getByTestId('unified-ai-regenerate-button').first().click()
    await expect.poll(() => compareCalls).toBe(2)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId('unified-ai-mobile-drawer-open-button').click()
    await expect(page.getByTestId('unified-ai-mobile-drawer-close-button')).toBeVisible()
    await page.getByTestId('unified-ai-mobile-drawer-close-button').click()

    await page.getByTestId('unified-ai-back-button').click()
    await expect(page.getByTestId('unified-ai-prompt-input')).toHaveValue('')

    await expect(page.getByTestId('unified-ai-chat-open-button')).toHaveAttribute('href', /\/messages\?tab=ai/)
    await expect(page.getByTestId('unified-ai-open-chimmy-with-prompt-link')).toHaveAttribute(
      'href',
      /\/messages\?tab=ai/
    )

    expect(runBodies.length).toBeGreaterThanOrEqual(2)
    expect(compareBodies.length).toBeGreaterThanOrEqual(1)
    expect((runBodies[0] as { sport?: string })?.sport).toBe('SOCCER')
    expect((compareBodies[0] as { aiMode?: string })?.aiMode).toBe('consensus')
  })
})

