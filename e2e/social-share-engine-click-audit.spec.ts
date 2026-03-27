import { expect, test, type Page } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

async function installShareRoutes(page: Page) {
  const trackedEvents: Array<{ event?: string; destination?: string | null; shareType?: string | null }> = []

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          ;(window as Window & { __copiedShareText?: string }).__copiedShareText = text
        },
      },
      configurable: true,
    })
  })

  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'share-user-1',
          name: 'Share Auditor',
          email: 'auditor@allfantasy.test',
        },
        expires: '2099-01-01T00:00:00.000Z',
      }),
    })
  })

  await page.route('**/api/share/payload', async (route) => {
    const body = route.request().postDataJSON() as { kind?: string }
    const kind = body.kind ?? 'league_invite'

    const payloads: Record<string, Record<string, unknown>> = {
      league_invite: {
        kind: 'league_invite',
        url: 'http://127.0.0.1:3000/invite/accept?code=LEAGUE145',
        title: 'AllFantasy league invite',
        description: 'A commissioner shared an AllFantasy league invite.',
        sport: 'NFL',
        cta: 'Open invite',
        eyebrow: 'League Invite',
        chips: ['League Invite', 'NFL', 'Invite safe'],
        helperText: 'This share keeps private league details hidden until the link is opened.',
        visibility: 'invite_only',
        safeForPublic: false,
      },
      creator_league_promo: {
        kind: 'creator_league_promo',
        url: 'http://127.0.0.1:3000/creator/leagues/alpha-room?join=ALPHA145',
        title: 'Alpha Creator: Alpha Creator Room',
        description: 'Creator-led competition with weekly recaps and community strategy drops.',
        sport: 'SOCCER',
        creatorName: 'Alpha Creator',
        cta: 'Join creator league',
        eyebrow: 'Creator League Promo',
        chips: ['Creator League Promo', 'SOCCER', 'Public safe'],
        helperText: 'Only public-safe details are included in this share preview.',
        visibility: 'public',
        safeForPublic: true,
      },
    }

    const payload = payloads[kind] ?? {
      kind,
      url: 'http://127.0.0.1:3000/share/default-145',
      title: 'Default share payload',
      description: 'Fallback payload for the click audit.',
      sport: 'NBA',
      cta: 'Open in AllFantasy',
      eyebrow: 'Default Share',
      chips: ['Default Share', 'NBA', 'Public safe'],
      helperText: 'Only public-safe details are included in this share preview.',
      visibility: 'public',
      safeForPublic: true,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, payload, targets: [] }),
    })
  })

  await page.route('**/api/share/track', async (route) => {
    const body = route.request().postDataJSON() as {
      event?: string
      meta?: { destination?: string | null; shareType?: string | null }
    }
    trackedEvents.push({
      event: body.event,
      destination: body.meta?.destination ?? null,
      shareType: body.meta?.shareType ?? null,
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    })
  })

  return {
    get trackedEvents() {
      return trackedEvents
    },
  }
}

test.describe('@social social share engine click audit', () => {
  test('share modal, preview card, copy link, destinations, and analytics are all wired', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const routes = await installShareRoutes(page)

    await page.setViewportSize({ width: 1440, height: 1100 })
    await page.goto('/tools/social-share-engine-harness', { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId('social-share-hydrated-flag')).toHaveText('hydrated')
    await expect(page.getByTestId('share-launch-league_invite')).toBeVisible()

    await page.getByTestId('share-launch-league_invite').click()
    await expect(page.getByTestId('share-modal')).toBeVisible()
    await expect(page.getByTestId('share-preview-title')).toHaveText('AllFantasy league invite')
    await expect(page.getByTestId('share-preview-description')).toContainText('commissioner shared')
    await expect(page.getByTestId('share-privacy-note')).toContainText('private league details hidden')

    await page.getByTestId('share-copy-link').click()
    await expect(page.getByTestId('social-share-last-destination')).toHaveText('copy_link')

    const xAction = page.getByTestId('share-action-x')
    const discordAction = page.getByTestId('share-action-discord')
    const redditAction = page.getByTestId('share-action-reddit')
    const emailAction = page.getByTestId('share-action-email')
    const smsAction = page.getByTestId('share-action-sms')

    await expect(xAction).toBeVisible()
    await expect(discordAction).toBeVisible()
    await expect(redditAction).toBeVisible()
    await expect(emailAction).toBeVisible()
    await expect(smsAction).toBeVisible()

    await expect(xAction).toHaveAttribute('href', /twitter\.com\/intent\/tweet/)
    await expect(redditAction).toHaveAttribute('href', /reddit\.com\/submit/)
    await expect(emailAction).toHaveAttribute('href', /mailto:\?subject=/)
    await expect(smsAction).toHaveAttribute('href', /sms:\?body=/)

    await discordAction.click()
    await expect(page.getByTestId('social-share-last-destination')).toHaveText('discord')

    const popupPromise = page.waitForEvent('popup')
    await xAction.click()
    const popup = await popupPromise
    await expect(popup).toHaveURL(/(twitter|x)\.com\/intent\/tweet/)
    await popup.close()

    await expect.poll(() =>
      routes.trackedEvents.some((entry) => entry.event === 'share_modal_opened' && entry.shareType === 'league_invite')
    ).toBeTruthy()
    await expect.poll(() =>
      routes.trackedEvents.some((entry) => entry.event === 'share_complete' && entry.destination === 'copy_link')
    ).toBeTruthy()
    await expect.poll(() =>
      routes.trackedEvents.some((entry) => entry.event === 'share_complete' && entry.destination === 'discord')
    ).toBeTruthy()
    await expect.poll(() =>
      routes.trackedEvents.some((entry) => entry.event === 'share_complete' && entry.destination === 'x')
    ).toBeTruthy()

    await page.getByTestId('share-launch-creator_league_promo').click()
    await expect(page.getByTestId('share-modal')).toBeVisible()
    await expect(page.getByTestId('share-preview-title')).toContainText('Alpha Creator')
    await expect(page.getByTestId('share-preview-description')).toContainText('community strategy drops')
  })
})
