/**
 * League Intelligence Graph — read-only query API for rivals, trade partners, centrality, power shift.
 */

import { prisma } from "@/lib/prisma";
import type {
  RivalPair,
  TradePartnerPair,
  ManagerConnectionScore,
  PowerShiftBucket,
} from "./types";

export interface GraphQueryInput {
  leagueId: string;
  season?: number | null;
  limit?: number;
}

/**
 * Strongest rivals in the league (RIVAL_OF edges, by weight).
 */
export async function getStrongestRivals(
  input: GraphQueryInput
): Promise<RivalPair[]> {
  const { leagueId, season = null, limit = 20 } = input;
  const nodes = await prisma.graphNode.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    select: { nodeId: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: "RIVAL_OF",
      fromNodeId: { in: [...nodeIds] },
      toNodeId: { in: [...nodeIds] },
      ...(season != null ? { season } : {}),
    },
    orderBy: { weight: "desc" },
    take: limit,
  });
  return edges.map((e) => ({
    nodeA: e.fromNodeId,
    nodeB: e.toNodeId,
    weight: e.weight,
    metadata: (e.metadata as Record<string, unknown>) ?? undefined,
  }));
}

/**
 * Pairs that trade the most (TRADED_WITH edges, aggregated by pair).
 */
export async function getTopTradePartners(
  input: GraphQueryInput
): Promise<TradePartnerPair[]> {
  const { leagueId, season = null, limit = 20 } = input;
  const nodes = await prisma.graphNode.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    select: { nodeId: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: "TRADED_WITH",
      fromNodeId: { in: [...nodeIds] },
      toNodeId: { in: [...nodeIds] },
      ...(season != null ? { season } : {}),
    },
  });
  const byPair = new Map<string, { count: number; weight: number }>();
  for (const e of edges) {
    const key = [e.fromNodeId, e.toNodeId].sort().join("|");
    const cur = byPair.get(key) ?? { count: 0, weight: 0 };
    byPair.set(key, {
      count: cur.count + 1,
      weight: cur.weight + e.weight,
    });
  }
  const sorted = [...byPair.entries()]
    .map(([key, v]) => {
      const [from, to] = key.split("|");
      return { fromNodeId: from!, toNodeId: to!, tradeCount: v.count, totalWeight: v.weight };
    })
    .sort((a, b) => b.tradeCount - a.tradeCount)
    .slice(0, limit);
  return sorted.map((s) => ({
    fromNodeId: s.fromNodeId,
    toNodeId: s.toNodeId,
    tradeCount: s.tradeCount,
    totalWeight: s.totalWeight,
  }));
}

/**
 * Most connected vs most isolated managers (by degree and weighted degree on Manager nodes).
 */
export async function getManagerConnectionScores(
  input: GraphQueryInput
): Promise<ManagerConnectionScore[]> {
  const { leagueId, season = null, limit = 50 } = input;
  const managerNodes = await prisma.graphNode.findMany({
    where: { leagueId, nodeType: "Manager", ...(season != null ? { season } : {}) },
    select: { nodeId: true, entityId: true },
  });
  const nodeIds = new Set(managerNodes.map((n) => n.nodeId));
  const edges = await prisma.graphEdge.findMany({
    where: {
      OR: [
        { fromNodeId: { in: [...nodeIds] } },
        { toNodeId: { in: [...nodeIds] } },
      ],
      ...(season != null ? { season } : {}),
    },
  });
  const degree = new Map<string, number>();
  const weightedDegree = new Map<string, number>();
  for (const e of edges) {
    for (const nid of [e.fromNodeId, e.toNodeId]) {
      if (nodeIds.has(nid)) {
        degree.set(nid, (degree.get(nid) ?? 0) + 1);
        weightedDegree.set(nid, (weightedDegree.get(nid) ?? 0) + e.weight);
      }
    }
  }
  const scores: ManagerConnectionScore[] = managerNodes.map((n) => {
    const d = degree.get(n.nodeId) ?? 0;
    const w = weightedDegree.get(n.nodeId) ?? 0;
    return {
      nodeId: n.nodeId,
      entityId: n.entityId,
      degree: d,
      weightedDegree: w,
      isIsolated: d === 0,
    };
  });
  scores.sort((a, b) => b.weightedDegree - a.weightedDegree);
  return scores.slice(0, limit);
}

/**
 * Teams central to "drama" (high RIVAL_OF + TRADED_WITH + LOST_TO involvement). Uses TeamSeason nodes.
 */
export async function getDramaCentralTeams(
  input: GraphQueryInput
): Promise<Array<{ nodeId: string; entityId: string; dramaScore: number; metadata?: Record<string, unknown> }>> {
  const { leagueId, season = null, limit = 10 } = input;
  const teamNodes = await prisma.graphNode.findMany({
    where: { leagueId, nodeType: "TeamSeason", ...(season != null ? { season } : {}) },
    select: { nodeId: true, entityId: true, metadata: true },
  });
  const nodeIds = new Set(teamNodes.map((n) => n.nodeId));
  const dramaTypes = ["RIVAL_OF", "TRADED_WITH", "LOST_TO", "ELIMINATED"] as const;
  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: { in: [...dramaTypes] },
      OR: [
        { fromNodeId: { in: [...nodeIds] } },
        { toNodeId: { in: [...nodeIds] } },
      ],
      ...(season != null ? { season } : {}),
    },
  });
  const score = new Map<string, number>();
  for (const e of edges) {
    for (const nid of [e.fromNodeId, e.toNodeId]) {
      if (nodeIds.has(nid)) {
        score.set(nid, (score.get(nid) ?? 0) + e.weight);
      }
    }
  }
  const result = teamNodes
    .map((n) => ({
      nodeId: n.nodeId,
      entityId: n.entityId,
      dramaScore: score.get(n.nodeId) ?? 0,
      metadata: (n.metadata as Record<string, unknown>) ?? undefined,
    }))
    .sort((a, b) => b.dramaScore - a.dramaScore)
    .slice(0, limit);
  return result;
}

/**
 * Power shift over time: top nodes by WON_TITLE / centrality per season.
 */
export async function getPowerShiftOverTime(
  input: Omit<GraphQueryInput, "season"> & { seasons?: number[] }
): Promise<PowerShiftBucket[]> {
  const { leagueId, seasons, limit = 5 } = input;
  const snapshotSeasons = seasons ?? (
    await prisma.leagueGraphSnapshot.findMany({
      where: { leagueId },
      select: { season: true },
      orderBy: { season: "asc" },
    })
  ).map((s) => s.season).filter((s) => s > 0);

  const buckets: PowerShiftBucket[] = [];
  for (const season of snapshotSeasons) {
    const leagueNodeIds = await prisma.graphNode.findMany({
      where: { leagueId, season },
      select: { nodeId: true },
    });
    const inLeague = new Set(leagueNodeIds.map((n) => n.nodeId));
    const championEdges = await prisma.graphEdge.findMany({
      where: {
        edgeType: "WON_TITLE",
        season,
        fromNodeId: { in: [...inLeague] },
      },
    });
    const topNodeIds = championEdges.map((e) => e.fromNodeId).slice(0, limit);
    buckets.push({
      season,
      topNodeIds,
      metric: "WON_TITLE",
      metadata: { count: topNodeIds.length },
    });
  }
  return buckets;
}

/**
 * Franchises/teams dominating the same era (seasons with multiple WON_TITLE or high window score).
 * Uses stored graph data; for dynasty-era nodes we'd extend when DynastyEra nodes exist.
 */
export async function getEraDominance(
  input: GraphQueryInput
): Promise<Array<{ nodeId: string; entityId: string; seasons: number[]; titleCount: number }>> {
  const { leagueId, season = null, limit = 10 } = input;
  const teamNodes = await prisma.graphNode.findMany({
    where: { leagueId, nodeType: "TeamSeason", ...(season != null ? { season } : {}) },
    select: { nodeId: true, entityId: true },
  });
  const nodeIds = new Set(teamNodes.map((n) => n.nodeId));
  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: "WON_TITLE",
      fromNodeId: { in: [...nodeIds] },
      season: { not: null },
    },
  });
  const byNode = new Map<string, { seasons: number[]; titleCount: number }>();
  for (const e of edges) {
    const s = e.season ?? 0;
    const cur = byNode.get(e.fromNodeId) ?? { seasons: [], titleCount: 0 };
    cur.seasons.push(s);
    cur.titleCount += 1;
    byNode.set(e.fromNodeId, cur);
  }
  const result = [...byNode.entries()]
    .map(([nodeId, v]) => {
      const n = teamNodes.find((x) => x.nodeId === nodeId);
      return {
        nodeId,
        entityId: n?.entityId ?? "",
        seasons: [...new Set(v.seasons)].sort((a, b) => a - b),
        titleCount: v.titleCount,
      };
    })
    .sort((a, b) => b.titleCount - a.titleCount)
    .slice(0, limit);
  return result;
}

/**
 * Repeated elimination: who keeps knocking out whom (LOST_TO / ELIMINATED edges aggregated).
 */
export async function getRepeatedEliminationPatterns(
  input: GraphQueryInput
): Promise<Array<{ eliminatorNodeId: string; eliminatedNodeId: string; count: number; seasons: number[] }>> {
  const { leagueId, season = null, limit = 20 } = input;
  const nodes = await prisma.graphNode.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    select: { nodeId: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: { in: ["LOST_TO", "ELIMINATED"] },
      fromNodeId: { in: [...nodeIds] },
      toNodeId: { in: [...nodeIds] },
      ...(season != null ? { season } : {}),
    },
  });
  const byPair = new Map<string, { count: number; seasons: number[] }>();
  for (const e of edges) {
    const key = `${e.fromNodeId}|${e.toNodeId}`;
    const cur = byPair.get(key) ?? { count: 0, seasons: [] };
    cur.count += 1;
    if (e.season != null && !cur.seasons.includes(e.season)) cur.seasons.push(e.season);
    byPair.set(key, cur);
  }
  return [...byPair.entries()]
    .map(([key, v]) => {
      const [eliminatorNodeId, eliminatedNodeId] = key.split("|");
      return { eliminatorNodeId: eliminatorNodeId!, eliminatedNodeId: eliminatedNodeId!, count: v.count, seasons: v.seasons.sort((a, b) => a - b) };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
