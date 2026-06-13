import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
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

const seed: RuntimeSeed = {
  leagueId: 'rwr-runtime-nfl-redraft-league',
  memberLogin: 'rwr_runtime_member',
  commissionerLogin: 'rwr_runtime_commish',
  outsiderLogin: 'rwr_runtime_outsider',
  password: 'Password123!',
  opponentRosterId: 'rwr-runtime-opponent-roster',
  opponentIncomingPlayerId: 'rwr-opp-rb-1',
}
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

/**
 * Open the league page and deterministically activate the War Room tab.
 * The `?view=war_room` deep-link can lose a race with the heavy LeagueShell
 * hydration in dev mode, so we also click the War Room tab (the primary user
 * entry point) and then wait for the state route to resolve.
 */
async function openWarRoom(page: Page) {
  // Pre-warm + compile the consolidated state route (dev server compiles routes
  // on first hit; doing this before the UI fetch keeps the panel's own request
  // fast and avoids a first-compile timeout while the page fires its load storm).
  await page.request
    .get(`/api/leagues/${seed.leagueId}/redraft-war-room`)
    .catch(() => undefined)
  const stateResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/api/leagues/${seed.leagueId}/redraft-war-room`),
  )
  await page.goto(`/league/${seed.leagueId}?view=war_room`, { waitUntil: 'domcontentloaded' })
  const warRoomTab = page.getByTestId('league-tab-war_room')
  await warRoomTab.waitFor({ state: 'visible', timeout: 30_000 })
  // The ?view=war_room deep-link can lose a hydration race with the league
  // landing effect, so click the tab once to deterministically activate it.
  // Click ONCE only — re-clicking remounts the panel and restarts its state
  // fetch, which can starve a slow first-compile/DB call. The panel renders a
  // loading state immediately on mount, then swaps to the data panel.
  await warRoomTab.click()
  const panel = page.getByTestId('redraft-war-room-panel')
  const errorBox = page.getByTestId('redraft-war-room-error')
  try {
    await Promise.race([
      panel.waitFor({ state: 'visible', timeout: 60_000 }),
      errorBox.waitFor({ state: 'visible', timeout: 60_000 }),
    ])
  } catch {
    const dbg = {
      tabActive: await page.getByTestId('league-war-room-tab').isVisible().catch(() => false),
      loading: await page.getByTestId('redraft-war-room-loading').isVisible().catch(() => false),
    }
    throw new Error(`Redraft War Room panel never resolved. state=${JSON.stringify(dbg)}`)
  }
  return stateResponsePromise
}

test.describe('@db Redraft War Room runtime', () => {
  test.describe.configure({ timeout: 180_000 })
  test.skip(!hasRuntimeEnv, 'Redraft War Room runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(() => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    // Run the seed in a child process under tsx. Playwright's transform does
    // not cover .ts files imported from outside the e2e/ test dir, so a direct
    // `await import('../scripts/...')` fails with "Cannot use import statement
    // outside a module". The seed exposes deterministic constants, so the
    // `seed` defaults above already match the seeded ids.
    execFileSync(
      process.execPath,
      ['--import', 'tsx', resolve(__dirname, '../scripts/seed-redraft-war-room-runtime.ts')],
      { stdio: 'inherit', env: process.env },
    )
  })

  test('member opens NFL redraft War Room and real UI buttons call consolidated routes', async ({ page }) => {
    await loginAs(page, seed.memberLogin)

    const stateResponse = await openWarRoom(page)
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

    // Use page.request (shares the context's auth cookies, resolves baseURL) —
    // an in-page fetch() would run against about:blank since this test never navigates.
    await loginAs(page, seed.memberLogin)
    const memberRes = await page.request.get(`/api/leagues/${seed.leagueId}/redraft-war-room`)
    expect(memberRes.status()).toBe(200)
    const memberBody = (await memberRes.json()) as { context: { teams: { isUserTeam: boolean; players: unknown[] }[] } }
    const memberOtherTeam = memberBody.context.teams.find((team) => !team.isUserTeam)
    expect(memberOtherTeam?.players).toHaveLength(0)

    const forbiddenOtherRoster = await page.request.post(
      `/api/leagues/${seed.leagueId}/redraft-war-room/lineup`,
      { data: { rosterId: seed.opponentRosterId } },
    )
    expect(forbiddenOtherRoster.status()).toBe(403)

    const commissioner = await page.context().browser()?.newPage()
    expect(commissioner).toBeTruthy()
    const commissionerPage = commissioner!
    await loginAs(commissionerPage, seed.commissionerLogin)
    const commissionerRes = await commissionerPage.request.get(`/api/leagues/${seed.leagueId}/redraft-war-room`)
    expect(commissionerRes.status()).toBe(200)
    const commissionerBody = (await commissionerRes.json()) as { context: { teams: { isUserTeam: boolean; players: unknown[] }[] } }
    const commissionerOtherTeam = commissionerBody.context.teams.find((team) => !team.isUserTeam)
    expect(commissionerOtherTeam?.players.length ?? 0).toBeGreaterThan(0)
    await commissionerPage.close()
  })

  test('entitled commissioner ask route degrades safely when AI is unavailable', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    await openWarRoom(page)
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
    await openWarRoom(page)

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
