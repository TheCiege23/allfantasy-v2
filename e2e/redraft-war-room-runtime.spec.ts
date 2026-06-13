import { expect, test, type Page } from '@playwright/test'

type RuntimeSeed = {
  leagueId: string
  memberLogin: string
  commissionerLogin: string
  outsiderLogin: string
  password: string
  opponentRosterId: string
  opponentIncomingPlayerId: string
}

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING

const hasRuntimeEnv = Boolean(databaseUrl && (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET))

let seed: RuntimeSeed = {
  leagueId: 'rwr-runtime-nfl-redraft-league',
  memberLogin: 'rwr_runtime_member',
  commissionerLogin: 'rwr_runtime_commish',
  outsiderLogin: 'rwr_runtime_outsider',
  password: 'Password123!',
  opponentRosterId: 'rwr-runtime-opponent-roster',
  opponentIncomingPlayerId: 'rwr-opp-rb-1',
}
let disconnectSeed: null | (() => Promise<void>) = null

async function loginAs(page: Page, username: string) {
  const csrfResponse = await page.request.get('/api/auth/csrf')
  expect(csrfResponse.status()).toBe(200)
  const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string }
  const csrfToken = csrfPayload.csrfToken
  expect(csrfToken).toBeTruthy()

  const signInResponse = await page.request.post('/api/auth/callback/credentials?json=true', {
    form: {
      csrfToken: csrfToken ?? '',
      login: username,
      password: seed.password,
      callbackUrl: `/league/${seed.leagueId}?view=war_room`,
      json: 'true',
    },
  })
  expect(signInResponse.status()).toBeLessThan(400)

  await expect
    .poll(async () => {
      const sessionResponse = await page.request.get('/api/auth/session')
      const session = (await sessionResponse.json().catch(() => null)) as { user?: { id?: string } } | null
      return Boolean(session?.user?.id)
    })
    .toBe(true)
}

async function waitForAction(page: Page, action: string, run: () => Promise<void>) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes(`/api/leagues/${seed.leagueId}/redraft-war-room/${action}`),
  )
  await run()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(500)
  return response
}

test.describe('@db Redraft War Room runtime', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })
  test.skip(!hasRuntimeEnv, 'Redraft War Room runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(async () => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    const mod = await import('../scripts/seed-redraft-war-room-runtime')
    seed = await mod.seedRedraftWarRoomRuntime()
    disconnectSeed = mod.disconnectRedraftWarRoomRuntimeSeed
  })

  test.afterAll(async () => {
    await disconnectSeed?.()
  })

  test('member opens NFL redraft War Room and real UI buttons call consolidated routes', async ({ page }) => {
    await loginAs(page, seed.memberLogin)

    const stateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes(`/api/leagues/${seed.leagueId}/redraft-war-room`),
    )
    await page.goto(`/league/${seed.leagueId}?view=war_room`, { waitUntil: 'domcontentloaded' })
    const stateResponse = await stateResponsePromise
    expect(stateResponse.status()).toBe(200)

    await expect(page.getByTestId('league-war-room-tab')).toBeVisible()
    await expect(page.getByTestId('redraft-war-room-panel')).toBeVisible()
    await expect(page.getByText(/Team needs/i)).toBeVisible()

    await waitForAction(page, 'lineup', async () => {
      await page.getByTestId('redraft-war-room-tool-lineup').click()
    })
    await expect(page.getByTestId('redraft-war-room-lineup-result')).toBeVisible()

    await waitForAction(page, 'waivers', async () => {
      await page.getByTestId('redraft-war-room-tool-waivers').click()
    })
    await expect(page.getByTestId('redraft-war-room-waivers-result')).toBeVisible()
    await expect(page.getByText(/provider integration/i)).toBeVisible()

    await waitForAction(page, 'trade-analyze', async () => {
      await page.getByTestId('redraft-war-room-tool-trade-analyze').click()
    })
    await page.getByTestId('redraft-war-room-trade-incoming-input').fill(seed.opponentIncomingPlayerId)
    await waitForAction(page, 'trade-analyze', async () => {
      await page.getByTestId('redraft-war-room-trade-analyze-submit').click()
    })
    await expect(page.getByTestId('redraft-war-room-trade-analyze-result')).toBeVisible()

    await waitForAction(page, 'trade-find', async () => {
      await page.getByTestId('redraft-war-room-tool-trade-find').click()
    })
    await expect(page.getByTestId('redraft-war-room-trade-find-result')).toBeVisible()

    await page.getByTestId('redraft-war-room-ask-input').fill('Who should I start at FLEX?')
    const askResponse = await waitForAction(page, 'ask', async () => {
      await page.getByTestId('redraft-war-room-ask-submit').click()
    })
    expect(askResponse.status()).toBe(402)
    await expect(page.getByTestId('redraft-war-room-ask-note')).toContainText(/upgrade|access/i)
  })

  test('browser route calls enforce member privacy, unauthorized access, and commissioner scope', async ({ page, request }) => {
    const unauthorized = await request.get(`/api/leagues/${seed.leagueId}/redraft-war-room`)
    expect(unauthorized.status()).toBe(401)

    await loginAs(page, seed.memberLogin)
    const memberState = await page.evaluate(async (leagueId) => {
      const res = await fetch(`/api/leagues/${leagueId}/redraft-war-room`, { credentials: 'include' })
      return { status: res.status, body: await res.json() }
    }, seed.leagueId)
    expect(memberState.status).toBe(200)
    const memberOtherTeam = memberState.body.context.teams.find((team: { isUserTeam: boolean }) => !team.isUserTeam)
    expect(memberOtherTeam.players).toHaveLength(0)

    const forbiddenOtherRoster = await page.evaluate(
      async ({ leagueId, opponentRosterId }) => {
        const res = await fetch(`/api/leagues/${leagueId}/redraft-war-room/lineup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rosterId: opponentRosterId }),
        })
        return res.status
      },
      { leagueId: seed.leagueId, opponentRosterId: seed.opponentRosterId },
    )
    expect(forbiddenOtherRoster).toBe(403)

    const commissioner = await page.context().browser()?.newPage()
    expect(commissioner).toBeTruthy()
    const commissionerPage = commissioner!
    await loginAs(commissionerPage, seed.commissionerLogin)
    const commissionerState = await commissionerPage.evaluate(async (leagueId) => {
      const res = await fetch(`/api/leagues/${leagueId}/redraft-war-room`, { credentials: 'include' })
      return { status: res.status, body: await res.json() }
    }, seed.leagueId)
    expect(commissionerState.status).toBe(200)
    const commissionerOtherTeam = commissionerState.body.context.teams.find(
      (team: { isUserTeam: boolean }) => !team.isUserTeam,
    )
    expect(commissionerOtherTeam.players.length).toBeGreaterThan(0)
    await commissionerPage.close()
  })

  test('entitled commissioner ask route degrades safely when AI is unavailable', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    await page.goto(`/league/${seed.leagueId}?view=war_room`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('redraft-war-room-panel')).toBeVisible()

    await page.getByTestId('redraft-war-room-ask-input').fill('Give me a grounded lineup note.')
    const askResponse = await waitForAction(page, 'ask', async () => {
      await page.getByTestId('redraft-war-room-ask-submit').click()
    })
    expect(askResponse.status()).toBe(200)
    const body = (await askResponse.json()) as { aiUnavailable?: boolean; answer?: string | null }
    if (body.aiUnavailable) {
      await expect(page.getByTestId('redraft-war-room-ask-note')).toContainText(/temporarily unavailable|grounded/i)
    } else {
      await expect(page.getByTestId('redraft-war-room-answer')).toBeVisible()
    }
  })

  test('mobile Spanish dark-mode smoke does not break the redraft War Room panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript(() => {
      window.localStorage.setItem('af_lang', 'es')
      window.localStorage.setItem('af_mode', 'dark')
    })
    await loginAs(page, seed.memberLogin)
    await page.goto(`/league/${seed.leagueId}?view=war_room`, { waitUntil: 'domcontentloaded' })

    const panel = page.getByTestId('redraft-war-room-panel')
    await expect(panel).toBeVisible()
    await expect(page.getByTestId('redraft-war-room-tool-lineup')).toBeVisible()
    const htmlState = await page.locator('html').evaluate((node) => ({
      lang: node.getAttribute('lang') ?? node.getAttribute('data-lang'),
      mode: node.getAttribute('data-mode'),
    }))
    expect(String(htmlState.lang ?? '')).toContain('es')
    expect(htmlState.mode).toBe('dark')
  })
})
