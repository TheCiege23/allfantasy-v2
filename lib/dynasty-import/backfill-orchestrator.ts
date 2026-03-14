/**
 * Dynasty historical import — orchestrate backfill: discover seasons, persist incrementally, track status.
 */

import { prisma } from "@/lib/prisma";
import {
  discoverSleeperSeasons,
  fetchSleeperStandings,
  fetchSleeperTradesForSeason,
  fetchSleeperRosterToOwner,
} from "./sleeper-historical";
import { persistStandings, persistDynastySeason, persistTradesForSeason } from "./normalize-historical";
import type { BackfillStatus, BackfillObservability } from "./types";

export interface DynastyBackfillInput {
  leagueId: string;
  /** If true, run even when league is not marked dynasty */
  force?: boolean;
  /** Max seasons to import (oldest first). Omit = all discovered */
  maxSeasons?: number;
  /** Skip seasons that already have SeasonResult rows */
  skipExistingSeasons?: boolean;
}

export interface DynastyBackfillResult {
  success: boolean;
  status: BackfillStatus;
  seasonsDiscovered: number;
  seasonsImported: number;
  seasonsSkipped: number;
  tradesPersisted: number;
  observability: BackfillObservability;
  failureMessage?: string;
}

/**
 * Run historical backfill for a dynasty league (Sleeper). Idempotent and resumable.
 */
export async function runDynastyBackfill(input: DynastyBackfillInput): Promise<DynastyBackfillResult> {
  const { leagueId, force = false, maxSeasons, skipExistingSeasons = true } = input;
  const observability: BackfillObservability = {
    provider: "sleeper",
    seasonsDiscovered: [],
    seasonsImported: [],
    seasonsSkipped: [],
    partialSeasons: [],
    missingFields: [],
    failuresPerSeason: {},
  };

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, platform: true, platformLeagueId: true, userId: true, isDynasty: true },
  });
  if (!league) {
    return {
      success: false,
      status: "failed",
      seasonsDiscovered: 0,
      seasonsImported: 0,
      seasonsSkipped: 0,
      tradesPersisted: 0,
      observability,
      failureMessage: "League not found",
    };
  }
  if (league.platform !== "sleeper") {
    return {
      success: false,
      status: "failed",
      seasonsDiscovered: 0,
      seasonsImported: 0,
      seasonsSkipped: 0,
      tradesPersisted: 0,
      observability,
      failureMessage: "Historical backfill only supported for Sleeper",
    };
  }
  if (!league.isDynasty && !force) {
    return {
      success: false,
      status: "failed",
      seasonsDiscovered: 0,
      seasonsImported: 0,
      seasonsSkipped: 0,
      tradesPersisted: 0,
      observability,
      failureMessage: "League is not marked dynasty; use force=true to run anyway",
    };
  }

  const platformLeagueId = league.platformLeagueId ?? "";
  if (!platformLeagueId) {
    return {
      success: false,
      status: "failed",
      seasonsDiscovered: 0,
      seasonsImported: 0,
      seasonsSkipped: 0,
      tradesPersisted: 0,
      observability,
      failureMessage: "League has no platformLeagueId",
    };
  }

  await prisma.dynastyBackfillStatus.upsert({
    where: {
      uniq_dynasty_backfill_status_league_provider: { leagueId, provider: "sleeper" },
    },
    update: {
      status: "running",
      lastStartedAt: new Date(),
      failureMessage: null,
      updatedAt: new Date(),
    },
    create: {
      leagueId,
      provider: "sleeper",
      status: "running",
      lastStartedAt: new Date(),
    },
  });

  let discovered: Array<{ platformLeagueId: string; season: number; provider: string }> = [];
  try {
    discovered = await discoverSleeperSeasons(platformLeagueId, league.userId);
  } catch (e: any) {
    await prisma.dynastyBackfillStatus.update({
      where: { uniq_dynasty_backfill_status_league_provider: { leagueId, provider: "sleeper" } },
      data: { status: "failed", failureMessage: e?.message ?? "Discover failed", updatedAt: new Date() },
    });
    return {
      success: false,
      status: "failed",
      seasonsDiscovered: 0,
      seasonsImported: 0,
      seasonsSkipped: 0,
      tradesPersisted: 0,
      observability,
      failureMessage: e?.message ?? "Discover failed",
    };
  }

  observability.seasonsDiscovered = discovered.map((d) => d.season).sort((a, b) => a - b);
  const toProcess = maxSeasons != null ? discovered.slice(0, maxSeasons) : discovered;
  const sorted = [...toProcess].sort((a, b) => a.season - b.season);
  let seasonsImported = 0;
  let seasonsSkipped = 0;
  let tradesPersisted = 0;

  for (const ref of sorted) {
    try {
      if (skipExistingSeasons) {
        const existing = await prisma.seasonResult.findFirst({
          where: { leagueId, season: String(ref.season) },
        });
        if (existing) {
          observability.seasonsSkipped.push(ref.season);
          seasonsSkipped++;
          await persistDynastySeason(leagueId, ref.season, ref.platformLeagueId, ref.provider);
          continue;
        }
      }

      const [standingsRes, rosterToOwner] = await Promise.all([
        fetchSleeperStandings(ref.platformLeagueId),
        fetchSleeperRosterToOwner(ref.platformLeagueId),
      ]);
      await persistStandings(leagueId, ref.season, standingsRes.rows);
      await persistDynastySeason(leagueId, ref.season, ref.platformLeagueId, ref.provider);

      const trades = await fetchSleeperTradesForSeason(ref.platformLeagueId, ref.season);
      const count = await persistTradesForSeason(ref.platformLeagueId, ref.season, trades, rosterToOwner);
      tradesPersisted += count;
      observability.seasonsImported.push(ref.season);
      seasonsImported++;
    } catch (e: any) {
      observability.failuresPerSeason[String(ref.season)] = e?.message ?? "Unknown error";
      observability.partialSeasons.push({ season: ref.season, reason: e?.message ?? "Unknown error" });
    }
  }

  const hasFailures = Object.keys(observability.failuresPerSeason).length > 0;
  const status: BackfillStatus = hasFailures ? "partial" : "completed";
  await prisma.dynastyBackfillStatus.update({
    where: { uniq_dynasty_backfill_status_league_provider: { leagueId, provider: "sleeper" } },
    data: {
      status,
      seasonsDiscovered: observability.seasonsDiscovered as any,
      seasonsImported: observability.seasonsImported as any,
      seasonsSkipped: observability.seasonsSkipped as any,
      partialSeasons: observability.partialSeasons as any,
      lastCompletedAt: new Date(),
      failureMessage: hasFailures ? Object.entries(observability.failuresPerSeason).map(([s, m]) => `${s}: ${m}`).join("; ") : null,
      metadata: { tradesPersisted } as any,
      updatedAt: new Date(),
    },
  });

  return {
    success: !hasFailures,
    status,
    seasonsDiscovered: observability.seasonsDiscovered.length,
    seasonsImported,
    seasonsSkipped,
    tradesPersisted,
    observability,
    failureMessage: hasFailures ? "Some seasons failed" : undefined,
  };
}

/**
 * Get current backfill status for a league.
 */
export async function getDynastyBackfillStatus(leagueId: string, provider: string = "sleeper") {
  return prisma.dynastyBackfillStatus.findUnique({
    where: {
      uniq_dynasty_backfill_status_league_provider: { leagueId, provider },
    },
  });
}
