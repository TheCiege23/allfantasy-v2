import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const seed = {
  hostLeagueId: 'survivor-foundation-runtime-host-league',
  playerLeagueId: 'survivor-foundation-runtime-player-league',
  commissionerLogin: 'survivor_foundation_commish',
  memberLogin: 'survivor_foundation_member',
  outsiderLogin: 'survivor_foundation_outsider',
  password: 'Password123!',
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
      callbackUrl: `/survivor/${seed.playerLeagueId}`,
      json: 'true',
    },
  })
  expect(signInResponse.status()).toBeLessThan(400)
}

test.describe('@db Survivor foundation runtime', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 })
  test.skip(!hasRuntimeEnv, 'Survivor foundation runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(() => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    execFileSync(process.execPath, ['--import', 'tsx', resolve(__dirname, '../scripts/seed-survivor-foundation-runtime.ts')], {
      stdio: 'inherit',
      env: process.env,
    })
  })

  test('foundation API returns canonical setup and host privacy decisions', async ({ page, request }) => {
    const unauthorized = await request.get(`/api/leagues/${seed.hostLeagueId}/survivor`)
    expect(unauthorized.status()).toBe(401)

    await loginAs(page, seed.commissionerLogin)

    const hostState = await page.request.get(`/api/leagues/${seed.hostLeagueId}/survivor`)
    expect(hostState.status()).toBe(200)
    const hostJson = await hostState.json()
    expect(hostJson.settings.defaultTeamCount).toBe(20)
    expect(hostJson.settings.tribeCount).toBe(4)
    expect(hostJson.access.isNonParticipatingCommissionerHost).toBe(true)
    expect(hostJson.access.decisions.canSeePrivateVotes).toBe(true)
    expect(hostJson.noFakeGameplayState).toBe(true)

    const playerState = await page.request.get(`/api/leagues/${seed.playerLeagueId}/survivor`)
    expect(playerState.status()).toBe(200)
    const playerJson = await playerState.json()
    expect(playerJson.access.isCommissionerParticipating).toBe(true)
    expect(playerJson.access.decisions.canSeePrivateVotes).toBe(false)
    expect(playerJson.voteWindow.totalVoteCount).toBeNull()
    expect(playerJson.idols.hiddenInventoryVisible).toBe(false)
    expect(playerJson.noFakeGameplayState).toBe(true)

    const privacy = await page.request.post(`/api/leagues/${seed.playerLeagueId}/survivor/privacy-check`, { data: {} })
    expect(privacy.status()).toBe(200)
    const privacyJson = await privacy.json()
    expect(privacyJson.access.isCommissionerParticipating).toBe(true)
    expect(privacyJson.access.decisions.canSeeHiddenIdolAssignments).toBe(false)
  })
})
