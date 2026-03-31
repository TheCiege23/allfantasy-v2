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

test.describe('@chimmy Chimmy image upload', () => {
  test('uploads an image and sends it through the existing Chimmy JSON flow', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept())

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

    let chimmyCalls = 0
    await page.route('**/api/chimmy', async (route) => {
      chimmyCalls += 1

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Image upload fallback handled correctly in Chimmy.',
          meta: {
            confidencePct: 74,
            providerStatus: { openai: 'ok' },
            responseStructure: {
              shortAnswer: 'The uploaded image was accepted and sent through Chimmy.',
              recommendedAction: 'Use the existing Chimmy flow for image uploads until Claude vision is added.',
              caveats: ['Current image handling falls back away from the Anthropic pipeline.'],
            },
          },
        }),
      })
    })

    await gotoWithRetry(page, '/e2e/chimmy-interface')
    const shell = page.getByTestId('chimmy-harness-inline-shell')
    const input = shell.getByTestId('chimmy-message-input')
    await expect(shell.getByTestId('chimmy-chat-shell')).toBeVisible({ timeout: 10_000 })
    await expect(input).toBeVisible({ timeout: 10_000 })
    await page.waitForTimeout(250)

    await input.fill('')

    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAJqLx2sAAAAASUVORK5CYII=',
      'base64'
    )

    await shell.getByTestId('chimmy-image-upload-input').setInputFiles({
      name: 'chimmy-upload.png',
      mimeType: 'image/png',
      buffer: tinyPng,
    })

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const input = document.querySelector('[data-testid="chimmy-image-upload-input"]') as HTMLInputElement | null
          return input?.files?.length ?? 0
        })
      )
      .toBe(1)
    await expect(shell.getByTestId('chimmy-send-button')).toBeEnabled()

    await shell.getByTestId('chimmy-send-button').click()

    await expect.poll(() => chimmyCalls).toBe(1)
    await expect(shell.getByTestId('chimmy-inline-error')).toHaveCount(0)
    await expect(shell.getByTestId('chimmy-response-structure').last()).toBeVisible()
  })
})
