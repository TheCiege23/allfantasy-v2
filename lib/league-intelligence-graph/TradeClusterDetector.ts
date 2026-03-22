/**
 * League Intelligence Graph — detect trade clusters and relationship weight (alliance-like patterns).
 */

import { prisma } from "@/lib/prisma";
import type { TradeCluster, TradeClusterMember } from "./types";
import { normalizeSportForGraph } from "./SportGraphResolver";

export interface TradeClusterInput {
  leagueId: string;
  season?: number | null;
  sport?: string | null;
  /** Min weight between two nodes to consider them in same cluster. */
  minPairWeight?: number;
  /** Max clusters to return. */
  limit?: number;
}

/**
 * Aggregates TRADED_WITH by pair, then groups nodes that trade heavily with each other (clusters).
 * Returns tradeClusters and dominant pair per cluster.
 */
export async function detectTradeClusters(
  input: TradeClusterInput
): Promise<TradeCluster[]> {
  const { leagueId, season = null, sport = null, minPairWeight = 1, limit = 10 } = input;
  const normalizedSport = normalizeSportForGraph(sport);

  const nodes = await prisma.graphNode.findMany({
    where: {
      leagueId,
      nodeType: "TeamSeason",
      ...(season != null ? { season } : {}),
      ...(normalizedSport ? { sport: normalizedSport } : {}),
    },
    select: { nodeId: true, entityId: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const nodeById = new Map(nodes.map((n) => [n.nodeId, n]));

  const edges = await prisma.graphEdge.findMany({
    where: {
      edgeType: "TRADED_WITH",
      fromNodeId: { in: [...nodeIds] },
      toNodeId: { in: [...nodeIds] },
      ...(season != null ? { season } : {}),
      ...(normalizedSport ? { sport: normalizedSport } : {}),
    },
  });

  const pairWeight = new Map<string, number>();
  const nodeWeight = new Map<string, number>();
  for (const e of edges) {
    const key = [e.fromNodeId, e.toNodeId].sort().join("|");
    pairWeight.set(key, (pairWeight.get(key) ?? 0) + e.weight);
    nodeWeight.set(e.fromNodeId, (nodeWeight.get(e.fromNodeId) ?? 0) + e.weight);
    nodeWeight.set(e.toNodeId, (nodeWeight.get(e.toNodeId) ?? 0) + e.weight);
  }

  const strongPairs = [...pairWeight.entries()]
    .filter(([, w]) => w >= minPairWeight)
    .map(([key, w]) => {
      const [a, b] = key.split("|");
      return { nodeA: a!, nodeB: b!, weight: w };
    })
    .sort((a, b) => b.weight - a.weight);

  if (strongPairs.length === 0) {
    return [];
  }

  const uf = new Map<string, string>();
  function find(x: string): string {
    if (!uf.has(x)) uf.set(x, x);
    if (uf.get(x) !== x) uf.set(x, find(uf.get(x)!));
    return uf.get(x)!;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) uf.set(ra, rb);
  }

  for (const p of strongPairs) {
    union(p.nodeA, p.nodeB);
  }

  const clusters = new Map<string, Set<string>>();
  for (const nid of nodeIds) {
    const root = find(nid);
    if (!clusters.has(root)) clusters.set(root, new Set());
    clusters.get(root)!.add(nid);
  }

  const result: TradeCluster[] = [];
  for (const [, memberIds] of clusters) {
    if (memberIds.size < 2) continue;
    const members: TradeClusterMember[] = [...memberIds].map((nid) => {
      const n = nodeById.get(nid);
      return {
        nodeId: nid,
        entityId: n?.entityId ?? nid,
        totalTradeWeight: nodeWeight.get(nid) ?? 0,
        partnerCount: [...memberIds].filter((m) => m !== nid).length,
      };
    });
    const internalWeight = [...memberIds].reduce((sum, a) => {
      return sum + [...memberIds].reduce((s, b) => {
        if (a >= b) return s;
        const w = pairWeight.get([a, b].sort().join("|")) ?? 0;
        return s + w;
      }, 0);
    }, 0);
    let dominantPair: { nodeA: string; nodeB: string; weight: number } | undefined;
    for (const p of strongPairs) {
      if (memberIds.has(p.nodeA) && memberIds.has(p.nodeB)) {
        dominantPair = p;
        break;
      }
    }
    result.push({
      id: `cluster-${result.length}`,
      members,
      internalWeight,
      dominantPair,
      metadata: { size: memberIds.size },
    });
  }

  result.sort((a, b) => b.internalWeight - a.internalWeight);
  return result.slice(0, limit);
}
