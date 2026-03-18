/**
 * Dynasty historical import — normalize and persist: SeasonResult, LeagueDynastySeason, LeagueTrade.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { upsertSeasonResults } from "@/lib/rankings-engine/hall-of-fame";
import type { NormalizedStandingRow, NormalizedTradeFact } from "./types";

/**
 * Persist standings for one season under our internal leagueId.
 */
export async function persistStandings(
  leagueId: string,
  season: number,
  rows: NormalizedStandingRow[]
): Promise<void> {
  if (rows.length === 0) return;
  await upsertSeasonResults({
    leagueId,
    season: String(season),
    rows: rows.map((r) => ({
      rosterId: r.rosterId,
      wins: r.wins,
      losses: r.losses,
      pointsFor: r.pointsFor,
      pointsAgainst: r.pointsAgainst,
      champion: r.champion,
    })),
  });
}

/**
 * Upsert LeagueDynastySeason so graph and history know which platform league id to use per season.
 */
export async function persistDynastySeason(
  leagueId: string,
  season: number,
  platformLeagueId: string,
  provider: string,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  const metadataJson =
    metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue | null)

  await prisma.leagueDynastySeason.upsert({
    where: {
      uniq_league_dynasty_season_league_season: { leagueId, season },
    },
    update: {
      platformLeagueId,
      provider,
      importedAt: new Date(),
      ...(metadataJson === null
        ? { metadata: Prisma.JsonNull }
        : metadataJson !== undefined
          ? { metadata: metadataJson }
          : {}),
    },
    create: {
      leagueId,
      season,
      platformLeagueId,
      provider,
      ...(metadataJson === null
        ? { metadata: Prisma.JsonNull }
        : metadataJson !== undefined
          ? { metadata: metadataJson }
          : {}),
    },
  });
}

/**
 * Persist trades for one season: create LeagueTradeHistory per user involved, then LeagueTrade per (history, transaction).
 * rosterIdToOwner: roster_id (string) -> Sleeper user_id (string).
 */
export async function persistTradesForSeason(
  platformLeagueId: string,
  season: number,
  trades: NormalizedTradeFact[],
  rosterIdToOwner: Map<string, string>
): Promise<number> {
  if (trades.length === 0) return 0;
  const ownerIdsNeeded = new Set<string>();
  for (const t of trades) {
    for (const rid of t.rosterIds) {
      const owner = rosterIdToOwner.get(String(rid));
      if (owner) ownerIdsNeeded.add(owner);
    }
  }
  const historyByOwner = new Map<string, string>();
  for (const ownerId of ownerIdsNeeded) {
    const hist = await prisma.leagueTradeHistory.upsert({
      where: {
        sleeperLeagueId_sleeperUsername: {
          sleeperLeagueId: platformLeagueId,
          sleeperUsername: ownerId,
        },
      },
      update: { updatedAt: new Date() },
      create: {
        sleeperLeagueId: platformLeagueId,
        sleeperUsername: ownerId,
        status: "complete",
        tradesLoaded: 0,
        totalTradesFound: 0,
      },
      select: { id: true },
    });
    historyByOwner.set(ownerId, hist.id);
  }

  let inserted = 0;
  for (const t of trades) {
    const rosterIds = [...new Set(t.rosterIds)].filter(Boolean);
    const adds = t.adds ?? {};
    const drops = t.drops ?? {};
    const picks = t.draftPicks ?? [];
    for (const rosterId of rosterIds) {
      const ownerId = rosterIdToOwner.get(String(rosterId));
      if (!ownerId) continue;
      const historyId = historyByOwner.get(ownerId);
      if (!historyId) continue;
      const ridNum = Number(rosterId);
      const partnerRosterId = rosterIds.find((r) => Number(r) !== ridNum);
      const playersReceived = Object.entries(adds).filter(([, r]) => Number(r) === ridNum).map(([pid]) => pid);
      const playersGiven = Object.entries(drops).filter(([, r]) => Number(r) === ridNum).map(([pid]) => pid);
      const picksReceived = picks.filter((p) => p.ownerId === ridNum).map((p) => ({ season: p.season, round: p.round }));
      const picksGiven = picks.filter((p) => p.previousOwnerId === ridNum).map((p) => ({ season: p.season, round: p.round }));
      await prisma.leagueTrade.upsert({
        where: {
          historyId_transactionId: { historyId, transactionId: t.transactionId },
        },
        update: {
          week: t.week,
          season,
          playersGiven: playersGiven as any,
          playersReceived: playersReceived as any,
          picksGiven: picksGiven as any,
          picksReceived: picksReceived as any,
          partnerRosterId: partnerRosterId != null ? Number(partnerRosterId) : null,
          tradeDate: t.created ? new Date(t.created) : null,
        },
        create: {
          historyId,
          transactionId: t.transactionId,
          week: t.week,
          season,
          playersGiven: playersGiven as any,
          playersReceived: playersReceived as any,
          picksGiven: picksGiven as any,
          picksReceived: picksReceived as any,
          partnerRosterId: partnerRosterId != null ? Number(partnerRosterId) : null,
          partnerName: null,
          tradeDate: t.created ? new Date(t.created) : null,
          platform: "sleeper",
          sport: "nfl",
        },
      });
      inserted++;
    }
  }
  return inserted;
}
