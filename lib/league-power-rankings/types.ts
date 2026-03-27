/**
 * League Power Rankings — types (Prompt 119).
 */

export interface PowerRankingTeam {
  rosterId: number;
  ownerId: string;
  displayName: string | null;
  username: string | null;
  rank: number;
  prevRank: number | null;
  rankDelta: number | null;
  record: { wins: number; losses: number; ties: number };
  pointsFor: number;
  pointsAgainst: number;
  strengthOfSchedule: number;
  recentPerformanceScore: number;
  rosterStrengthScore: number;
  projectionStrengthScore: number;
  rosterValue: number;
  expectedWins: number;
  composite: number;
  powerScore: number;
  powerScoreBreakdown: {
    record: number;
    recentPerformance: number;
    rosterStrength: number;
    projectionStrength: number;
    weightedScore: number;
  };
}

export interface PowerRankingsOutput {
  leagueId: string;
  leagueName: string;
  season: string;
  week: number;
  teams: PowerRankingTeam[];
  computedAt: number;
  formula: {
    recordWeight: number;
    recentPerformanceWeight: number;
    rosterStrengthWeight: number;
    projectionStrengthWeight: number;
  };
}

export interface RankHistoryEntry {
  season: string;
  week: number;
  rank: number;
  composite: number;
}
