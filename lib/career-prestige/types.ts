/**
 * Career Prestige Integration Layer — unified types across GM Economy, XP, Reputation,
 * Hall of Fame, Legacy Score, Awards, Record Books.
 */

/** Snapshot from GM Economy (franchise profile). */
export interface CareerGMEconomySnapshot {
  franchiseValue: number
  gmPrestigeScore: number
  tierLabel: string | null
  championshipCount: number
  careerWinPercentage: number
  totalCareerSeasons: number
  totalLeaguesPlayed: number
}

/** Snapshot from Career XP. */
export interface CareerXPSnapshot {
  totalXP: number
  currentTier: string
  progressInTier: number
  xpToNextTier: number
}

/** Snapshot from Reputation (per league). */
export interface CareerReputationSnapshot {
  overallScore: number
  tier: string
  commissionerTrustScore: number
}

/** Snapshot from Legacy Score (per league). */
export interface CareerLegacySnapshot {
  overallLegacyScore: number
  championshipScore: number
  playoffScore: number
}

/** Unified career profile for a manager (cross-system). */
export interface UnifiedCareerProfile {
  managerId: string
  /** Optional: when provided, reputation and legacy are for this league. */
  leagueId: string | null
  sport: string | null
  gmEconomy: CareerGMEconomySnapshot | null
  xp: CareerXPSnapshot | null
  reputation: CareerReputationSnapshot | null
  legacy: CareerLegacySnapshot | null
  hallOfFameEntryCount: number
  topHallOfFameTitle: string | null
  awardsWonCount: number
  recordsHeldCount: number
  /** Ordered timeline hints: e.g. "2023 Champion", "2022 Best Draft". */
  timelineHints: string[]
}

/** League-level prestige summary (for league dashboards). */
export interface LeaguePrestigeSummary {
  leagueId: string
  sport: string
  managerCount: number
  gmEconomyCoverage: number
  xpCoverage: number
  reputationCoverage: number
  legacyCoverage: number
  hallOfFameEntryCount: number
  awardsCount: number
  recordBookCount: number
  topLegacyScore: number | null
  topXP: number | null
}

/** Row for unified career leaderboard (manager + combined prestige). */
export interface CareerLeaderboardRow {
  managerId: string
  rank: number
  franchiseValue: number
  totalXP: number
  legacyScore: number | null
  reputationTier: string | null
  championshipCount: number
  awardsCount: number
  recordsCount: number
  /** Combined prestige score (0–100 scale) for sorting. */
  prestigeScore: number
}

/** AI context for career explanation. */
export interface AICareerContextPayload {
  managerId: string
  leagueId: string | null
  sport: string
  narrativeHint: string
  gmTier: string | null
  xpTier: string | null
  reputationTier: string | null
  legacyScore: number | null
  hofCount: number
  awardsCount: number
  recordsCount: number
}
