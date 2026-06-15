import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const seed = {
  hostLeagueId: 'survivor-phase3-runtime-host-league',
  playerLeagueId: 'survivor-phase3-runtime-player-league',
  commissionerLogin: 'survivor_phase3_commish',
  memberLogin: 'survivor_phase3_member',
  p01Login: 'survivor_phase3_p01',
  p02Login: 'survivor_phase3_p02',
  p03Login: 'survivor_phase3_p03',
  password: 'Password123!',
  memberUserId: 'sp3-host-m0',
  p01UserId: 'sp3-host-m4',
  p02UserId: 'sp3-host-m8',
}

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING

const hasRuntimeEnv = Boolean(databaseUrl && (process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET))

async function loginAs(page: Page, username: string) {
  const csrf = await page.request.get('/api/auth/csrf')
  const csrfToken = ((await csrf.json()) as { csrfToken?: string }).csrfToken
  const res = await page.request.post('/api/auth/callback/credentials?json=true', {
    form: { csrfToken: csrfToken ?? '', login: username, password: seed.password, callbackUrl: `/survivor/${seed.hostLeagueId}`, json: 'true' },
  })
  expect(res.status()).toBeLessThan(400)
}

const post = (page: Page, leagueId: string, action: string, data: Record<string, unknown> = {}) =>
  page.request.post(`/api/leagues/${leagueId}/survivor/${action}`, { data })

test.describe('@db Survivor phase 3 runtime', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 })
  test.skip(!hasRuntimeEnv, 'Survivor phase 3 runtime E2E requires DATABASE_URL and NEXTAUTH_SECRET/AUTH_SECRET.')

  test.beforeAll(() => {
    if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl
    if (databaseUrl && !process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl
    execFileSync(process.execPath, ['--import', 'tsx', resolve(__dirname, '../scripts/seed-survivor-phase3-runtime.ts')], { stdio: 'inherit', env: process.env })
  })

  test('private voting: self-vote blocked, first valid vote locks', async ({ page }) => {
    await loginAs(page, seed.memberLogin)
    const selfVote = await post(page, seed.hostLeagueId, 'submit-vote', { targetUserId: seed.memberUserId })
    expect(selfVote.status()).toBe(422)
    expect((await selfVote.json()).code).toBe('self_vote_disallowed')

    const vote = await post(page, seed.hostLeagueId, 'submit-vote', { targetUserId: seed.p01UserId })
    expect(vote.status()).toBe(200)
    expect((await vote.json()).locked).toBe(true)

    const change = await post(page, seed.hostLeagueId, 'submit-vote', { targetUserId: seed.p02UserId })
    expect(change.status()).toBe(409)
    expect((await change.json()).code).toBe('vote_locked')
  })

  test('idol plays: Vote Shield, Extra Vote, Skip Tribal', async ({ page }) => {
    await loginAs(page, seed.memberLogin)
    const shield = await post(page, seed.hostLeagueId, 'play-idol')
    expect(shield.status()).toBe(200)
    expect((await shield.json()).powerType).toBe('vote_shield')

    await loginAs(page, seed.p01Login)
    await post(page, seed.hostLeagueId, 'submit-vote', { targetUserId: seed.memberUserId }) // will be blocked by shield
    const extra = await post(page, seed.hostLeagueId, 'play-extra-vote', { targetUserId: seed.p02UserId })
    expect(extra.status()).toBe(200)
    expect((await extra.json()).powerType).toBe('extra_vote')

    await loginAs(page, seed.p02Login)
    const skip = await post(page, seed.hostLeagueId, 'play-skip-tribal')
    expect(skip.status()).toBe(200)
    expect((await skip.json()).powerType).toBe('skip_tribal')

    await loginAs(page, seed.p03Login)
    const p3vote = await post(page, seed.hostLeagueId, 'submit-vote', { targetUserId: seed.memberUserId }) // blocked by shield
    expect(p3vote.status()).toBe(200)
  })

  test('non-commissioner member cannot run admin actions', async ({ page }) => {
    await loginAs(page, seed.memberLogin)
    expect((await post(page, seed.hostLeagueId, 'open-tribal')).status()).toBe(403)
    expect((await post(page, seed.hostLeagueId, 'tally-votes')).status()).toBe(403)
  })

  test('host close + tally + reveal: shield blocks votes, eliminates the clean target', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)

    const close = await post(page, seed.hostLeagueId, 'close-vote-window')
    expect(close.status()).toBe(200)

    const tally = await post(page, seed.hostLeagueId, 'tally-votes')
    expect(tally.status()).toBe(200)
    const tallyJson = await tally.json()
    // Non-participating host CAN see the tally.
    expect(tallyJson.tally).toBeTruthy()
    expect(tallyJson.tally.blockedByIdol).toBe(true)
    expect(tallyJson.tally.eliminatedUserId).toBe(seed.p01UserId)

    const reveal = await post(page, seed.hostLeagueId, 'reveal-votes')
    expect(reveal.status()).toBe(200)
    const revealJson = await reveal.json()
    expect(revealJson.revealSequence.some((s: { status: string }) => s.status === 'blocked_by_idol')).toBe(true)
    expect(revealJson.eliminatedName).toContain('P01')

    const resolve = await post(page, seed.hostLeagueId, 'resolve-elimination')
    expect(resolve.status()).toBe(200)
    const resolveJson = await resolve.json()
    expect(resolveJson.eliminatedUserId).toBe(seed.p01UserId)
    expect(resolveJson.removedFromChats).toBeGreaterThanOrEqual(1)

    const state = await page.request.get(`/api/leagues/${seed.hostLeagueId}/survivor`)
    const stateJson = await state.json()
    expect(stateJson.tribalCouncil.isRevealed).toBe(true)
    expect(stateJson.tribalCouncil.reveal).toBeTruthy()
    expect(stateJson.noFakeGameplayState).toBe(true)
  })

  test('participating commissioner cannot inspect the tally before reveal', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)

    // Window is open in the player league; tallying before close is refused.
    const early = await post(page, seed.playerLeagueId, 'tally-votes')
    expect(early.status()).toBe(409)

    expect((await post(page, seed.playerLeagueId, 'close-vote-window')).status()).toBe(200)
    const tally = await post(page, seed.playerLeagueId, 'tally-votes')
    expect(tally.status()).toBe(200)
    const tallyJson = await tally.json()
    // Sanitized: participating commissioner gets operational status only — no tally/revealSequence.
    expect(tallyJson.tally).toBeUndefined()
    expect(tallyJson.tallied).toBe(true)

    const state = await page.request.get(`/api/leagues/${seed.playerLeagueId}/survivor`)
    const stateJson = await state.json()
    expect(stateJson.access.isCommissionerParticipating).toBe(true)
    expect(stateJson.tribalCouncil.host).toBeNull()
    expect(stateJson.tribalCouncil.reveal).toBeNull()
  })

  test('mobile: survivor page renders without error at 390px', async ({ page }) => {
    await loginAs(page, seed.commissionerLogin)
    await page.setViewportSize({ width: 390, height: 844 })
    const resp = await page.goto(`/survivor/${seed.hostLeagueId}`)
    // Best-effort: the page should load (not a server error).
    expect(resp?.status() ?? 200).toBeLessThan(500)
  })
})
