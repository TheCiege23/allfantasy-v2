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
  composite: number;
  powerScore: number;
}

export interface PowerRankingsOutput {
  leagueId: string;
  leagueName: string;
  season: string;
  week: number;
  teams: PowerRankingTeam[];
  computedAt: number;
}

export interface RankHistoryEntry {
  season: string;
  week: number;
  rank: number;
  composite: number;
}
