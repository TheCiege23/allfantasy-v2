/**
 * Ranking history for movement indicators (Prompt 119).
 * Wraps existing snapshots API.
 */

import { getRankHistory, getPreviousWeekSnapshots } from '@/lib/rankings-engine/snapshots';
import type { RankHistoryEntry } from './types';

export async function getWeeklyRankHistory(
  leagueId: string,
  rosterId: string,
  limit: number = 12
): Promise<RankHistoryEntry[]> {
  const rows = await getRankHistory({ leagueId, rosterId, limit });
  return rows.map((r) => ({
    season: r.season,
    week: r.week,
    rank: r.rank,
    composite: Number(r.composite),
  }));
}

export async function getPreviousWeekRanks(
  leagueId: string,
  season: string,
  currentWeek: number
): Promise<Map<string, { rank: number; composite: number }>> {
  const map = await getPreviousWeekSnapshots({
    leagueId,
    season,
    currentWeek,
  });
  const result = new Map<string, { rank: number; composite: number }>();
  for (const [rosterId, v] of map) {
    result.set(rosterId, { rank: v.rank, composite: v.composite });
  }
  return result;
}
