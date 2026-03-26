import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@chimmy chimmy interface click audit', () => {
  test('audits Chimmy text, voice, context routing, and mobile drawer controls', async ({ page }) => {
    let chatCalls = 0
    const chatBodies: string[] = []
    let forcedErrorUsed = false

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

      const speechState = {
        speaking: false,
        pending: false,
        activeUtterance: null as SpeechSynthesisUtterance | null,
      }
      const synth = {
        get speaking() {
          return speechState.speaking
        },
        get pending() {
          return speechState.pending
        },
        cancel() {
          speechState.pending = false
          speechState.speaking = false
          const utterance = speechState.activeUtterance
          speechState.activeUtterance = null
          if (utterance && typeof utterance.onend === 'function') {
            utterance.onend(new Event('end'))
          }
        },
        speak(utterance: SpeechSynthesisUtterance) {
          speechState.activeUtterance = utterance
          speechState.pending = true
          setTimeout(() => {
            if (speechState.activeUtterance !== utterance) return
            speechState.pending = false
            speechState.speaking = true
            setTimeout(() => {
              if (speechState.activeUtterance !== utterance) return
              speechState.speaking = false
              if (typeof utterance.onend === 'function') {
                utterance.onend(new Event('end'))
              }
            }, 250)
          }, 10)
        },
        getVoices() {
          return [{ name: 'Test Voice', lang: 'en-US' }]
        },
      }
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: synth,
      })

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

    await page.route('**/api/chat/chimmy', async (route) => {
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
          },
        }),
      })
    })

    await page.goto('/e2e/chimmy-interface', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Chimmy Interface Harness' })).toBeVisible()

    await expect(page.getByTestId('chimmy-harness-entry-primary-link')).toHaveAttribute('href', /\/messages\?tab=ai/)
    await expect(page.getByTestId('chimmy-harness-entry-prompted-link')).toHaveAttribute('href', /prompt=/)
    await expect(page.getByTestId('chimmy-harness-entry-matchup-link')).toHaveAttribute('href', /insightType=matchup/)
    await expect(page.getByTestId('chimmy-harness-entry-playoff-link')).toHaveAttribute('href', /insightType=playoff/)

    const inlineShell = page.getByTestId('chimmy-harness-inline-shell')
    const inlineInput = inlineShell.getByTestId('chimmy-message-input')
    await expect(inlineShell.getByTestId('chimmy-tool-context')).toBeVisible()
    await expect(inlineInput).toHaveValue(/evaluate this trade/i)
    await page.getByTestId('chimmy-harness-route-waiver-button').click()
    await expect(inlineShell.getByTestId('chimmy-chat-shell')).toBeVisible()

    await inlineShell.getByTestId('chimmy-quick-prompt-start-sit').click()
    await expect(inlineInput).toHaveValue(/start and sit/i)

    await inlineInput.fill('Break down this trade with evidence.')
    await inlineShell.getByTestId('chimmy-send-button').click()
    await expect(inlineShell.getByTestId('chimmy-loading-state')).toBeVisible()
    await expect.poll(() => chatCalls).toBe(1)
    await expect(inlineShell.getByText(/Calm response 1/i)).toBeVisible()
    await expect(inlineShell.getByText(/Confidence:/i)).toBeVisible()

    await inlineInput.fill('Second message sent with Enter key.')
    await inlineInput.press('Enter')
    await expect.poll(() => chatCalls).toBe(2)
    await expect(inlineShell.getByText(/Calm response 2/i)).toBeVisible()

    const followUpChip = inlineShell.getByTestId('chimmy-follow-up-chip-explain-that-in-more-detail')
    await expect(followUpChip).toBeVisible()
    await followUpChip.click()
    await expect(inlineInput).toHaveValue(/explain that in more detail/i)

    await inlineShell.getByTestId('chimmy-copy-response-button').click()
    await expect
      .poll(async () => page.evaluate(() => ((window as any).__copiedTexts as string[]).length))
      .toBeGreaterThan(0)

    await inlineShell.getByTestId('chimmy-retry-button').click()
    await expect.poll(() => chatCalls).toBe(3)
    await expect(inlineShell.getByText(/Calm response 3/i)).toBeVisible()

    await expect(inlineShell.getByTestId('chimmy-open-provider-compare-button')).toBeVisible()
    await inlineShell.getByTestId('chimmy-open-provider-compare-button').click()
    await expect(page.getByTestId('chimmy-harness-compare-count')).toContainText('1')

    await inlineShell.getByTestId('chimmy-voice-toggle-button').click()
    await inlineShell.getByTestId('chimmy-voice-toggle-button').click()
    await inlineShell.getByTestId('chimmy-listen-response-button').click()
    await expect(inlineShell.getByTestId('chimmy-voice-stop-button')).toBeVisible()
    await inlineShell.getByTestId('chimmy-voice-stop-button').click()

    await inlineInput.fill('')
    await inlineShell.getByTestId('chimmy-voice-input-button').click()
    await expect(inlineInput).toHaveValue(/voice input from test harness/i)

    await inlineInput.fill('force_error_case')
    await inlineShell.getByTestId('chimmy-send-button').click()
    await expect(inlineShell.getByTestId('chimmy-inline-error')).toContainText(
      /Temporary Chimmy failure|Failed to send/i
    )
    await inlineShell.getByTestId('chimmy-retry-button').click()
    await expect.poll(() => chatCalls).toBe(4)
    await expect(inlineShell.getByText(/Calm response 4/i)).toBeVisible()

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

    expect(chatBodies.some((body) => body.includes('leagueId'))).toBeTruthy()
  })
})

