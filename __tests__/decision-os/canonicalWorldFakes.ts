/**
 * Canonical, provider-agnostic FAKE data for Phase 2 Canonical World Assembly tests.
 *
 * These fixtures are hand-built to exercise the substrate's fact contract — they are NOT pulled from
 * any provider SDK. Two universes are represented to prove origin-blindness:
 *   - an IMPORTED provider league (Sleeper-shaped `Roster.playerData` blob; FAAB only as remaining)
 *   - a NATIVE AllFantasy league (clean ids, stored FAAB remaining, simpler playerData)
 * The substrate must produce structurally identical fact shapes for both.
 */
import type { CanonicalWorldRawInput } from '@/lib/decision-os/world/facts'

/**
 * IMPORTED provider league. Mirrors what `SleeperLeagueCreationBootstrapService` actually writes:
 * `Roster.playerData` carries `{ players, starters, reserve, taxi, source_team_id, source_manager_id,
 * import:{...} }`; `faabRemaining` is null (the mapper cannot compute remaining at import time).
 */
export function makeImportedProviderWorld(
  overrides?: Partial<CanonicalWorldRawInput>,
): CanonicalWorldRawInput {
  const base: CanonicalWorldRawInput = {
    league: {
      id: 'lg-import-1',
      sport: 'NFL',
      season: 2025,
      scoring: 'ppr',
      scoringPresetId: 'preset-ppr',
      leagueType: 'redraft',
      isDynasty: false,
      rosterSize: 15,
      starters: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
      irSlots: 1,
      taxiSlots: 0,
      waiverType: 'faab',
      waiverBudget: 100,
      waiverMinBid: 0,
      waiverHours: 24,
      tradeReviewHours: 48,
      tradeDeadlineWeek: 12,
      draftPickTrading: false,
      settings: { scoring_settings: { rec: 1 } },
      lastSyncedAt: new Date('2025-10-01T00:00:00.000Z'),
      syncStatus: 'synced',
      platform: 'sleeper',
      platformLeagueId: 'sleeper-league-9999',
    },
    teams: [
      {
        id: 'team-A',
        externalId: 'roster-1',
        ownerName: 'theciege24',
        teamName: 'Da Squad',
        wins: 5,
        losses: 2,
        ties: 0,
        pointsFor: 812.4,
        pointsAgainst: 0, // not stored by import → must be derived from performances
        currentRank: 2,
        role: 'commissioner',
        isOrphan: false,
        isCommissioner: true,
        isCoCommissioner: false,
        platformUserId: 'sleeper-user-111',
        claimedByUserId: 'af-user-777',
      },
      {
        id: 'team-B',
        externalId: 'roster-2',
        ownerName: 'rivalManager',
        teamName: 'The Rivals',
        wins: 4,
        losses: 3,
        ties: 0,
        pointsFor: 760.1,
        pointsAgainst: 0,
        currentRank: 4,
        role: 'member',
        isOrphan: false,
        isCommissioner: false,
        isCoCommissioner: false,
        platformUserId: 'sleeper-user-222',
        claimedByUserId: null,
      },
    ],
    rosters: [
      {
        id: 'roster-row-A',
        platformUserId: 'af-user-777',
        playerData: {
          players: ['4046', '6794', '4035', '2133', '0'],
          starters: ['4046', '6794', '4035'],
          reserve: ['2133'],
          taxi: [],
          source_provider: 'sleeper',
          source_league_id: 'sleeper-league-9999',
          source_team_id: 'roster-1',
          source_manager_id: 'sleeper-user-111',
          import: {
            provider: 'sleeper',
            sourceLeagueId: 'sleeper-league-9999',
            sourceTeamId: 'roster-1',
            sourceManagerId: 'sleeper-user-111',
            displayName: 'Da Squad',
            ownerName: 'theciege24',
          },
        },
        faabRemaining: null, // imported: remaining not computable at import time
        waiverPriority: null,
        settings: null,
      },
      {
        id: 'roster-row-B',
        platformUserId: 'sleeper-user-222',
        playerData: {
          players: ['1234', '5678', '9012'],
          starters: ['1234', '5678'],
          reserve: [],
          taxi: [],
          source_provider: 'sleeper',
          source_league_id: 'sleeper-league-9999',
          source_team_id: 'roster-2',
          source_manager_id: 'sleeper-user-222',
        },
        faabRemaining: null,
        waiverPriority: null,
        settings: null,
      },
    ],
    performances: [
      // Week 1: A vs B — A scored 120, B scored 100
      { teamId: 'team-A', week: 1, season: 2025, points: 120, opponent: 'team-B', result: 'W' },
      { teamId: 'team-B', week: 1, season: 2025, points: 100, opponent: 'team-A', result: 'L' },
      // Week 2: A vs B — A scored 90, B scored 110
      { teamId: 'team-A', week: 2, season: 2025, points: 90, opponent: 'team-B', result: 'L' },
      { teamId: 'team-B', week: 2, season: 2025, points: 110, opponent: 'team-A', result: 'W' },
    ],
  }
  return { ...base, ...overrides }
}

/**
 * NATIVE AllFantasy league. Clean ids, stored FAAB remaining, persisted waiver_budget_used, simple
 * playerData. Proves the substrate produces the same fact shape without any provider metadata.
 */
export function makeNativeAfWorld(
  overrides?: Partial<CanonicalWorldRawInput>,
): CanonicalWorldRawInput {
  const base: CanonicalWorldRawInput = {
    league: {
      id: 'lg-native-1',
      sport: 'NFL',
      season: 2025,
      scoring: 'half_ppr',
      scoringPresetId: 'preset-half-ppr',
      leagueType: 'redraft',
      isDynasty: false,
      rosterSize: 14,
      starters: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
      irSlots: 0,
      taxiSlots: 0,
      waiverType: 'faab',
      waiverBudget: 100,
      waiverMinBid: 0,
      waiverHours: 24,
      tradeReviewHours: 24,
      tradeDeadlineWeek: 13,
      draftPickTrading: true,
      settings: null,
      lastSyncedAt: new Date('2025-10-01T00:00:00.000Z'),
      syncStatus: 'synced',
      platform: null, // native: no provider
      platformLeagueId: null,
    },
    teams: [
      {
        id: 'nteam-A',
        externalId: 'nteam-A',
        ownerName: 'Commish',
        teamName: 'Home Team',
        wins: 6,
        losses: 1,
        ties: 0,
        pointsFor: 901.2,
        pointsAgainst: 743.6, // native: stored directly
        currentRank: 1,
        role: 'commissioner',
        isOrphan: false,
        isCommissioner: true,
        isCoCommissioner: false,
        platformUserId: 'af-user-001',
        claimedByUserId: 'af-user-001',
      },
    ],
    rosters: [
      {
        id: 'nroster-A',
        platformUserId: 'af-user-001',
        playerData: {
          players: ['p1', 'p2', 'p3', 'p4'],
          starters: ['p1', 'p2'],
          reserve: [],
          taxi: [],
        },
        faabRemaining: 73, // native: stored remaining
        waiverPriority: 1,
        settings: { waiver_budget_used: 27 },
      },
    ],
    performances: [
      { teamId: 'nteam-A', week: 1, season: 2025, points: 130, opponent: null, result: 'W' },
      { teamId: 'nteam-A', week: 2, season: 2025, points: 125, opponent: null, result: 'W' },
      { teamId: 'nteam-A', week: 3, season: 2025, points: 118, opponent: null, result: 'W' },
    ],
  }
  return { ...base, ...overrides }
}
