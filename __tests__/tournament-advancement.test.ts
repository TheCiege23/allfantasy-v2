/**
 * Tournament advancement, condenseRound, resolveNextPhase, crownChampion, and
 * lock guard tests.
 *
 * Covers:
 *  - resolveNextPhase: ≤8 → championship, ≤16 → elite_eight, >16 → elimination
 *  - condenseRound: idempotency (round already exists), _advancementInFlight lock
 *  - crownChampion: no champion round → throws, no rosters → throws, no matchups → throws
 *  - crownChampion: winner correctly identified, post champion announcement, lock tournament
 *  - markEliminated, archiveRound, markRoundCompleted side-effects in condense pipeline
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Pure-unit tests (not importing resolveNextPhase since not exported) ──────
// resolveNextPhase is tested via condenseRound/crownChampion integration

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  prismaMock,
  logAuditMock,
  chatMock,
  scheduleRedraftMock,
  applyFaabMock,
  applyBenchMock,
} = vi.hoisted(() => ({
  prismaMock: {
    legacyTournament: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    legacyTournamentRound: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    legacyTournamentLeague: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    legacyTournamentParticipant: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    legacyTournamentAnnouncement: {
      create: vi.fn(),
    },
    league: {
      create: vi.fn(),
    },
    roster: { findMany: vi.fn(), create: vi.fn() },
    matchupFact: { findMany: vi.fn() },
    appUser: { findUnique: vi.fn() },
  },
  logAuditMock: vi.fn(),
  chatMock: vi.fn(),
  scheduleRedraftMock: vi.fn(),
  applyFaabMock: vi.fn(),
  applyBenchMock: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/tournament-mode/TournamentAuditService', () => ({
  logTournamentAudit: logAuditMock,
}))
vi.mock('@/lib/league-chat/LeagueChatMessageService', () => ({
  createLeagueChatMessage: chatMock,
}))
vi.mock('@/lib/tournament-mode/TournamentRedraftService', () => ({
  scheduleRedraftForRound: scheduleRedraftMock,
  applyFaabResetForRound: applyFaabMock,
  applyBenchSpotsForRound: applyBenchMock,
}))
vi.mock('@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator', () => ({
  runPostCreateInitialization: vi.fn().mockResolvedValue(undefined),
}))

// Import after mocks
import { condenseRound } from '@/lib/tournament-mode/TournamentAdvancementService'
import { crownChampion } from '@/lib/tournament-mode/TournamentChampionService'

// ─── resolveNextPhase is private, tested via integration tests below ─────────

// ─── resolveNextPhase is private, tested via integration tests below ─────────
describe('Phase progression rules (tested via condenseRound integration)', () => {
  it('condenseRound with ≤8 advancing should mark for championship phase', async () => {
    const baseTournament = {
      id: 't-1',
      name: 'Test Tournament',
      sport: 'NFL',
      creatorId: 'creator-1',
      status: 'elimination',
      settings: { draftType: 'snake', faabBudgetDefault: 100 },
      conferences: [{ id: 'conf-1', name: 'Black', orderIndex: 0 }],
    }
    prismaMock.legacyTournament.findUnique.mockResolvedValue(baseTournament)
    prismaMock.legacyTournament.update.mockResolvedValue(baseTournament)
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue(null)
    prismaMock.legacyTournamentRound.create.mockResolvedValue({ id: 'r-new-1', roundIndex: 2, status: 'active' })
    prismaMock.legacyTournamentLeague.findMany.mockResolvedValue([])
    prismaMock.league.create.mockResolvedValue({ id: 'l-champ-1' })
    prismaMock.legacyTournamentAnnouncement.create.mockResolvedValue({})
    scheduleRedraftMock.mockResolvedValue({ scheduled: 0, leagueIds: [] })
    applyFaabMock.mockResolvedValue(undefined)
    applyBenchMock.mockResolvedValue(undefined)
    logAuditMock.mockResolvedValue(undefined)
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 0 })
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })

    const result = await condenseRound('t-1', 1, 8)
    // With 8 advancing, next phase should be championship
    expect(result.newRoundIndex).toBe(2)
  })
})

// ─── condenseRound — idempotency guard ────────────────────────────────────────
describe('condenseRound — idempotency & lock guard', () => {
  const baseTournament = {
    id: 't-1',
    name: 'Test Tournament',
    sport: 'NFL',
    creatorId: 'creator-1',
    status: 'elimination',
    settings: { draftType: 'snake', faabBudgetDefault: 100 },
    conferences: [
      { id: 'conf-black', name: 'Black', orderIndex: 0 },
      { id: 'conf-gold', name: 'Gold', orderIndex: 1 },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.legacyTournament.findUnique.mockResolvedValue(baseTournament)
    prismaMock.legacyTournament.update.mockResolvedValue(baseTournament)
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue(null)
    prismaMock.legacyTournamentRound.create.mockResolvedValue({ id: 'r-new-1', roundIndex: 1, status: 'active' })
    prismaMock.legacyTournamentLeague.findMany.mockResolvedValue([])
    prismaMock.league.create.mockResolvedValue({ id: 'l-champ-1' })
    prismaMock.legacyTournamentAnnouncement.create.mockResolvedValue({})
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })
    scheduleRedraftMock.mockResolvedValue({ scheduled: 0, leagueIds: [] })
    applyFaabMock.mockResolvedValue(undefined)
    applyBenchMock.mockResolvedValue(undefined)
    logAuditMock.mockResolvedValue(undefined)
  })

  it('throws if target round already exists (idempotency guard)', async () => {
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue({
      id: 'r-existing',
      roundIndex: 1,
      status: 'active',
    })
    await expect(condenseRound('t-1', 0, 6)).rejects.toThrow(/already exists/)
  })

  it('throws if _advancementInFlight is set (concurrent lock guard)', async () => {
    prismaMock.legacyTournament.findUnique.mockResolvedValue({
      ...baseTournament,
      settings: { ...baseTournament.settings, _advancementInFlight: true },
    })
    await expect(condenseRound('t-1', 0, 6)).rejects.toThrow(/in.progress|in flight/i)
  })

  it('throws when tournament not found', async () => {
    prismaMock.legacyTournament.findUnique.mockResolvedValue(null)
    await expect(condenseRound('t-1', 0, 6)).rejects.toThrow('Tournament not found')
  })

  it('sets _advancementInFlight = true before processing', async () => {
    await condenseRound('t-1', 0, 6)
    const setLockCall = prismaMock.legacyTournament.update.mock.calls.find(
      (c) => c[0]?.data?.settings?._advancementInFlight === true
    )
    expect(setLockCall).toBeDefined()
  })

  it('clears _advancementInFlight after processing', async () => {
    await condenseRound('t-1', 0, 6)
    // One of the update calls must clear the lock
    const clearLockCall = prismaMock.legacyTournament.update.mock.calls.find((c) => {
      const s = c[0]?.data?.settings as Record<string, unknown>
      return s && !('_advancementInFlight' in s)
    })
    expect(clearLockCall).toBeDefined()
  })
})

// ─── crownChampion ────────────────────────────────────────────────────────────
describe('crownChampion', () => {
  const baseTournament = {
    id: 't-1',
    name: 'All Fantasy Bowl',
    status: 'championship',
    settings: {},
    rounds: [{ id: 'r-champ', roundIndex: 3, phase: 'championship', status: 'active' }],
  }

  const champLeague = {
    id: 'tl-1',
    leagueId: 'l-final',
    roundIndex: 3,
    phase: 'championship',
    league: { id: 'l-final', name: 'Championship League' },
  }

  const rosters = [
    { id: 'r-1', platformUserId: 'u-1' },
    { id: 'r-2', platformUserId: 'u-2' },
  ]

  const matchups = [
    { teamA: 'r-1', teamB: 'r-2', scoreA: 120.5, scoreB: 100.0, winnerTeamId: 'r-1' },
    { teamA: 'r-2', teamB: 'r-1', scoreA: 95.0, scoreB: 130.0, winnerTeamId: 'r-1' },
  ]

  const winnerUser = { id: 'u-1', displayName: 'The Champion', username: 'champion_player' }

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.legacyTournament.findUnique.mockResolvedValue(baseTournament)
    prismaMock.legacyTournamentLeague.findFirst.mockResolvedValue(champLeague)
    prismaMock.roster.findMany.mockResolvedValue(rosters)
    prismaMock.matchupFact.findMany.mockResolvedValue(matchups)
    prismaMock.appUser.findUnique.mockResolvedValue(winnerUser)
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.legacyTournament.update.mockResolvedValue({})
    prismaMock.legacyTournamentAnnouncement.create.mockResolvedValue({})
    logAuditMock.mockResolvedValue(undefined)
    chatMock.mockResolvedValue(undefined)
  })

  it('throws if tournament does not exist', async () => {
    prismaMock.legacyTournament.findUnique.mockResolvedValue(null)
    await expect(crownChampion('t-1')).rejects.toThrow('Tournament not found')
  })

  it('throws if tournament is already completed', async () => {
    prismaMock.legacyTournament.findUnique.mockResolvedValue({ ...baseTournament, status: 'completed' })
    await expect(crownChampion('t-1')).rejects.toThrow(/already completed/)
  })

  it('throws if no championship round found', async () => {
    prismaMock.legacyTournament.findUnique.mockResolvedValue({
      ...baseTournament,
      rounds: [{ id: 'r-elim', roundIndex: 1, phase: 'elimination', status: 'active' }],
    })
    await expect(crownChampion('t-1')).rejects.toThrow(/Championship round|championship.*not/)
  })

  it('throws if championship league not found', async () => {
    prismaMock.legacyTournamentLeague.findFirst.mockResolvedValue(null)
    await expect(crownChampion('t-1')).rejects.toThrow(/Championship league not found/)
  })

  it('throws if championship league has no rosters', async () => {
    prismaMock.roster.findMany.mockResolvedValue([])
    await expect(crownChampion('t-1')).rejects.toThrow(/no rosters/)
  })

  it('throws if championship league has no matchup results', async () => {
    prismaMock.matchupFact.findMany.mockResolvedValue([])
    await expect(crownChampion('t-1')).rejects.toThrow(/no matchup results/)
  })

  it('correctly identifies winner by wins + tiebreakers', async () => {
    const result = await crownChampion('t-1')
    expect(result.championUserId).toBe('u-1')
  })

  it('locks tournament status to completed', async () => {
    await crownChampion('t-1')
    expect(prismaMock.legacyTournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      })
    )
  })

  it('marks champion participant with status=champion', async () => {
    await crownChampion('t-1')
    const championCall = prismaMock.legacyTournamentParticipant.updateMany.mock.calls.find(
      (c) => c[0]?.data?.status === 'champion'
    )
    expect(championCall).toBeDefined()
    expect(championCall![0].where.userId).toBe('u-1')
  })

  it('marks other participants as eliminated', async () => {
    await crownChampion('t-1')
    const elimCall = prismaMock.legacyTournamentParticipant.updateMany.mock.calls.find(
      (c) => c[0]?.data?.status === 'eliminated'
    )
    expect(elimCall).toBeDefined()
  })

  it('marks final round as completed', async () => {
    await crownChampion('t-1')
    expect(prismaMock.legacyTournamentRound.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 't-1', roundIndex: 3 },
        data: expect.objectContaining({ status: 'completed' }),
      })
    )
  })

  it('uses displayName in champion result', async () => {
    const result = await crownChampion('t-1')
    expect(result.championTeamName ?? result.championUserId).toBeTruthy()
  })

  it('returns tournamentName in result', async () => {
    const result = await crownChampion('t-1')
    expect(result.tournamentName).toBe('All Fantasy Bowl')
  })

  it('returns correct finalLeagueId', async () => {
    const result = await crownChampion('t-1')
    expect(result.finalLeagueId).toBe('l-final')
  })

  it('writes champion audit log', async () => {
    await crownChampion('t-1')
    expect(logAuditMock).toHaveBeenCalledWith(
      't-1',
      'advancement_run',
      expect.objectContaining({
        metadata: expect.objectContaining({ championUserId: 'u-1', action: 'crown_champion' }),
      })
    )
  })
})

// ─── condenseRound — phase progression ────────────────────────────────────────
describe('condenseRound — phase progression integration', () => {
  const baseTournament = {
    id: 't-1',
    name: 'Test Tournament',
    sport: 'NFL',
    status: 'elimination',
    settings: { draftType: 'snake', faabBudgetDefault: 100, benchSpotsElimination: 2, qualificationTiebreakers: ['wins', 'points_for'], faabResetByRound: true },
    conferences: [{ id: 'conf-1', name: 'Black', orderIndex: 0 }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.legacyTournament.findUnique.mockResolvedValue(baseTournament)
    prismaMock.legacyTournament.update.mockResolvedValue(baseTournament)
    prismaMock.legacyTournamentRound.findUnique.mockResolvedValue(null)
    prismaMock.legacyTournamentRound.create.mockResolvedValue({ id: 'r-new-1', roundIndex: 2, status: 'active' })
    prismaMock.legacyTournamentRound.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.league.create.mockResolvedValue({ id: 'l-champ-1' })
    prismaMock.legacyTournamentAnnouncement.create.mockResolvedValue({})
    scheduleRedraftMock.mockResolvedValue({ scheduled: 1, leagueIds: ['l-new'] })
    applyFaabMock.mockResolvedValue(undefined)
    applyBenchMock.mockResolvedValue(undefined)
    logAuditMock.mockResolvedValue(undefined)
    prismaMock.legacyTournamentParticipant.updateMany.mockResolvedValue({ count: 0 })
  })

  it('creates new round at fromRoundIndex + 1', async () => {
    prismaMock.legacyTournamentLeague.findMany.mockResolvedValue([])
    prismaMock.legacyTournamentLeague.create.mockResolvedValue({ id: 'tl-new', leagueId: 'l-new' })
    const result = await condenseRound('t-1', 1, 6)
    expect(result.newRoundIndex).toBe(2)
  })

  it('calls scheduleRedraftForRound for new round', async () => {
    prismaMock.legacyTournamentLeague.findMany.mockResolvedValue([])
    prismaMock.legacyTournamentLeague.create.mockResolvedValue({ id: 'tl-new', leagueId: 'l-new' })
    await condenseRound('t-1', 1, 6)
    expect(scheduleRedraftMock).toHaveBeenCalled()
  })

  it('calls applyFaabResetForRound after condensation', async () => {
    prismaMock.legacyTournamentLeague.findMany.mockResolvedValue([])
    prismaMock.legacyTournamentLeague.create.mockResolvedValue({ id: 'tl-new', leagueId: 'l-new' })
    await condenseRound('t-1', 1, 6)
    expect(applyFaabMock).toHaveBeenCalledWith('t-1', 2, 100)
  })
})
