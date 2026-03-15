/**
 * GraphHistoryAggregator — aggregates warehouse and history data for graph building.
 * Provides matchup history, standings history, trade history, and championship data
 * in shapes consumed by GraphNodeBuilder and GraphEdgeBuilder.
 */

import { getMatchupHistory, getStandingsHistory, getLeagueHistorySummary } from '@/lib/data-warehouse/LeagueHistoryAggregator';
import { prisma } from '@/lib/prisma';

export interface MatchupHistoryForGraph {
  leagueId: string;
  season: number;
  weekOrPeriod: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winnerTeamId: string | null;
}

export interface StandingsEntryForGraph {
  leagueId: string;
  season: number;
  teamId: string;
  rank: number;
  wins?: number;
  losses?: number;
  pointsFor?: number;
}

/**
 * Get matchup history for a league/season for graph FACED/DEFEATED edges.
 * Uses warehouse MatchupFact when available; otherwise empty.
 */
export async function getMatchupHistoryForGraph(
  leagueId: string,
  season: number,
  weekOrPeriod?: number
): Promise<MatchupHistoryForGraph[]> {
  const rows = await getMatchupHistory(leagueId, season, weekOrPeriod);
  return rows.map((r) => ({
    leagueId: r.leagueId,
    season: r.season ?? season,
    weekOrPeriod: r.weekOrPeriod,
    teamA: r.teamA,
    teamB: r.teamB,
    scoreA: r.scoreA ?? 0,
    scoreB: r.scoreB ?? 0,
    winnerTeamId: r.winnerTeamId ?? null,
  }));
}

/**
 * Get standings history for a league/season (for context; graph uses nodes from league.teams).
 * Uses warehouse SeasonStandingFact (teamId, rank, wins, losses, pointsFor).
 */
export async function getStandingsHistoryForGraph(
  leagueId: string,
  season: number
): Promise<StandingsEntryForGraph[]> {
  const rows = await getStandingsHistory(leagueId, season);
  return rows.map((r: { teamId?: string; rank?: number | null; wins?: number; losses?: number; pointsFor?: number }) => ({
    leagueId,
    season,
    teamId: r.teamId ?? '',
    rank: r.rank ?? 0,
    wins: r.wins,
    losses: r.losses,
    pointsFor: r.pointsFor,
  }));
}

/**
 * Get league history summary for graph scope (matchup count, standings count, etc.).
 */
export async function getLeagueHistorySummaryForGraph(
  leagueId: string,
  options?: { season?: number }
) {
  return getLeagueHistorySummary(leagueId, options);
}

/**
 * Get trade count per pair for a league (from LeagueTradeHistory + LeagueTrade).
 * Used by graph to weight TRADED_WITH edges.
 */
export async function getTradeCountByPairForGraph(
  leagueId: string,
  season: number | null
): Promise<Map<string, number>> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { platform: true, platformLeagueId: true },
  });
  if (!league || league.platform !== 'sleeper') return new Map();
  const dynastySeasons = await prisma.leagueDynastySeason.findMany({
    where: { leagueId },
    select: { platformLeagueId: true },
  });
  const platformIds = dynastySeasons.length > 0
    ? dynastySeasons.map((d) => d.platformLeagueId)
    : league.platformLeagueId
      ? [league.platformLeagueId]
      : [];
  if (platformIds.length === 0) return new Map();
  const histories = await prisma.leagueTradeHistory.findMany({
    where: { sleeperLeagueId: { in: platformIds } },
    include: { trades: true },
  });
  const byPair = new Map<string, number>();
  for (const h of histories) {
    const trades = season != null ? h.trades.filter((t) => t.season === season) : h.trades;
    for (const t of trades) {
      const partner = t.partnerRosterId != null ? String(t.partnerRosterId) : null;
      if (!partner) continue;
      const key = [h.sleeperUsername, partner].sort().join('|');
      byPair.set(key, (byPair.get(key) ?? 0) + 1);
    }
  }
  return byPair;
}
