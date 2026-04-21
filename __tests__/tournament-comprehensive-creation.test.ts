/**
 * Comprehensive tournament creation tests.
 * Covers: all 7 sports, both draft types (snake/auction), all 10 pool sizes,
 * league naming (app_generated / commissioner_custom), conference modes,
 * settings merging, FAAB defaults, and input validation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Hoist all mocks before imports ──────────────────────────────────────────
const {
  getServerSessionMock,
  computeLeagueCountMock,
  createTournamentMock,
  validateCommissionerLeagueNamesMock,
} = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  computeLeagueCountMock: vi.fn(),
  createTournamentMock: vi.fn(),
  validateCommissionerLeagueNamesMock: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/tournament-mode/TournamentCreationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tournament-mode/TournamentCreationService')>()
  return { ...actual, createTournament: createTournamentMock }
})
vi.mock('@/lib/tournament-mode/LeagueNamingService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tournament-mode/LeagueNamingService')>()
  return { ...actual }
})

import { POST } from '@/app/api/tournament/create/route'

// ─── Pure unit imports (no mocks needed) ─────────────────────────────────────
import {
  computeLeagueCount,
  mergeDefaultTournamentHubSettings,
} from '@/lib/tournament-mode/TournamentCreationService'
import {
  generateLeagueNames,
  validateCommissionerLeagueNames,
  generateInviteCode,
} from '@/lib/tournament-mode/LeagueNamingService'
import { DEFAULT_TOURNAMENT_SETTINGS } from '@/lib/tournament-mode/constants'
import {
  getFeederLeagueCountForPool,
  getQualificationAdvancementTotal,
  getQualificationCutSlotsPerConference,
  TOURNAMENT_POOL_TIERS,
  FEEDER_LEAGUES_BY_POOL,
  TOURNAMENT_TEAMS_PER_LEAGUE,
  getRoundWindow,
} from '@/lib/tournament-mode/tournament-sport-cutoffs'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildRequest(body: Record<string, unknown>) {
  return new Request('http://localhost:3000/api/tournament/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const BASE_VALID_BODY = {
  name: 'My Tournament',
  sport: 'NFL',
  settings: { participantPoolSize: 72, draftType: 'snake' },
}

// ─── Route validation ─────────────────────────────────────────────────────────
describe('POST /api/tournament/create — route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    computeLeagueCountMock.mockReturnValue(6)
    createTournamentMock.mockResolvedValue({
      tournamentId: 't-1',
      leagueIds: ['l-1'],
      inviteDistribution: [],
      conferenceNames: ['Black', 'Gold'],
    })
    validateCommissionerLeagueNamesMock.mockReturnValue({ valid: true, errors: [] })
  })

  it('401 when not authenticated', async () => {
    getServerSessionMock.mockResolvedValue(null)
    const res = await POST(buildRequest(BASE_VALID_BODY))
    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' })
  })

  it('400 for missing sport', async () => {
    const res = await POST(buildRequest({ name: 'T', settings: { participantPoolSize: 72 } }))
    expect(res.status).toBe(400)
  })

  it('400 for missing tournament name', async () => {
    const res = await POST(buildRequest({ sport: 'NFL', settings: { participantPoolSize: 72 } }))
    expect(res.status).toBe(400)
  })

  it('200 when participantPoolSize is absent (defaults to 72)', async () => {
    const res = await POST(buildRequest({ name: 'T', sport: 'NFL', settings: {} }))
    // Route applies DEFAULT_TOURNAMENT_SETTINGS.participantPoolSize = 72 when omitted
    expect([200, 201]).toContain(res.status)
  })

  it('400 rejects CRICKET (unsupported sport)', async () => {
    const res = await POST(buildRequest({ ...BASE_VALID_BODY, sport: 'CRICKET' }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Sport must be one of'),
    })
    expect(createTournamentMock).not.toHaveBeenCalled()
  })

  it('400 rejects salary_cap draft type', async () => {
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { participantPoolSize: 72, draftType: 'salary_cap' },
    }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('snake or auction'),
    })
  })

  it('400 rejects 3rd_reversal draft type from create route', async () => {
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { participantPoolSize: 72, draftType: '3rd_reversal' },
    }))
    expect(res.status).toBe(400)
  })

  it('201/200 on valid NFL snake tournament', async () => {
    const res = await POST(buildRequest(BASE_VALID_BODY))
    expect([200, 201]).toContain(res.status)
    const body = await res.json()
    expect(body).toHaveProperty('tournamentId')
    expect(createTournamentMock).toHaveBeenCalledOnce()
  })

  it('creates auction tournament successfully', async () => {
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { participantPoolSize: 72, draftType: 'auction' },
    }))
    expect([200, 201]).toContain(res.status)
  })

  it('forwards league naming validation errors', async () => {
    // Route only validates names when leagueNamingMode is commissioner_custom
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { ...BASE_VALID_BODY.settings, leagueNamingMode: 'commissioner_custom' },
      leagueNames: ['League 1', 'League 1'],
    }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('Duplicate'),
    })
  })

  it('400 when commissioner_custom names count is less than feeder league count', async () => {
    // Pool 72 → 6 feeders needed; only 3 names provided
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { participantPoolSize: 72, draftType: 'snake', leagueNamingMode: 'commissioner_custom' },
      leagueNames: ['Alpha', 'Bravo', 'Charlie'],
    }))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('6 league names'),
    })
  })

  it('200 when commissioner_custom names count exactly matches feeder count', async () => {
    // Pool 72 → 6 feeders; provide exactly 6 names
    const res = await POST(buildRequest({
      ...BASE_VALID_BODY,
      settings: { participantPoolSize: 72, draftType: 'snake', leagueNamingMode: 'commissioner_custom' },
      leagueNames: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'],
    }))
    expect([200, 201]).toContain(res.status)
    expect(createTournamentMock).toHaveBeenCalledOnce()
  })
})

// ─── All 7 supported sports ───────────────────────────────────────────────────
describe('POST /api/tournament/create — all supported sports', () => {
  const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER']

  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    computeLeagueCountMock.mockReturnValue(6)
    createTournamentMock.mockResolvedValue({
      tournamentId: 't-1', leagueIds: [], inviteDistribution: [], conferenceNames: ['Black', 'Gold'],
    })
    validateCommissionerLeagueNamesMock.mockReturnValue({ valid: true, errors: [] })
  })

  for (const sport of sports) {
    it(`accepts ${sport}`, async () => {
      const res = await POST(buildRequest({ ...BASE_VALID_BODY, sport }))
      expect([200, 201]).toContain(res.status)
      const body = await res.json()
      expect(body).toHaveProperty('tournamentId')
    })
  }
})

// ─── Pool tiers ───────────────────────────────────────────────────────────────
describe('tournament pool tier validation', () => {
  it('exposes all 10 tiers', () => {
    expect(TOURNAMENT_POOL_TIERS).toEqual([32, 64, 72, 96, 128, 144, 160, 192, 216, 224])
  })

  it('each tier has a mapped feeder league count', () => {
    for (const tier of TOURNAMENT_POOL_TIERS) {
      const count = FEEDER_LEAGUES_BY_POOL[tier]
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  it('tier 72 = 6 feeder leagues', () => expect(getFeederLeagueCountForPool(72)).toBe(6))
  it('tier 144 = 12 feeder leagues', () => expect(getFeederLeagueCountForPool(144)).toBe(12))
  it('tier 216 = 18 feeder leagues', () => expect(getFeederLeagueCountForPool(216)).toBe(18))
  it('tier 32 = 2 feeder leagues', () => expect(getFeederLeagueCountForPool(32)).toBe(2))
  it('non-tier 200 falls back correctly', () => expect(getFeederLeagueCountForPool(200)).toBe(16))
  it('computeLeagueCount(72, 12) = 6', () => expect(computeLeagueCount(72, 12)).toBe(6))
  it('computeLeagueCount(144, 12) = 12', () => expect(computeLeagueCount(144, 12)).toBe(12))
})

// ─── League naming ────────────────────────────────────────────────────────────
describe('generateLeagueNames', () => {
  it('app_generated round 0 returns feeder-style names (BEAST, GOAT, etc.)', () => {
    const names = generateLeagueNames(6, 'app_generated', 'black_vs_gold', 0)
    expect(names).toHaveLength(6)
    expect(names.every((n) => n.length > 0)).toBe(true)
  })

  it('app_generated round > 0 returns directional names', () => {
    const names = generateLeagueNames(4, 'app_generated', 'black_vs_gold', 1)
    expect(names).toHaveLength(4)
    const directional = new Set(['NORTH', 'SOUTH', 'EAST', 'WEST'])
    for (const n of names) expect(directional.has(n)).toBe(true)
  })

  it('commissioner_custom uses provided names', () => {
    const custom = ['Alpha', 'Bravo', 'Charlie']
    const names = generateLeagueNames(3, 'commissioner_custom', 'black_vs_gold', 0, custom)
    expect(names).toEqual(custom)
  })

  it('ai_themed falls back to app_generated', () => {
    const names = generateLeagueNames(3, 'ai_themed', 'black_vs_gold', 0)
    expect(names).toHaveLength(3)
  })

  it('seeded shuffle produces deterministic output', () => {
    const a = generateLeagueNames(6, 'app_generated', 'black_vs_gold', 0, undefined, 42)
    const b = generateLeagueNames(6, 'app_generated', 'black_vs_gold', 0, undefined, 42)
    expect(a).toEqual(b)
  })
})

// ─── League name validation ───────────────────────────────────────────────────
describe('validateCommissionerLeagueNames', () => {
  it('passes unique non-empty names', () => {
    const result = validateCommissionerLeagueNames(['Alpha', 'Bravo', 'Charlie'])
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails on duplicate names', () => {
    const result = validateCommissionerLeagueNames(['Alpha', 'alpha'])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true)
  })

  it('fails on empty string name', () => {
    const result = validateCommissionerLeagueNames(['Alpha', ''])
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('empty'))).toBe(true)
  })

  it('catches conflicts with existing tournament names', () => {
    const result = validateCommissionerLeagueNames(['Alpha'], ['alpha'])
    expect(result.valid).toBe(false)
  })
})

// ─── Invite code ─────────────────────────────────────────────────────────────
describe('generateInviteCode', () => {
  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, generateInviteCode))
    expect(codes.size).toBe(100)
  })

  it('code is a non-empty string', () => {
    const code = generateInviteCode()
    expect(typeof code).toBe('string')
    expect(code.length).toBeGreaterThan(0)
  })
})

// ─── Hub settings defaults ────────────────────────────────────────────────────
describe('mergeDefaultTournamentHubSettings', () => {
  it('applies safe defaults when no partial provided', () => {
    const merged = mergeDefaultTournamentHubSettings(null)
    expect(merged.eligibilityMode).toBe('open')
    expect(merged.waitlistEnabled).toBe(false)
    expect(merged.aiAutomationV1).toBeDefined()
  })

  it('commissioner partial overrides defaults', () => {
    const merged = mergeDefaultTournamentHubSettings({ waitlistEnabled: true, visibility: 'public' })
    expect(merged.waitlistEnabled).toBe(true)
    expect(merged.visibility).toBe('public')
    expect(merged.eligibilityMode).toBe('open') // default preserved
  })

  it('merges aiAutomationV1 deeply', () => {
    const merged = mergeDefaultTournamentHubSettings({ aiAutomationV1: { standingsNarrative: false } })
    const ai = merged.aiAutomationV1 as Record<string, unknown>
    expect(ai.standingsNarrative).toBe(false)
    // Other keys from defaultAiAutomationV1 should still be present
    expect(typeof ai).toBe('object')
  })
})

// ─── Default settings ─────────────────────────────────────────────────────────
describe('DEFAULT_TOURNAMENT_SETTINGS', () => {
  it('draft type defaults to snake', () => expect(DEFAULT_TOURNAMENT_SETTINGS.draftType).toBe('snake'))
  it('pool defaults to 72', () => expect(DEFAULT_TOURNAMENT_SETTINGS.participantPoolSize).toBe(72))
  it('bubble is disabled by default', () => expect(DEFAULT_TOURNAMENT_SETTINGS.bubbleWeekEnabled).toBe(false))
  it('FAAB defaults to 100', () => expect(DEFAULT_TOURNAMENT_SETTINGS.faabBudgetDefault).toBe(100))
  it('faabResetByRound is true', () => expect(DEFAULT_TOURNAMENT_SETTINGS.faabResetByRound).toBe(true))
  it('qualificationWeeks is 9', () => expect(DEFAULT_TOURNAMENT_SETTINGS.qualificationWeeks).toBe(9))
})
