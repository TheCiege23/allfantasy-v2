/**
 * Ranks teams within a league for weekly power rankings (Prompt 119).
 * Uses league-rankings-v2 for composite score, rank, and movement (prevRank, rankDelta).
 */

import { computeLeagueRankingsV2 } from '@/lib/rankings-engine/league-rankings-v2';
import type { PowerRankingsOutput, PowerRankingTeam } from './types';

export async function computePowerRankings(
  leagueId: string,
  week?: number
): Promise<PowerRankingsOutput | null> {
  const v2 = await computeLeagueRankingsV2(leagueId, week);
  if (!v2 || v2.teams.length === 0) return null;

  const teams: PowerRankingTeam[] = v2.teams.map((t) => ({
    rosterId: t.rosterId,
    ownerId: t.ownerId,
    displayName: t.displayName ?? null,
    username: t.username ?? null,
    rank: t.rank,
    prevRank: t.prevRank ?? null,
    rankDelta: t.rankDelta ?? null,
    record: t.record,
    pointsFor: t.pointsFor,
    pointsAgainst: t.pointsAgainst,
    composite: t.composite,
    powerScore: t.powerScore,
  }));

  return {
    leagueId: v2.leagueId,
    leagueName: v2.leagueName,
    season: v2.season,
    week: v2.week,
    teams,
    computedAt: v2.computedAt,
  };
}
