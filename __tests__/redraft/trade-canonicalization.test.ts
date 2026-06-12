/**
 * Regression tests for redraft trade system canonicalization.
 *
 * Root cause: two parallel trade systems coexisted — RedraftLeagueTrade (legacy)
 * and RedraftTradeProposal (canonical). New writes were still possible via the
 * legacy POST /api/redraft/trades route.
 *
 * Fix:
 *  - POST /api/redraft/trades → 410 Gone (no new legacy trades created)
 *  - PATCH /api/redraft/trades → 410 Gone (no legacy accept/reject/veto)
 *  - GET /api/redraft/trades  → kept read-only (historical data access)
 *  - voidPendingRedraftTradesForRoster now cancels canonical proposals too
 *
 * Commissioner veto route is NOT implemented here (blocker #5 — separate task).
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

const legacyRoute = read('app/api/redraft/trades/route.ts')
const voidHelper = read('lib/redraft/voidPendingTradesForElimination.ts')
const clientLib = read('lib/redraft/client.ts')

// ─── Legacy route — POST retired ─────────────────────────────────────────────

describe('Legacy route POST /api/redraft/trades — retired', () => {
  it('exports a POST handler (not deleted, just blocked)', () => {
    expect(legacyRoute).toContain('export async function POST')
  })

  it('POST returns 410 immediately without creating any records', () => {
    // 410 status in the GONE_RESPONSE
    expect(legacyRoute).toContain('410')
    // POST body must not contain prisma.redraftLeagueTrade.create
    const postBlock = legacyRoute.slice(legacyRoute.indexOf('export async function POST'))
    expect(postBlock).not.toContain('redraftLeagueTrade.create')
  })

  it('POST body tells callers to use /api/redraft/trade-proposals', () => {
    expect(legacyRoute).toContain('/api/redraft/trade-proposals')
  })

  it('POST body tells callers to use /api/redraft/trade-votes', () => {
    expect(legacyRoute).toContain('/api/redraft/trade-votes')
  })

  it('migrationPhase is now retired (not coexist)', () => {
    expect(legacyRoute).toContain("migrationPhase: 'retired'")
    expect(legacyRoute).not.toContain("migrationPhase: 'coexist'")
  })
})

// ─── Legacy route — PATCH retired ────────────────────────────────────────────

describe('Legacy route PATCH /api/redraft/trades — retired', () => {
  it('exports a PATCH handler (not deleted, just blocked)', () => {
    expect(legacyRoute).toContain('export async function PATCH')
  })

  it('PATCH returns 410 without touching any DB record', () => {
    const patchBlock = legacyRoute.slice(legacyRoute.indexOf('export async function PATCH'))
    expect(patchBlock).not.toContain('redraftLeagueTrade.update')
    expect(patchBlock).not.toContain('redraftLeagueTrade.findFirst')
  })

  it('PATCH does not call cap validation (no trade processing)', () => {
    const patchBlock = legacyRoute.slice(legacyRoute.indexOf('export async function PATCH'))
    expect(patchBlock).not.toContain('validateRedraftTradeCap')
    expect(patchBlock).not.toContain('applyRedraftTradeCapTransfers')
  })
})

// ─── Legacy route — GET preserved ────────────────────────────────────────────

describe('Legacy route GET /api/redraft/trades — read-only access preserved', () => {
  it('exports a GET handler', () => {
    expect(legacyRoute).toContain('export async function GET')
  })

  it('GET still reads from redraftLeagueTrade for historical record access', () => {
    const getBlock = legacyRoute.slice(
      legacyRoute.indexOf('export async function GET'),
      legacyRoute.indexOf('export async function POST'),
    )
    expect(getBlock).toContain('redraftLeagueTrade')
    expect(getBlock).toContain('findMany')
  })

  it('GET returns meta.legacy in response body', () => {
    expect(legacyRoute).toContain('legacyMeta')
    expect(legacyRoute).toContain('legacy: true')
  })

  it('GET requires auth — returns 401 for unauthenticated', () => {
    expect(legacyRoute).toContain('Unauthorized')
    expect(legacyRoute).toContain('401')
  })
})

// ─── Legacy route — no heavy imports pulled in ────────────────────────────────

describe('Legacy route — unused imports removed', () => {
  it('no longer imports capEngine (not needed after retiring write paths)', () => {
    expect(legacyRoute).not.toContain('capEngine')
    expect(legacyRoute).not.toContain('validateRedraftTradeCap')
    expect(legacyRoute).not.toContain('applyRedraftTradeCapTransfers')
  })

  it('no longer imports enqueueCollusionScan', () => {
    expect(legacyRoute).not.toContain('enqueueCollusionScan')
  })

  it('no longer imports recordTradeOutcomeForBothManagers', () => {
    expect(legacyRoute).not.toContain('recordTradeOutcomeForBothManagers')
  })
})

// ─── Canonical client routes ──────────────────────────────────────────────────

describe('lib/redraft/client.ts — canonical route usage', () => {
  it('createTradeProposal calls /api/redraft/trade-proposals (not legacy /api/redraft/trades)', () => {
    expect(clientLib).toContain('/api/redraft/trade-proposals')
    expect(clientLib).not.toContain('/api/redraft/trades')
  })

  it('submitTradeVote calls /api/redraft/trade-votes', () => {
    expect(clientLib).toContain('/api/redraft/trade-votes')
  })

  it('listTradeProposals calls /api/redraft/trade-proposals', () => {
    expect(clientLib).toContain('/api/redraft/trade-proposals')
  })

  it('exports createTradeProposal function', () => {
    expect(clientLib).toContain('export async function createTradeProposal')
  })

  it('exports submitTradeVote function', () => {
    expect(clientLib).toContain('export async function submitTradeVote')
  })

  it('exports listTradeProposals function', () => {
    expect(clientLib).toContain('export async function listTradeProposals')
  })
})

// ─── voidPendingRedraftTradesForRoster — covers both systems ─────────────────

describe('voidPendingRedraftTradesForRoster — covers canonical proposals', () => {
  it('cancels RedraftTradeProposal records for eliminated roster', () => {
    expect(voidHelper).toContain('redraftTradeProposal.updateMany')
  })

  it("sets canonical proposals to status 'cancelled'", () => {
    expect(voidHelper).toContain("status: 'cancelled'")
  })

  it('sets cancelledAt timestamp on canonical proposals', () => {
    expect(voidHelper).toContain('cancelledAt')
  })

  it('still cancels legacy RedraftLeagueTrade records for backward compat', () => {
    expect(voidHelper).toContain('redraftLeagueTrade.updateMany')
    expect(voidHelper).toContain('void_elimination')
  })

  it('covers both proposerRosterId and receiverRosterId sides', () => {
    expect(voidHelper).toContain('proposerRosterId: rosterId')
    expect(voidHelper).toContain('receiverRosterId: rosterId')
  })

  it('returns total cancelled count across both systems', () => {
    expect(voidHelper).toContain('proposalRes.count + legacyRes.count')
  })

  it('only touches pending trades (not accepted/rejected/cancelled ones)', () => {
    expect(voidHelper).toContain("status: 'pending'")
  })

  it('scopes to the current season (not all league history)', () => {
    expect(voidHelper).toContain('seasonId: season.id')
  })

  it('does not touch unrelated leagues — filters by leagueId to find season', () => {
    expect(voidHelper).toContain('where: { leagueId }')
  })
})

// ─── Commissioner veto — NOT added here ──────────────────────────────────────

describe('commissioner veto — not in scope for this task', () => {
  it('legacy route does not implement a new veto route', () => {
    // The only veto handling should be the existing commissioner_veto action in trade-votes
    // No new dedicated veto endpoint was added in this task
    expect(legacyRoute).not.toContain('/api/commissioner')
    expect(legacyRoute).not.toContain('commissionerVeto')
  })

  it('voidHelper does not add commissioner veto logic', () => {
    expect(voidHelper).not.toContain('commissioner_veto')
    expect(voidHelper).not.toContain('commissionerVeto')
  })
})

// ─── Playoff / standings / champion — untouched ───────────────────────────────

describe('trade canonicalization — does not affect playoff/standings/champion code', () => {
  it('legacy trade route does not import playoff engine', () => {
    expect(legacyRoute).not.toContain('playoffEngine')
    expect(legacyRoute).not.toContain('advancePlayoffWinners')
    expect(legacyRoute).not.toContain('finalizeRedraftSeasonChampion')
  })

  it('void helper does not import playoff engine', () => {
    expect(voidHelper).not.toContain('playoffEngine')
    expect(voidHelper).not.toContain('LeagueChampionship')
  })
})
