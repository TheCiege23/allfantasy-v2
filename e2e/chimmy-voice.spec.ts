import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

async function gotoWithRetry(page: Page, url: string): Promise<void> {
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

async function waitForShell(page: Page) {
  const shell = page.getByTestId('chimmy-harness-inline-shell')
  const routeWaiverButton = page.getByTestId('chimmy-harness-route-waiver-button')
  const input = shell.getByTestId('chimmy-message-input')

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await routeWaiverButton.click({ force: true }).catch(() => null)
    await routeWaiverButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
    await page.waitForTimeout(120 * (attempt + 1))

    const shellVisible = await shell.getByTestId('chimmy-chat-shell').isVisible().catch(() => false)
    const inputVisible = await input.isVisible().catch(() => false)
    if (shellVisible && inputVisible) return { shell, input }
  }

  throw new Error('Chimmy shell never became interactive')
}

async function stubCommonRoutes(page: Page) {
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
}

async function installSpeechHarness(page: Page) {
  await page.addInitScript(() => {
    ;(window as any).__speechTest = {
      audioPlayCalls: 0,
      audioPauseCalls: 0,
      audioSources: [] as string[],
      speechSynthesisCalls: 0,
      speechSynthesisCancels: 0,
      speechTexts: [] as string[],
      recognitionStarts: 0,
      recognitionStops: 0,
      lastTranscript: '',
    }

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
        ;(window as any).__speechTest.audioPlayCalls += 1
        ;(window as any).__speechTest.audioSources.push(this.src)
        this.paused = false
        this.ended = false

        setTimeout(() => {
          if (this.paused) return
          this.paused = true
          this.ended = true
          this.onended?.(new Event('ended'))
        }, 350)

        return Promise.resolve()
      }

      pause() {
        ;(window as any).__speechTest.audioPauseCalls += 1
        this.paused = true
      }
    }
    ;(window as any).Audio = FakeAudio

    class FakeSpeechSynthesisUtterance {
      text: string
      rate = 1
      pitch = 1
      volume = 1
      voice: SpeechSynthesisVoice | null = null
      onend: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: FakeSpeechSynthesisUtterance,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        getVoices() {
          return [
            { name: 'Samantha', lang: 'en-US' },
            { name: 'Google US English', lang: 'en-US' },
          ]
        },
        cancel() {
          ;(window as any).__speechTest.speechSynthesisCancels += 1
          this.speaking = false
          this.pending = false
        },
        speak(utterance: InstanceType<typeof FakeSpeechSynthesisUtterance>) {
          ;(window as any).__speechTest.speechSynthesisCalls += 1
          ;(window as any).__speechTest.speechTexts.push(utterance.text)
          this.speaking = true
          this.pending = false
          setTimeout(() => {
            this.speaking = false
            utterance.onend?.(new Event('end'))
          }, 120)
        },
      },
    })

    class FakeSpeechRecognition {
      lang = 'en-US'
      interimResults = false
      continuous = false
      onstart: ((event: Event) => void) | null = null
      onend: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null
      onresult: ((event: { results: [[{ transcript: string }]] }) => void) | null = null

      start() {
        ;(window as any).__speechTest.recognitionStarts += 1
        this.onstart?.(new Event('start'))
        setTimeout(() => {
          ;(window as any).__speechTest.lastTranscript = 'voice input from test harness'
          this.onresult?.({
            results: [[{ transcript: 'voice input from test harness' }]],
          })
          this.onend?.(new Event('end'))
        }, 80)
      }

      stop() {
        ;(window as any).__speechTest.recognitionStops += 1
        this.onend?.(new Event('end'))
      }
    }

    ;(window as any).SpeechRecognition = FakeSpeechRecognition
    ;(window as any).webkitSpeechRecognition = FakeSpeechRecognition
  })
}

test.describe('@chimmy Chimmy voice coverage', () => {
  test('transcribes mic input and reads assistant replies aloud', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept())

    await installSpeechHarness(page)
    await stubCommonRoutes(page)

    await page.route('**/api/tokens/spend/preview?**', async (route) => {
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
            requiresConfirmation: true,
          },
        }),
      })
    })

    const ttsBodies: Array<Record<string, unknown>> = []
    await page.route('**/api/tts', async (route) => {
      ttsBodies.push(route.request().postDataJSON() as Record<string, unknown>)
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: 'FAKE_MP3_DATA',
      })
    })

    let chatCalls = 0
    await page.route('**/api/chimmy', async (route) => {
      chatCalls += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Calm response ${chatCalls}: Here is an evidence-first recommendation with risks and next step.`,
          meta: {
            confidencePct: 72,
            providerStatus: { openai: 'ok', grok: 'ok', deepseek: 'ok' },
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

    await gotoWithRetry(page, '/e2e/chimmy-interface')
    const { shell, input } = await waitForShell(page)
    await page.waitForTimeout(300)

    await expect(shell.getByTestId('chimmy-voice-toggle-button')).toBeEnabled()
    await expect(shell.getByTestId('chimmy-voice-choice-group')).toHaveCount(0)
    await expect(shell.getByTestId('chimmy-voice-input-button')).toBeEnabled()

    let micCapturedTranscript = false
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await shell.getByTestId('chimmy-voice-input-button').click()
      try {
        await expect
          .poll(
            async () => {
              const value = await input.inputValue()
              return value.includes('voice input from test harness')
            },
            { timeout: 2_000 }
          )
          .toBe(true)
        micCapturedTranscript = true
        break
      } catch (error) {
        if (attempt === 2) throw error
        await page.waitForTimeout(250)
      }
    }

    expect(micCapturedTranscript).toBe(true)

    const speechAfterMic = await page.evaluate(() => (window as any).__speechTest)
    expect(speechAfterMic.recognitionStarts).toBeGreaterThanOrEqual(1)
    expect(speechAfterMic.lastTranscript).toBe('voice input from test harness')

    await shell.getByTestId('chimmy-send-button').click()
    await expect.poll(() => chatCalls).toBe(1)
    await expect(shell.getByTestId('chimmy-response-structure').last()).toBeVisible()

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => (window as any).__speechTest)
        return state.audioPlayCalls
      })
      .toBe(0)

    const listenButton = shell.getByTestId('chimmy-play-voice-button').last()
    await expect(listenButton).toBeEnabled()
    await listenButton.click()

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => (window as any).__speechTest)
        return state.audioPlayCalls
      })
      .toBeGreaterThanOrEqual(1)

    const speechAfterManualPlay = await page.evaluate(() => (window as any).__speechTest)
    expect(speechAfterManualPlay.audioSources[0]).toContain('blob:chimmy-')
    expect(ttsBodies[0]?.text).toContain('Calm response 1')

    const pauseCallsBeforeStop = await page.evaluate(() => (window as any).__speechTest.audioPauseCalls)
    const stopButton = shell.getByTestId('chimmy-voice-stop-button')
    await expect(stopButton).toBeVisible()
    await stopButton.click()

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => (window as any).__speechTest)
        return state.audioPauseCalls
      })
      .toBeGreaterThan(pauseCallsBeforeStop)
  })

  test('disables voice controls when browser speech APIs are unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as any).Audio = undefined
      Object.defineProperty(window.URL, 'createObjectURL', {
        configurable: true,
        value: undefined,
      })
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: undefined,
      })
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: undefined,
      })
      ;(window as any).SpeechRecognition = undefined
      ;(window as any).webkitSpeechRecognition = undefined
    })

    await stubCommonRoutes(page)
    await gotoWithRetry(page, '/e2e/chimmy-interface')
    const { shell } = await waitForShell(page)

    await expect(shell.getByTestId('chimmy-voice-toggle-button')).toBeDisabled()
    await expect(shell.getByTestId('chimmy-voice-input-button')).toBeDisabled()
    await expect(shell.getByTestId('chimmy-voice-choice-group')).toHaveCount(0)
    await expect(shell.getByText('Voice unavailable')).toBeVisible()
    await expect(shell.getByText('Mic unavailable')).toBeVisible()
  })

  test('falls back to browser speech synthesis when server TTS is unavailable', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept())

    await installSpeechHarness(page)
    await stubCommonRoutes(page)

    await page.route('**/api/tokens/spend/preview?**', async (route) => {
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
            requiresConfirmation: true,
          },
        }),
      })
    })

    await page.route('**/api/tts', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: {
          'X-Chimmy-TTS-Fallback': 'browser',
        },
        body: JSON.stringify({
          error: 'TTS not configured',
        }),
      })
    })

    await page.route('**/api/chimmy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response:
            'Recommendation: REJECT this trade. CeeDee Lamb is six years younger and still gives you the better dynasty insulation.',
          meta: {
            responseStructure: {
              shortAnswer: 'Reject this trade.',
              recommendedAction: 'Recommendation: REJECT this trade.',
            },
          },
        }),
      })
    })

    await gotoWithRetry(page, '/e2e/chimmy-interface')
    const { shell, input } = await waitForShell(page)
    await input.fill('Should I do this trade?')
    await shell.getByTestId('chimmy-send-button').click()
    await expect(shell.getByTestId('chimmy-response-structure').last()).toBeVisible()

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => (window as any).__speechTest)
        return state.speechSynthesisCalls
      })
      .toBe(0)

    await shell.getByTestId('chimmy-play-voice-button').last().click()

    await expect
      .poll(async () => {
        const state = await page.evaluate(() => (window as any).__speechTest)
        return state.speechSynthesisCalls
      })
      .toBeGreaterThanOrEqual(1)

    const fallbackState = await page.evaluate(() => (window as any).__speechTest)
    expect(fallbackState.speechTexts[0]).toContain('REJECT this trade')
    expect(fallbackState.audioPlayCalls).toBe(0)
  })
})
