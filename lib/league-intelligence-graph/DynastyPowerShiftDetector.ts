/**
 * League Intelligence Graph — dynasty power transitions, succession, decline over time.
 */

import { prisma } from "@/lib/prisma";
import type { DynastyPowerTransition } from "./types";

export interface PowerShiftInput {
  leagueId: string;
  /** If null, use all seasons (dynasty history). */
  season?: number | null;
  /** Seasons to consider (default: from LeagueGraphSnapshot or SeasonResult). */
  seasons?: number[];
  limit?: number;
}

/**
 * Detects power transitions between consecutive seasons: who held titles, succession, decline.
 * Uses WON_TITLE edges; when imported dynasty history exists, includes all seasons.
 */
export async function detectDynastyPowerShifts(
  input: PowerShiftInput
): Promise<DynastyPowerTransition[]> {
  const { leagueId, season = null, limit = 20 } = input;

  let seasons = input.seasons;
  if (seasons == null) {
    if (season != null) {
      seasons = [season];
    } else {
      const fromSnapshots = await prisma.leagueGraphSnapshot.findMany({
        where: { leagueId },
        select: { season: true },
        orderBy: { season: "asc" },
      });
      const fromResults = await prisma.seasonResult.findMany({
        where: { leagueId },
        select: { season: true },
        distinct: ["season"],
      });
      const set = new Set<number>();
      for (const s of fromSnapshots) set.add(s.season);
      for (const r of fromResults) {
        const n = parseInt(String(r.season), 10);
        if (!Number.isNaN(n)) set.add(n);
      }
      seasons = [...set].filter((s) => s > 0).sort((a, b) => a - b);
    }
  }

  if (seasons.length < 2) return [];

  const allLeagueNodes = await prisma.graphNode.findMany({
    where: { leagueId, season: { in: seasons } },
    select: { nodeId: true, season: true },
  });
  const nodeIdsBySeason = new Map<number, string[]>();
  for (const n of allLeagueNodes) {
    const s = n.season ?? 0;
    if (!nodeIdsBySeason.has(s)) nodeIdsBySeason.set(s, []);
    nodeIdsBySeason.get(s)!.push(n.nodeId);
  }

  const transitions: DynastyPowerTransition[] = [];
  for (let i = 0; i < seasons.length - 1; i++) {
    const fromSeason = seasons[i]!;
    const toSeason = seasons[i + 1]!;
    const fromIds = nodeIdsBySeason.get(fromSeason) ?? [];
    const toIds = nodeIdsBySeason.get(toSeason) ?? [];
    const fromChampions = await prisma.graphEdge.findMany({
      where: {
        edgeType: "WON_TITLE",
        season: fromSeason,
        fromNodeId: { in: fromIds },
      },
      select: { fromNodeId: true },
    });
    const toChampions = await prisma.graphEdge.findMany({
      where: {
        edgeType: "WON_TITLE",
        season: toSeason,
        fromNodeId: { in: toIds },
      },
      select: { fromNodeId: true },
    });
    const fromNodeIds = [...new Set(fromChampions.map((e) => e.fromNodeId))];
    const toNodeIds = [...new Set(toChampions.map((e) => e.fromNodeId))];
    const fromSet = new Set(fromNodeIds);
    const toSet = new Set(toNodeIds);
    const same = fromNodeIds.filter((id) => toSet.has(id));
    const declined = fromNodeIds.filter((id) => !toSet.has(id));
    const ascended = toNodeIds.filter((id) => !fromSet.has(id));

    let type: DynastyPowerTransition["type"] = "shift";
    if (ascended.length > 0 && declined.length > 0 && same.length === 0) type = "succession";
    else if (declined.length > 0 && ascended.length === 0) type = "decline";

    transitions.push({
      fromSeason,
      toSeason,
      fromNodeIds,
      toNodeIds,
      type,
      metadata: { same, declined, ascended },
    });
  }

  return transitions.slice(0, limit);
}
