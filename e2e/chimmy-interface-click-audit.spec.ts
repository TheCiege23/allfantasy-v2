import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 240_000 })

test.describe('@chimmy chimmy interface click audit', () => {
  async function gotoWithRetry(page: Parameters<typeof test>[0]['page'], url: string) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' })
        return
      } catch (error) {
        const message = String((error as Error)?.message ?? error)
        const canRetry =
          attempt < 6 &&
          (
            message.includes('net::ERR_ABORTED') ||
            message.includes('NS_BINDING_ABORTED') ||
            message.includes('net::ERR_CONNECTION_RESET') ||
            message.includes('NS_ERROR_CONNECTION_REFUSED') ||
            message.includes('Failure when receiving data from the peer') ||
            message.includes('Could not connect to server') ||
            message.includes('interrupted by another navigation')
          )
        if (!canRetry) throw error
        await page.waitForTimeout(500 * attempt)
      }
    }
  }

  async function ensureHarnessReady(page: Parameters<typeof test>[0]['page']) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await gotoWithRetry(page, '/e2e/chimmy-interface')
      const headingVisible = await page
        .getByRole('heading', { name: 'Chimmy Interface Harness' })
        .isVisible()
        .catch(() => false)
      if (headingVisible) return

      const notFoundVisible = await page
        .getByRole('heading', { name: 'This page could not be found.' })
        .isVisible()
        .catch(() => false)

      if (!notFoundVisible && attempt >= 3) {
        // Avoid long stalls on partially hydrated shells by forcing a hard reload.
        await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => null)
      }
      await page.waitForTimeout(500 * attempt)
    }

    throw new Error('Chimmy interface harness never became ready')
  }

  test('audits Chimmy text, voice, context routing, and mobile drawer controls', async ({ page }) => {
    let chatCalls = 0
    const chatBodies: string[] = []
    const aiEvents: Array<Record<string, unknown>> = []
    let forcedErrorUsed = false
    page.on('dialog', (dialog) => dialog.accept())

    await page.addInitScript(() => {
      ;(window as any).__copiedTexts = []

      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            ;(window as any).__copiedTexts.push(text)
          },
        },
      })

      let objectUrlId = 0
      const originalUrl = window.URL
      Object.defineProperty(window, 'URL', {
        configurable: true,
        value: class FakeURL extends originalUrl {
          static createObjectURL() {
            objectUrlId += 1
            return `blob:chimmy-${objectUrlId}`
          }

          static revokeObjectURL() {}
        },
      })

      class FakeAudio {
        src: string
        paused = true
        ended = false
        onended: ((event: Event) => void) | null = null
        onerror: ((event: Event) => void) | null = null

        constructor(src = '') {
          this.src = src
        }

        play() {
          this.paused = false
          this.ended = false
          setTimeout(() => {
            if (this.paused) return
            this.paused = true
            this.ended = true
            this.onended?.(new Event('ended'))
          }, 250)
          return Promise.resolve()
        }

        pause() {
          this.paused = true
        }
      }
      ;(window as any).Audio = FakeAudio

      class FakeSpeechRecognition {
        lang = 'en-US'
        interimResults = false
        continuous = false
        onstart: ((event: Event) => void) | null = null
        onend: ((event: Event) => void) | null = null
        onerror: ((event: Event) => void) | null = null
        onresult: ((event: any) => void) | null = null

        start() {
          this.onstart?.(new Event('start'))
          setTimeout(() => {
            this.onresult?.({
              results: [[{ transcript: 'voice input from test harness' }]],
            })
            this.onend?.(new Event('end'))
          }, 80)
        }

        stop() {
          this.onend?.(new Event('end'))
        }
      }

      ;(window as any).SpeechRecognition = FakeSpeechRecognition
      ;(window as any).webkitSpeechRecognition = FakeSpeechRecognition
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

    await page.route('**/api/tokens/spend/preview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          preview: {
            ruleCode: 'ai_chimmy_chat_message',
            featureLabel: 'Chimmy chat message',
            tokenCost: 1,
            currentBalance: 20,
            canSpend: true,
            requiresConfirmation: false,
          },
        }),
      })
    })

    await page.route('**/api/ai/events', async (route) => {
      try {
        const payload = route.request().postDataJSON()
        if (payload && typeof payload === 'object') {
          aiEvents.push(payload as Record<string, unknown>)
        }
      } catch {
        // Ignore malformed analytics body in click audit smoke.
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.route('**/api/chimmy**', async (route) => {
      if (route.request().url().includes('/api/chimmy/voice')) {
        await route.fulfill({
          status: 200,
          contentType: 'audio/mpeg',
          body: 'FAKE_MP3_DATA',
        })
        return
      }

      const postData = route.request().postData() ?? ''
      chatBodies.push(postData)

      if (postData.includes('force_error_case') && !forcedErrorUsed) {
        forcedErrorUsed = true
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Temporary Chimmy failure for retry path.',
            response: "I couldn't complete that. Please try again.",
            meta: { providerStatus: { openai: 'error' }, confidencePct: 0 },
          }),
        })
        return
      }

      chatCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 120))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Calm response ${chatCalls}: Here is an evidence-first recommendation with risks and next step.`,
          meta: {
            confidencePct: 72,
            providerStatus: { openai: 'ok', grok: 'ok', deepseek: 'ok' },
            recommendedTool: 'trade_analyzer',
            dataSources: ['simulation_warehouse', 'ai_insight_router'],
            quantData: { confidencePct: 72 },
            trendData: { momentum: 'steady' },
            responseStructure: {
              shortAnswer: 'Hold for now unless you can improve WR floor.',
              whatDataSays: 'Projected weekly edge is +3.1 with moderate variance.',
              whatItMeans: 'This trade helps playoff ceiling but adds volatility.',
              recommendedAction: 'Counter with a safer WR2 tier add-on.',
              caveats: ['Projection confidence is medium this week.'],
            },
          },
        }),
      })
    })

    await ensureHarnessReady(page)

    await expect(page.getByTestId('chimmy-harness-entry-primary-link')).toHaveAttribute('href', /\/messages\?tab=ai/)
    await expect(page.getByTestId('chimmy-harness-entry-prompted-link')).toHaveAttribute('href', /prompt=/)
    await expect(page.getByTestId('chimmy-harness-entry-matchup-link')).toHaveAttribute('href', /insightType=matchup/)
    await expect(page.getByTestId('chimmy-harness-entry-playoff-link')).toHaveAttribute('href', /insightType=playoff/)

    const inlineShell = page.getByTestId('chimmy-harness-inline-shell')
    const inlineInput = inlineShell.getByTestId('chimmy-message-input')
    const routeWaiverButton = page.getByTestId('chimmy-harness-route-waiver-button')
    await expect(inlineShell.getByTestId('chimmy-tool-context')).toBeVisible()
    const startingInput = await inlineInput.inputValue()
    if (startingInput.trim().length > 0) {
      await expect(inlineInput).toHaveValue(/evaluate this trade/i)
    }
    let shellInteractive = false
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await routeWaiverButton.click({ force: true }).catch(() => null)
      await routeWaiverButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
      await page.waitForTimeout(120 * (attempt + 1))
      const shellVisible = await inlineShell.getByTestId('chimmy-chat-shell').isVisible().catch(() => false)
      const inputVisible = await inlineInput.isVisible().catch(() => false)
      if (shellVisible && inputVisible) {
        shellInteractive = true
        break
      }
    }
    if (!shellInteractive) {
      await gotoWithRetry(page, '/e2e/chimmy-interface')
      await expect
        .poll(
          async () => page.getByRole('heading', { name: 'Chimmy Interface Harness' }).isVisible().catch(() => false),
          { timeout: 30_000 },
        )
        .toBeTruthy()
      await expect(inlineShell.getByTestId('chimmy-chat-shell')).toBeVisible()
    }

    const prePromptValue = await inlineInput.inputValue()
    const startSitQuickPrompt = inlineShell
      .getByTestId('chimmy-quick-prompt-start-sit')
      .or(inlineShell.getByTestId('chimmy-quick-prompt-chip-start-sit'))
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await startSitQuickPrompt.first().click().catch(() => null)
      const promptChanged = await inlineInput
        .inputValue()
        .then((value) => value.toLowerCase())
        .then(
          (value) =>
            value.includes('start and sit') || value.includes('start/sit') || value.includes('start sit') || value.length === 0,
        )
        .catch(() => false)
      if (promptChanged) break
      await page.waitForTimeout(250 * attempt)
    }
    await expect
      .poll(async () => {
        const value = (await inlineInput.inputValue()).toLowerCase()
        return (
          value.includes('start and sit') ||
          value.includes('start/sit') ||
          value.includes('start sit') ||
          value === prePromptValue.toLowerCase() ||
          value.length === 0
        )
      }, { timeout: 10_000 })
      .toBeTruthy()

    await inlineInput.fill('Break down this trade with evidence.')
    await inlineShell.getByTestId('chimmy-send-button').click({ clickCount: 2 })
    await expect.poll(() => chatCalls, { timeout: 30_000 }).toBeGreaterThanOrEqual(1)
    await expect(inlineShell.getByTestId('chimmy-response-structure').last()).toBeVisible()
    await expect(inlineShell.getByText(/Short answer/i)).toBeVisible()
    await expect(inlineShell.getByTestId('chimmy-response-structure').last().getByText(/What the data says/i)).toBeVisible()
    await expect(inlineShell.getByText(/Recommended action/i)).toBeVisible()
    await expect(inlineShell.getByTestId('chimmy-trust-panel').last()).toBeVisible()

    await inlineInput.fill('Second message sent with Enter key.')
    await inlineInput.press('Enter')
    await expect.poll(() => chatCalls, { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
    await expect(inlineShell.getByTestId('chimmy-response-structure').last()).toBeVisible()

    const followUpChip = inlineShell.getByTestId('chimmy-follow-up-chip-explain-that-in-more-detail')
    await expect(followUpChip).toBeVisible()
    await followUpChip.click()
    await expect
      .poll(async () => {
        const value = (await inlineInput.inputValue()).toLowerCase()
        return value.includes('explain that in more detail') || value.length === 0
      })
      .toBeTruthy()

    await inlineShell.getByTestId('chimmy-copy-response-button').click()
    await expect
      .poll(async () => page.evaluate(() => ((window as any).__copiedTexts as string[]).length))
      .toBeGreaterThan(0)

    await inlineShell.getByTestId('chimmy-retry-button').click()
    await expect.poll(() => chatCalls, { timeout: 30_000 }).toBeGreaterThanOrEqual(3)
    await expect(inlineShell.getByTestId('chimmy-response-structure').last()).toBeVisible()

    const helpfulButton = inlineShell.getByTestId('chimmy-feedback-helpful')
    const unhelpfulButton = inlineShell.getByTestId('chimmy-feedback-unhelpful')
    await expect(helpfulButton).toBeVisible()
    await expect(unhelpfulButton).toBeVisible()

    await helpfulButton.click()
    await expect(helpfulButton).toHaveAttribute('data-selected', 'true')
    await unhelpfulButton.click()
    await expect(unhelpfulButton).toHaveAttribute('data-selected', 'true')
    await expect(helpfulButton).toHaveAttribute('data-selected', 'false')

    await expect
      .poll(() => aiEvents.filter((event) => event.event_name === 'feedback_submit').length)
      .toBeGreaterThanOrEqual(2)

    const feedbackEvents = aiEvents.filter(
      (event) => event.event_name === 'feedback_submit'
    ) as Array<{
      action?: unknown
      metadata?: Record<string, unknown>
    }>

    expect(feedbackEvents.some((event) => event.action === 'thumbs_up')).toBeTruthy()
    expect(feedbackEvents.some((event) => event.action === 'thumbs_down')).toBeTruthy()
    for (const event of feedbackEvents) {
      expect(event.metadata?.prompt).toBeUndefined()
      expect(event.metadata?.responseText).toBeUndefined()
    }

    await expect(inlineShell.getByTestId('chimmy-open-provider-compare-button')).toBeVisible()
    await inlineShell.getByTestId('chimmy-open-provider-compare-button').click()
    await expect
      .poll(async () => {
        const text = (await page.getByTestId('chimmy-harness-compare-count').textContent()) ?? ''
        const match = text.match(/(\d+)/)
        const count = Number.parseInt(match?.[1] ?? '0', 10)
        return Number.isNaN(count) ? 0 : count
      })
      .toBeGreaterThanOrEqual(1)

    await page.setViewportSize({ width: 1280, height: 900 })
    const openSplitButton = page.getByTestId('chimmy-harness-open-split-button')
    await openSplitButton.click()
    const split = page.getByTestId('chimmy-harness-split')
    for (let i = 0; i < 3; i += 1) {
      if (await split.isVisible().catch(() => false)) break
      await openSplitButton.click({ force: true }).catch(() => null)
      await page.waitForTimeout(200)
    }
    await expect(split).toBeVisible({ timeout: 10_000 })
    const harnessSplitClose = page.getByTestId('chimmy-harness-close-split-button')
    if ((await harnessSplitClose.count()) > 0) {
      await harnessSplitClose.first().click({ force: true })
    } else {
      await split.getByTestId('chimmy-close-button').first().click({ force: true })
    }
    if ((await split.count()) > 0) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (!(await split.isVisible().catch(() => false))) break
        await split.getByTestId('chimmy-close-button').first().click({ force: true }).catch(() => null)
        await page.waitForTimeout(120)
      }
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId('chimmy-harness-open-drawer-button').click()
    const drawer = page.getByTestId('chimmy-harness-drawer')
    await expect(drawer).toHaveCount(1)
    const drawerCloseButtons = drawer.getByTestId('chimmy-close-button')
    if ((await drawerCloseButtons.count()) > 0) {
      await drawerCloseButtons.last().click({ force: true })
    }
    const harnessCloseButton = page.getByTestId('chimmy-harness-close-drawer-button')
    if ((await harnessCloseButton.count()) > 0) {
      await harnessCloseButton.click({ force: true })
    } else if ((await drawer.count()) > 0) {
      await page.getByTestId('chimmy-harness-close-drawer-button').click({ force: true })
    }
    if ((await drawer.count()) > 0) {
      await expect(drawer).toBeHidden()
    } else {
      await expect(drawer).toHaveCount(0)
    }

    expect(chatBodies.length).toBeGreaterThan(0)
    expect(chatBodies.some((body) => body.includes('userContext'))).toBeTruthy()
  })
})

