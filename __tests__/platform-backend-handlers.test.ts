import { describe, expect, test } from 'vitest'
import { createBackendApp } from '../platform-backend/src/app'
import { buildHttpRequest } from '../platform-backend/src/http/request-factory'

describe('platform-backend handlers', () => {
  test('replays idempotent lineup submission with same receipt', async () => {
    const app = createBackendApp()

    const createLeagueRes = await app.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        headers: { 'x-correlation-id': 'corr-create' },
        params: {},
        body: { name: 'Alpha League', sport: 'NFL', season: 2026 },
        ctx: {
          userId: 'user_1',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(createLeagueRes.status).toBe(201)
    const leagueId = (createLeagueRes.data.league as { leagueId: string }).leagueId

    const submitReq = () =>
      buildHttpRequest({
        method: 'POST',
        path: `/api/leagues/${leagueId}/teams/team_a/lineups/1`,
        headers: {
          'x-correlation-id': 'corr-lineup',
          'idempotency-key': 'idem-lineup-1',
        },
        params: { id: leagueId, teamId: 'team_a', weekOrPeriod: '1' },
        body: {
          entries: [
            { slotCode: 'QB', playerId: 'player_qb_1' },
            { slotCode: 'RB', playerId: 'player_rb_1' },
          ],
        },
        ctx: {
          userId: 'user_1',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      })

    const first = await app.handlers.postTeamLineup(submitReq())
    const second = await app.handlers.postTeamLineup(submitReq())

    expect(first.status).toBe(202)
    expect(second.status).toBe(202)

    const firstReceipt = first.data.receipt as {
      submissionId: string
      eventId: string
      lineupVersion: number
    }
    const secondReceipt = second.data.receipt as {
      submissionId: string
      eventId: string
      lineupVersion: number
    }

    expect(second.data.meta).toMatchObject({
      idempotentReplay: true,
      correlationId: 'corr-lineup',
    })
    expect(secondReceipt.submissionId).toBe(firstReceipt.submissionId)
    expect(secondReceipt.eventId).toBe(firstReceipt.eventId)
    expect(secondReceipt.lineupVersion).toBe(firstReceipt.lineupVersion)
  })

  test('lineup submission emits roster updated event receipt', async () => {
    const app = createBackendApp()

    const createLeagueRes = await app.handlers.postLeagues(
      buildHttpRequest({
        method: 'POST',
        path: '/api/leagues',
        params: {},
        body: { name: 'Bravo League', sport: 'NFL', season: 2026 },
        headers: { 'x-correlation-id': 'corr-create-2' },
        ctx: {
          userId: 'user_2',
          leagueRoles: [],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    const leagueId = (createLeagueRes.data.league as { leagueId: string }).leagueId

    const submitRes = await app.handlers.postTeamLineup(
      buildHttpRequest({
        method: 'POST',
        path: `/api/leagues/${leagueId}/teams/team_b/lineups/2`,
        headers: {
          'x-correlation-id': 'corr-lineup-2',
          'idempotency-key': 'idem-lineup-2',
        },
        params: { id: leagueId, teamId: 'team_b', weekOrPeriod: '2' },
        body: {
          entries: [{ slotCode: 'WR', playerId: 'player_wr_1' }],
        },
        ctx: {
          userId: 'user_2',
          leagueRoles: ['commissioner'],
          systemRoles: ['member'],
          entitlements: [],
        },
      }),
    )

    expect(submitRes.status).toBe(202)
    const receipt = submitRes.data.receipt as {
      submissionId: string
      eventId: string
      lineupVersion: number
    }

    expect(receipt.lineupVersion).toBe(1)
    expect(receipt.submissionId).toBeTruthy()
    expect(receipt.eventId).toBeTruthy()

    const events = app.store.events
    expect(events.length).toBeGreaterThan(0)

    const rosterEvent = events.find((event) => event.id === receipt.eventId)
    expect(rosterEvent).toBeTruthy()
    expect(rosterEvent?.eventType).toBe('RosterUpdated')
    expect(rosterEvent?.payload).toMatchObject({
      teamId: 'team_b',
      weekOrPeriod: 2,
      submissionId: receipt.submissionId,
    })
  })
})
