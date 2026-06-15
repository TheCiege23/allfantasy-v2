import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const seed = {
  hostLeagueId: 'survivor-phase2-runtime-host-league',
  playerLeagueId: 'survivor-phase2-runtime-player-league',
  commissionerLogin: 'survivor_phase2_commish',
  memberLogin: 'survivor_phase2_member',
  password: 'Password123!',
  expectedIdolCount: 19,
  tribeCount: 4,
}

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING

const hasRuntimeEnv = Boolean(databaseUrl && (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET))

async function loginAs(page: Page, username: string) {
  const csrfResponse = await page.request.get('/api/auth/csrf')
  expect(csrfResponse.status()).toBe(200)
  const csrfToken = ((await csrfResponse.json()) as { csrfToken?: string }).csrfToken
  expect(csrfToken).toBeTruthy()
  const signInResponse = await page.request.post('/api/auth/callback/credentials?json=true', {
    form: {
      csrfToken: csrfToken ?? '',
      login: username,
      password: seed.password,
      callbackUrl: `/survivor/${seed.hostLeagueId}`,
      json: 'true',
    },
  })
  expect(signInResponse.status()).toBeLessThan(400)
}

test.describe('@db Survivor phase 2 runtime', () => {
  test.describe.configure({ mode: 'serial', timeout: 240_000 })
  test.skip(!hasRuntimeEnv, 'Survivor phase 2 runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(() => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    execFileSync(process.execPath, ['--import', 'tsx', resolve(__dirname, '../scripts/seed-survivor-phase2-runtime.ts')], {
      stdio: 'inherit',
      env: process.env,
    })
  })

  test('initialize-survivor builds real tribes, chats, idols, and intro (non-participating host)', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)

    const init = await page.request.post(`/api/leagues/${seed.hostLeagueId}/survivor/initialize-survivor`, {
      data: { seed: 12345 },
    })
    expect(init.status()).toBe(200)
    const initJson = await init.json()
    expect(initJson.ok).toBe(true)
    expect(initJson.complete).toBe(true)
    expect(initJson.steps.tribes.tribeCount).toBe(seed.tribeCount)
    expect(initJson.steps.chats.tribeChannelCount).toBe(seed.tribeCount)
    expect(initJson.steps.idols.voteShieldCount).toBe(seed.expectedIdolCount)
    expect(initJson.steps.intro.posted || initJson.steps.intro.pending).toBe(true)
    expect(initJson.blockers).toEqual([])

    // Host (non-participating) state: full visibility of hidden idol inventory + all tribes.
    const state = await page.request.get(`/api/leagues/${seed.hostLeagueId}/survivor`)
    expect(state.status()).toBe(200)
    const stateJson = await state.json()
    expect(stateJson.initialization.tribesAssigned).toBe(true)
    expect(stateJson.initialization.chatsProvisioned).toBe(true)
    expect(stateJson.initialization.idolsSeeded).toBe(true)
    expect(stateJson.initialization.voteShieldCount).toBe(seed.expectedIdolCount)
    expect(stateJson.initialization.introPosted).toBe(true)
    expect(stateJson.initialization.phase2Complete).toBe(true)
    expect(stateJson.idols.hiddenInventoryVisible).toBe(true)
    expect(stateJson.idols.hiddenCount).toBe(seed.expectedIdolCount)
    // Tribes balanced: every tribe within one of each other.
    const sizes = stateJson.tribes.map((t: { memberCount: number }) => t.memberCount)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  test('re-running initialize is idempotent (no duplicate tribes/idols/intro)', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    const again = await page.request.post(`/api/leagues/${seed.hostLeagueId}/survivor/initialize-survivor`, { data: { seed: 12345 } })
    expect(again.status()).toBe(200)
    const againJson = await again.json()
    expect(againJson.steps.tribes.alreadyAssigned).toBe(true)
    expect(againJson.steps.idols.alreadySeeded).toBe(true)
    expect(againJson.steps.idols.voteShieldCount).toBe(seed.expectedIdolCount)
  })

  test('participating commissioner cannot see hidden idol assignments or other tribes', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    const init = await page.request.post(`/api/leagues/${seed.playerLeagueId}/survivor/initialize-survivor`, { data: { seed: 999 } })
    expect(init.status()).toBe(200)
    const initJson = await init.json()
    expect(initJson.complete).toBe(true)
    expect(initJson.steps.idols.voteShieldCount).toBe(seed.expectedIdolCount)

    const state = await page.request.get(`/api/leagues/${seed.playerLeagueId}/survivor`)
    const stateJson = await state.json()
    expect(stateJson.access.isCommissionerParticipating).toBe(true)
    expect(stateJson.idols.hiddenInventoryVisible).toBe(false)
    expect(stateJson.idols.hiddenCount).toBeNull()
    // Only own tribe members are visible.
    const visibleTribes = stateJson.tribes.filter((t: { membersVisible: boolean }) => t.membersVisible)
    expect(visibleTribes.length).toBeLessThanOrEqual(1)
    // Initialization status counts are still reported (non-private aggregate).
    expect(stateJson.initialization.idolsSeeded).toBe(true)
    expect(stateJson.noFakeGameplayState).toBe(true)
  })

  test('a non-commissioner member cannot run admin Phase 2 actions', async ({ page }) => {
    await loginAs(page, seed.memberLogin)
    const forbidden = await page.request.post(`/api/leagues/${seed.playerLeagueId}/survivor/assign-tribes`, { data: { allowReassign: true } })
    expect(forbidden.status()).toBe(403)
    const seedForbidden = await page.request.post(`/api/leagues/${seed.playerLeagueId}/survivor/seed-idols`, { data: {} })
    expect(seedForbidden.status()).toBe(403)
  })
})
