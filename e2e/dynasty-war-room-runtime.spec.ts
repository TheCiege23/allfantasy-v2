import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

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
  leagueId: 'dwr-runtime-nfl-dynasty-league',
  memberLogin: 'dwr_runtime_member',
  commissionerLogin: 'dwr_runtime_commish',
  outsiderLogin: 'dwr_runtime_outsider',
  password: 'Password123!',
  opponentRosterId: 'dwr-runtime-opponent-roster',
  opponentIncomingPlayerId: 'dwr-opp-wr-young',
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
      response.url().includes(`/api/leagues/${seed.leagueId}/dynasty-war-room/${action}`),
  )
  await run()
  const response = await responsePromise
  expect(response.status()).toBeLessThan(500)
  return response
}

async function rendered(locator: Locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined)
  await expect(locator).toBeAttached()
}
async function shown(locator: Locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined)
  await expect(locator).toBeVisible()
}

const ABORTED_RESOURCE_TYPES = new Set(['image', 'media', 'font'])
const ABORTED_HOST_RE =
  /connect\.facebook|facebook\.com|fbcdn|google-analytics|googletagmanager|doubleclick|hotjar|segment\.io|mixpanel|sentry\.io|posthog/i

async function applyWarRoomNetworkGuards(page: Page) {
  await page.route('**/*', (route) => {
    const req = route.request()
    if (ABORTED_RESOURCE_TYPES.has(req.resourceType()) || ABORTED_HOST_RE.test(req.url())) {
      return route.abort()
    }
    return route.continue()
  })
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))
}

async function openWarRoom(page: Page) {
  await page.request.get(`/api/leagues/${seed.leagueId}/dynasty-war-room`).catch(() => undefined)
  await page.request
    .post(`/api/leagues/${seed.leagueId}/dynasty-war-room/team-direction`, { data: {} })
    .catch(() => undefined)
  const stateResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/api/leagues/${seed.leagueId}/dynasty-war-room`),
  )
  await page.goto(`/league/${seed.leagueId}`, { waitUntil: 'domcontentloaded' })
  const warRoomTab = page.getByTestId('league-tab-war_room')
  await warRoomTab.waitFor({ state: 'visible', timeout: 30_000 })
  await warRoomTab.click()
  const panel = page.getByTestId('dynasty-war-room-panel')
  const errorBox = page.getByTestId('dynasty-war-room-error')
  try {
    await Promise.race([
      panel.waitFor({ state: 'visible', timeout: 60_000 }),
      errorBox.waitFor({ state: 'visible', timeout: 60_000 }),
    ])
  } catch {
    const dbg = {
      tabActive: await page.getByTestId('league-war-room-tab').isVisible().catch(() => false),
      loading: await page.getByTestId('dynasty-war-room-loading').isVisible().catch(() => false),
    }
    throw new Error(`Dynasty War Room panel never resolved. state=${JSON.stringify(dbg)}`)
  }
  return stateResponsePromise
}

test.describe('@db Dynasty War Room runtime', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })
  test.skip(!hasRuntimeEnv, 'Dynasty War Room runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(() => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    execFileSync(
      process.execPath,
      ['--import', 'tsx', resolve(__dirname, '../scripts/seed-dynasty-war-room-runtime.ts')],
      { stdio: 'inherit', env: process.env },
    )
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 2400 })
    await applyWarRoomNetworkGuards(page)
  })

  test('dynasty-war-room routes enforce auth/privacy/scope and return grounded dynasty context (DB-backed)', async ({ page, request }) => {
    const unauthorized = await request.get(`/api/leagues/${seed.leagueId}/dynasty-war-room`)
    expect(unauthorized.status()).toBe(401)

    await loginAs(page, seed.memberLogin)
    const memberRes = await page.request.get(`/api/leagues/${seed.leagueId}/dynasty-war-room`)
    expect(memberRes.status()).toBe(200)
    const memberBody = (await memberRes.json()) as {
      direction: { window: string; contendScore: number | null } | null
      needs: { tradeTargetPositions: string[] } | null
      context: {
        userRosterId: string | null
        teams: { isUserTeam: boolean; players: { age: number | null; dynastyValue: number | null }[]; picks: unknown[] }[]
        freeAgents: { playerName: string; position: string; adp: number | null }[]
        availability: {
          playerValues: string
          playerAges: string
          freeAgentPool: string
          futurePicks: string
          projections: string
        }
      }
    }
    // Dynasty data path: real dynasty values + ages + a real free-agent pool are
    // resolved; future picks are honestly provider-limited (NOT fabricated), and
    // weekly projections are not part of the native dynasty context.
    expect(memberBody.context.availability.playerValues).toBe('available')
    expect(memberBody.context.availability.playerAges).toBe('available')
    expect(memberBody.context.availability.freeAgentPool).toBe('available')
    expect(memberBody.context.availability.futurePicks).toBe('missing')
    expect(memberBody.context.availability.projections).toBe('missing')
    expect(memberBody.context.freeAgents.length).toBeGreaterThan(0)
    // Member gets a grounded context + classified contention window for THEIR team.
    expect(memberBody.context.userRosterId).toBeTruthy()
    expect(memberBody.direction?.window).toBe('contend')
    expect(memberBody.needs).toBeTruthy()
    const memberOwnTeam = memberBody.context.teams.find((team) => team.isUserTeam)
    expect(memberOwnTeam?.players.length ?? 0).toBeGreaterThan(0)
    expect(memberOwnTeam?.players.every((p) => p.age != null)).toBe(true)
    // No cross-roster leak: other team's players + picks are stripped for members.
    const memberOtherTeam = memberBody.context.teams.find((team) => !team.isUserTeam)
    expect(memberOtherTeam?.players).toHaveLength(0)
    expect(memberOtherTeam?.picks).toHaveLength(0)

    // Every action route responds 200 for the member's own team.
    for (const action of ['team-direction', 'buy-sell-hold', 'waivers', 'lineup', 'trade-find']) {
      const res = await page.request.post(`/api/leagues/${seed.leagueId}/dynasty-war-room/${action}`, { data: {} })
      expect(res.status(), `action ${action}`).toBe(200)
    }
    const tradeAnalyzeRes = await page.request.post(`/api/leagues/${seed.leagueId}/dynasty-war-room/trade-analyze`, {
      data: { incomingPlayerIds: [seed.opponentIncomingPlayerId], outgoingPlayerIds: [] },
    })
    expect(tradeAnalyzeRes.status()).toBe(200)

    // Ask is gated on the war_room_draft_strategy entitlement; the member lacks it.
    const askRes = await page.request.post(`/api/leagues/${seed.leagueId}/dynasty-war-room/ask`, {
      data: { question: 'Should I sell my aging RB?' },
    })
    expect(askRes.status()).toBe(402)

    // Member cannot target another roster's personalized recommendations.
    const forbidden = await page.request.post(`/api/leagues/${seed.leagueId}/dynasty-war-room/buy-sell-hold`, {
      data: { rosterId: seed.opponentRosterId },
    })
    expect(forbidden.status()).toBe(403)

    // Commissioner sees league-wide rosters.
    const commissioner = await page.context().browser()?.newPage()
    expect(commissioner).toBeTruthy()
    const commissionerPage = commissioner!
    await applyWarRoomNetworkGuards(commissionerPage)
    await loginAs(commissionerPage, seed.commissionerLogin)
    const commissionerRes = await commissionerPage.request.get(`/api/leagues/${seed.leagueId}/dynasty-war-room`)
    expect(commissionerRes.status()).toBe(200)
    const commissionerBody = (await commissionerRes.json()) as {
      context: { teams: { isUserTeam: boolean; players: unknown[] }[] }
    }
    const commissionerOtherTeam = commissionerBody.context.teams.find((team) => !team.isUserTeam)
    expect(commissionerOtherTeam?.players.length ?? 0).toBeGreaterThan(0)
    await commissionerPage.close()
  })

  test('member opens dynasty War Room and real UI buttons call consolidated routes', async ({ page }) => {
    test.setTimeout(300_000)
    await loginAs(page, seed.memberLogin)

    const stateResponse = await openWarRoom(page)
    expect(stateResponse.status()).toBe(200)

    await expect(page.getByTestId('league-war-room-tab')).toBeVisible()
    await shown(page.getByTestId('dynasty-war-room-panel'))
    await rendered(page.getByTestId('dynasty-war-room-direction-card'))

    await waitForAction(page, 'buy-sell-hold', async () => {
      await page.getByTestId('dynasty-war-room-tool-buy-sell-hold').click()
    })
    await rendered(page.getByTestId('dynasty-war-room-buy-sell-hold-result'))

    await waitForAction(page, 'waivers', async () => {
      await page.getByTestId('dynasty-war-room-tool-waivers').click()
    })
    const waiversResult = page.getByTestId('dynasty-war-room-waivers-result')
    await rendered(waiversResult)
    await rendered(waiversResult.getByText(/ADP|Best available|Fills|provider|age/i).first())

    await waitForAction(page, 'lineup', async () => {
      await page.getByTestId('dynasty-war-room-tool-lineup').click()
    })
    await rendered(page.getByTestId('dynasty-war-room-lineup-result'))

    await waitForAction(page, 'trade-analyze', async () => {
      await page.getByTestId('dynasty-war-room-tool-trade-analyze').click()
    })
    await page.getByTestId('dynasty-war-room-trade-incoming-input').fill(seed.opponentIncomingPlayerId)
    await waitForAction(page, 'trade-analyze', async () => {
      await page.getByTestId('dynasty-war-room-trade-analyze-submit').click()
    })
    await rendered(page.getByTestId('dynasty-war-room-trade-analyze-result'))

    await waitForAction(page, 'trade-find', async () => {
      await page.getByTestId('dynasty-war-room-tool-trade-find').click()
    })
    await rendered(page.getByTestId('dynasty-war-room-trade-find-result'))

    await page.getByTestId('dynasty-war-room-ask-input').fill('Should I sell my aging RB?')
    const askResponse = await waitForAction(page, 'ask', async () => {
      await page.getByTestId('dynasty-war-room-ask-submit').click()
    })
    expect(askResponse.status()).toBe(402)
    await rendered(page.getByTestId('dynasty-war-room-ask-note'))
    await expect(page.getByTestId('dynasty-war-room-ask-note')).toContainText(/upgrade|access/i)
  })

  test('entitled commissioner ask route degrades safely when AI is unavailable', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    await openWarRoom(page)
    await shown(page.getByTestId('dynasty-war-room-panel'))

    await page.getByTestId('dynasty-war-room-ask-input').fill('Give me a grounded dynasty direction note.')
    const askResponse = await waitForAction(page, 'ask', async () => {
      await page.getByTestId('dynasty-war-room-ask-submit').click()
    })
    expect(askResponse.status()).toBe(200)
    const body = (await askResponse.json()) as { aiUnavailable?: boolean; answer?: string | null }
    if (body.aiUnavailable) {
      await rendered(page.getByTestId('dynasty-war-room-ask-note'))
      await expect(page.getByTestId('dynasty-war-room-ask-note')).toContainText(/temporarily unavailable|grounded/i)
    } else {
      await rendered(page.getByTestId('dynasty-war-room-answer'))
    }
  })

  test('mobile dark-mode smoke does not break the dynasty War Room panel', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginAs(page, seed.memberLogin)
    await openWarRoom(page)

    await shown(page.getByTestId('dynasty-war-room-panel'))
    await shown(page.getByTestId('dynasty-war-room-tool-buy-sell-hold'))

    const htmlState = await page.locator('html').evaluate((node) => ({
      lang: node.getAttribute('lang') ?? node.getAttribute('data-lang'),
      mode: node.getAttribute('data-mode'),
    }))
    expect(['en', 'es']).toContain(String(htmlState.lang ?? ''))
    expect(String(htmlState.mode ?? '').length).toBeGreaterThan(0)
  })
})
