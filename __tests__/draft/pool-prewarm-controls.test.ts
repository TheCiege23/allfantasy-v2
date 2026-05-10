/**
 * Pool prewarm gate — draft start/resume must not begin the timer while the
 * draft pool DB cache is cold.
 *
 * Behaviors locked here:
 *   1. ensureDraftPoolReady source: fast path checks DB cache before pool build.
 *   2. ensureDraftPoolReady source: slow path calls getResolvedDraftPoolForLeague.
 *   3. ensureDraftPoolReady source: failure path returns { ok:false } on error.
 *   4. ensureDraftPoolReady source: writes to draftPoolCache on rebuild.
 *   5. Controls route 'start': calls ensureDraftPoolReady before startDraftSession.
 *   6. Controls route 'resume': calls ensureDraftPoolReady before resumeDraftSession.
 *   7. Controls route returns 503 POOL_NOT_READY when prewarm fails — timer does not start.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const root = resolve(__dirname, '..', '..')
const prewarmSrc = readFileSync(resolve(root, 'lib/draft-room/ensureDraftPoolReady.ts'), 'utf8')
const controlsSrc = readFileSync(
  resolve(root, 'app/api/leagues/[leagueId]/draft/controls/route.ts'),
  'utf8',
)

// ---------------------------------------------------------------------------
// Source-level invariants for ensureDraftPoolReady
// ---------------------------------------------------------------------------

describe('Behavior 1: fast path checks DB cache before pool rebuild', () => {
  it('calls findFirst to check for a fresh cache row', () => {
    // source uses model.findFirst (via getDraftPoolCacheModel())
    expect(prewarmSrc).toContain('model.findFirst(')
  })

  it('fast-path check includes leagueId and expiresAt filter', () => {
    const findIdx = prewarmSrc.indexOf('model.findFirst(')
    const block = prewarmSrc.slice(findIdx, findIdx + 300)
    expect(block).toContain('leagueId')
    expect(block).toContain('expiresAt')
  })

  it('returns ok:true, source:db-cache when fresh row found — before pool rebuild call', () => {
    expect(prewarmSrc).toContain("source: 'db-cache'")
    const cacheReturnIdx = prewarmSrc.indexOf("source: 'db-cache'")
    const poolCallIdx = prewarmSrc.indexOf('getResolvedDraftPoolForLeague(leagueId,')
    expect(cacheReturnIdx).toBeGreaterThan(-1)
    expect(poolCallIdx).toBeGreaterThan(-1)
    expect(cacheReturnIdx).toBeLessThan(poolCallIdx)
  })
})

describe('Behavior 2: slow path calls getResolvedDraftPoolForLeague', () => {
  it('imports and calls getResolvedDraftPoolForLeague on cache miss', () => {
    expect(prewarmSrc).toContain("from '@/lib/draft-room/getResolvedDraftPoolForLeague'")
    expect(prewarmSrc).toContain('getResolvedDraftPoolForLeague(leagueId,')
  })

  it('passes limit:300 and poolType:null to match the standard pool route request', () => {
    expect(prewarmSrc).toContain('limit: 300')
    expect(prewarmSrc).toContain('poolType: null')
  })

  it('passes effectiveLeagueTemplate to avoid double-loading the roster schema', () => {
    expect(prewarmSrc).toContain('effectiveLeagueTemplate')
  })
})

describe('Behavior 3: failure path returns { ok:false } when pool build throws', () => {
  it('wraps pool build in try/catch', () => {
    expect(prewarmSrc).toMatch(/try\s*\{[\s\S]*?getResolvedDraftPoolForLeague[\s\S]*?\}\s*catch/)
  })

  it('catch block returns { ok: false, error: ... }', () => {
    expect(prewarmSrc).toContain('return {')
    expect(prewarmSrc).toContain('ok: false,')
    expect(prewarmSrc).toContain('error:')
  })
})

describe('Behavior 4: rebuilt pool is written to draftPoolCache', () => {
  it('calls draftPoolCache.upsert after building the pool', () => {
    expect(prewarmSrc).toContain('model.upsert(')
  })

  it('upsert includes leagueId, cacheKey, expiresAt', () => {
    const upsertIdx = prewarmSrc.indexOf('model.upsert(')
    const block = prewarmSrc.slice(upsertIdx, upsertIdx + 1200)
    expect(block).toContain('leagueId')
    expect(block).toContain('cacheKey')
    expect(block).toContain('expiresAt')
  })
})

// ---------------------------------------------------------------------------
// Source-level: controls route wiring
// ---------------------------------------------------------------------------

describe('Behavior 5: controls route imports and calls ensureDraftPoolReady for start', () => {
  it('imports ensureDraftPoolReady from the prewarm lib', () => {
    expect(controlsSrc).toContain("from '@/lib/draft-room/ensureDraftPoolReady'")
  })

  it('ensureDraftPoolReady is called in the start branch', () => {
    // Find the start branch
    const startBranchIdx = controlsSrc.indexOf("if (action === 'start')")
    expect(startBranchIdx).toBeGreaterThan(-1)
    // The prewarm call must appear after the branch opens
    const prewarmInStart = controlsSrc.indexOf('ensureDraftPoolReady(leagueId)', startBranchIdx)
    const startDraftIdx = controlsSrc.indexOf('startDraftSession(leagueId)', startBranchIdx)
    expect(prewarmInStart).toBeGreaterThan(-1)
    expect(prewarmInStart).toBeLessThan(startDraftIdx)
  })

  it('503 POOL_NOT_READY returned in start branch when prewarm fails', () => {
    const startBranchIdx = controlsSrc.indexOf("if (action === 'start')")
    const block = controlsSrc.slice(startBranchIdx, startBranchIdx + 600)
    expect(block).toContain('POOL_NOT_READY')
    expect(block).toContain('503')
  })
})

describe('Behavior 6: controls route calls ensureDraftPoolReady for resume', () => {
  it('ensureDraftPoolReady is called in the resume branch', () => {
    const resumeBranchIdx = controlsSrc.indexOf("if (action === 'resume')")
    expect(resumeBranchIdx).toBeGreaterThan(-1)
    const prewarmInResume = controlsSrc.indexOf('ensureDraftPoolReady(leagueId)', resumeBranchIdx)
    const resumeDraftIdx = controlsSrc.indexOf('resumeDraftSession(leagueId)', resumeBranchIdx)
    expect(prewarmInResume).toBeGreaterThan(-1)
    expect(prewarmInResume).toBeLessThan(resumeDraftIdx)
  })

  it('503 POOL_NOT_READY returned in resume branch when prewarm fails', () => {
    const resumeBranchIdx = controlsSrc.indexOf("if (action === 'resume')")
    const block = controlsSrc.slice(resumeBranchIdx, resumeBranchIdx + 600)
    expect(block).toContain('POOL_NOT_READY')
    expect(block).toContain('503')
  })
})

// ---------------------------------------------------------------------------
// Behavioral: controls route with mocked ensureDraftPoolReady
// ---------------------------------------------------------------------------

const getServerSessionMock = vi.hoisted(() =>
  vi.fn(async () => ({ user: { id: 'commissioner-1' } } as null | { user?: { id?: string } })),
)
const assertLeagueActionGateMock = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true as const })),
)
const ensureDraftPoolReadyMock = vi.hoisted(() =>
  vi.fn(async (_leagueId: string) => ({ ok: true as const, source: 'db-cache' as const })),
)
const startDraftSessionMock = vi.hoisted(() => vi.fn(async () => ({ ok: true as const })))
const resumeDraftSessionMock = vi.hoisted(() => vi.fn(async () => true))
const buildSessionSnapshotMock = vi.hoisted(() => vi.fn(async () => null))

vi.mock('next-auth', () => ({
  getServerSession: (...a: unknown[]) => getServerSessionMock(...a),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/server/services/leagueActionGate', () => ({
  assertLeagueActionGate: (...a: unknown[]) => assertLeagueActionGateMock(...a),
}))
vi.mock('@/lib/draft-room/ensureDraftPoolReady', () => ({
  ensureDraftPoolReady: (...a: [string]) => ensureDraftPoolReadyMock(...a),
}))
vi.mock('@/lib/live-draft-engine/DraftSessionService', () => ({
  startDraftSession: (...a: [string]) => startDraftSessionMock(...a),
  resumeDraftSession: (...a: [string]) => resumeDraftSessionMock(...a),
  pauseDraftSession: vi.fn(async () => true),
  buildSessionSnapshot: (...a: unknown[]) => buildSessionSnapshotMock(...a),
  resetTimer: vi.fn(async () => true),
  undoLastPick: vi.fn(async () => false),
  swapDraftManagers: vi.fn(async () => ({ ok: false, code: 'NO_SESSION', error: 'no session' })),
  completeDraftSession: vi.fn(async () => false),
  resetDraftSession: vi.fn(async () => false),
  setTimerSeconds: vi.fn(async () => false),
}))
vi.mock('@/lib/live-draft-engine/PickSubmissionService', () => ({
  submitPick: vi.fn(async () => ({ success: false, error: 'unused' })),
}))
vi.mock('@/lib/live-draft-engine/RosterAssignmentService', () => ({
  appendPickToRosterDraftSnapshot: vi.fn(async () => {}),
  finalizeRosterAssignments: vi.fn(async () => {}),
}))
vi.mock('@/lib/live-draft-engine/slow-draft/SlowDraftRuntimeService', () => ({
  runSlowDraftAutomationTick: vi.fn(async () => ({ changed: false, actions: [] })),
}))
vi.mock('@/lib/live-draft-engine/auction', () => ({
  runAuctionAutomationTick: vi.fn(async () => ({ changed: false, actions: [] })),
}))
vi.mock('@/lib/live-draft-engine/keeper', () => ({
  runKeeperAutomationTick: vi.fn(async () => ({ changed: false, actions: [] })),
}))
vi.mock('@/lib/draft-notifications', () => ({
  notifyDraftStartingSoon: vi.fn(async () => {}),
  notifyDraftResumed: vi.fn(async () => {}),
  notifyDraftPaused: vi.fn(async () => {}),
  notifyDraftIntelOnClockUrgent: vi.fn(async () => {}),
  notifyDraftIntelQueueReady: vi.fn(async () => {}),
  notifyDraftIntelPickConfirmation: vi.fn(async () => {}),
  notifyDraftIntelPlayerTaken: vi.fn(async () => {}),
  notifyDraftIntelTierBreak: vi.fn(async () => {}),
  notifyDraftIntelOrphanTeamPick: vi.fn(async () => {}),
  notifyAutoPickFired: vi.fn(async () => {}),
  notifyOnTheClockAfterPick: vi.fn(async () => {}),
  notifyQueuePlayerUnavailable: vi.fn(async () => {}),
  notifyDraftIntelPostDraftRecap: vi.fn(async () => {}),
  getLeagueMemberAppUserIds: vi.fn(async () => []),
}))
vi.mock('@/lib/draft-intelligence', () => ({
  publishDraftIntelForUpcomingManagers: vi.fn(async () => []),
  sendDraftIntelDm: vi.fn(async () => {}),
  publishDraftIntelRecap: vi.fn(async () => null),
}))
vi.mock('@/lib/live-draft-engine/auth', () => ({
  getCurrentUserRosterIdForLeague: vi.fn(async () => null),
}))
vi.mock('@/lib/orphan-ai-manager/orphanRosterResolver', () => ({
  getOrphanRosterIdsForLeague: vi.fn(async () => []),
}))
vi.mock('@/lib/draft-defaults/DraftUISettingsResolver', () => ({
  getDraftUISettingsForLeague: vi.fn(async () => ({
    commissionerPauseControlsEnabled: true,
    commissionerForceAutoPickEnabled: true,
    autoPickEnabled: true,
    orphanTeamAiManagerEnabled: false,
    orphanDrafterMode: 'cpu',
    timerMode: 'normal',
  })),
}))
vi.mock('@/lib/draft-defaults/DraftRoomConfigResolver', () => ({
  getDraftConfigForLeague: vi.fn(async () => null),
}))
vi.mock('@/lib/provider-config', () => ({
  getProviderStatus: () => ({ anyAi: false }),
}))
vi.mock('@/lib/league/roster-configuration-gate-error', () => ({
  rosterConfigurationIncompleteBody: () => ({ error: 'incomplete' }),
  DRAFT_ROSTER_CONFIGURATION_CLIENT_MESSAGE: 'incomplete',
}))
vi.mock('@/lib/subscription/EntitlementResolver', () => ({
  EntitlementResolver: class {
    resolveForUser = vi.fn(async () => ({ hasAccess: false }))
  },
}))
vi.mock('@/lib/live-draft-engine/LiveDraftAutopickPreferenceService', () => ({
  getViewerAutopickPreference: vi.fn(async () => ({
    enabled: false,
    mode: 'standard',
    isProEligible: false,
    updatedAt: null,
  })),
}))
vi.mock('@/lib/adp-data', () => ({ getLiveADP: vi.fn(async () => []) }))
vi.mock('@/lib/sport-teams/SportPlayerPoolResolver', () => ({
  getPlayerPoolForLeague: vi.fn(async () => []),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    draftSession: { findUnique: vi.fn(async () => null) },
    roster: { findUnique: vi.fn(async () => null) },
    league: { findUnique: vi.fn(async () => null) },
    draftPickAuditLog: { create: vi.fn(async () => ({})) },
  },
}))

import { NextRequest } from 'next/server'

const { POST: controlsPOST } = await import(
  '@/app/api/leagues/[leagueId]/draft/controls/route'
)

function makeReq(action: string, leagueId = 'league-1') {
  return [
    new NextRequest(`http://localhost/api/leagues/${leagueId}/draft/controls`, {
      method: 'POST',
      body: JSON.stringify({ action }),
      headers: { 'Content-Type': 'application/json' },
    }),
    { params: Promise.resolve({ leagueId }) },
  ] as const
}

beforeEach(() => {
  vi.clearAllMocks()
  ensureDraftPoolReadyMock.mockResolvedValue({ ok: true, source: 'db-cache' })
  startDraftSessionMock.mockResolvedValue({ ok: true })
  resumeDraftSessionMock.mockResolvedValue(true)
})

describe('Behavior 5 (behavioral): start action calls ensureDraftPoolReady first', () => {
  it('calls ensureDraftPoolReady with leagueId before startDraftSession', async () => {
    const [req, ctx] = makeReq('start')
    await controlsPOST(req, ctx)
    expect(ensureDraftPoolReadyMock).toHaveBeenCalledWith('league-1')
    const prewarmOrder = ensureDraftPoolReadyMock.mock.invocationCallOrder[0]
    const startOrder = startDraftSessionMock.mock.invocationCallOrder[0]
    expect(prewarmOrder).toBeLessThan(startOrder)
  })
})

describe('Behavior 6 (behavioral): resume action calls ensureDraftPoolReady first', () => {
  it('calls ensureDraftPoolReady with leagueId before resumeDraftSession', async () => {
    const [req, ctx] = makeReq('resume')
    await controlsPOST(req, ctx)
    expect(ensureDraftPoolReadyMock).toHaveBeenCalledWith('league-1')
    const prewarmOrder = ensureDraftPoolReadyMock.mock.invocationCallOrder[0]
    const resumeOrder = resumeDraftSessionMock.mock.invocationCallOrder[0]
    expect(prewarmOrder).toBeLessThan(resumeOrder)
  })
})

describe('Behavior 7: 503 POOL_NOT_READY — timer does not start when prewarm fails', () => {
  it('start returns 503 and does NOT call startDraftSession', async () => {
    ensureDraftPoolReadyMock.mockResolvedValueOnce({
      ok: false,
      error: 'Failed to warm draft pool: timeout',
    })
    const [req, ctx] = makeReq('start')
    const res = await controlsPOST(req, ctx)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('POOL_NOT_READY')
    expect(startDraftSessionMock).not.toHaveBeenCalled()
  })

  it('resume returns 503 and does NOT call resumeDraftSession', async () => {
    ensureDraftPoolReadyMock.mockResolvedValueOnce({
      ok: false,
      error: 'League not found',
    })
    const [req, ctx] = makeReq('resume')
    const res = await controlsPOST(req, ctx)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('POOL_NOT_READY')
    expect(resumeDraftSessionMock).not.toHaveBeenCalled()
  })
})
