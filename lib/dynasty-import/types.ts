/**
 * Dynasty historical import — shared types for backfill and normalization.
 */

export type BackfillStatus = "pending" | "running" | "completed" | "partial" | "failed";

export interface HistoricalSeasonRef {
  platformLeagueId: string;
  season: number;
  provider: string;
}

export interface NormalizedStandingRow {
  rosterId: string;
  wins: number | null;
  losses: number | null;
  pointsFor: number | null;
  pointsAgainst: number | null;
  champion: boolean;
}

export interface NormalizedTradeFact {
  transactionId: string;
  season: number;
  week: number;
  rosterIds: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draftPicks: Array<{ season: string; round: number; rosterId: number; previousOwnerId: number; ownerId: number }>;
  created: number;
  creator: string;
}

export interface BackfillObservability {
  provider: string;
  seasonsDiscovered: number[];
  seasonsImported: number[];
  seasonsSkipped: number[];
  partialSeasons: Array<{ season: number; reason: string }>;
  missingFields: string[];
  failuresPerSeason: Record<string, string>;
}
