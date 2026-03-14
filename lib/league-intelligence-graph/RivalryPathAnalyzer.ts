/**
 * League Intelligence Graph — rivalry intensity from graph paths and edge weights.
 */

import { prisma } from "@/lib/prisma";
import type { RivalryScore } from "./types";

export interface RivalryPathInput {
  leagueId: string;
  season?: number | null;
  limit?: number;
  /** If true, boost intensity by multi-hop rivalry paths (e.g. A–B–C implies A–C tension). */
  usePathDepth?: boolean;
}

/**
 * Computes rivalry intensity from RIVAL_OF edges. Weight is the primary signal;
 * optional path-depth adjustment can amplify when rivals share common rivals.
 */
export async function analyzeRivalryPaths(
  input: RivalryPathInput
): Promise<RivalryScore[]> {
  const { leagueId, season = null, limit = 20, usePathDepth = false } = input;

  const nodes = await prisma.graphNode.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    select: { nodeId: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const rivalEdges = await prisma.graphEdge.findMany({
    where: {
      edgeType: "RIVAL_OF",
      fromNodeId: { in: [...nodeIds] },
      toNodeId: { in: [...nodeIds] },
      ...(season != null ? { season } : {}),
    },
  });

  const pairScores = new Map<string, { weight: number; nodeA: string; nodeB: string; metadata?: Record<string, unknown> }>();
  for (const e of rivalEdges) {
    const [nodeA, nodeB] = [e.fromNodeId, e.toNodeId].sort();
    const key = `${nodeA}|${nodeB}`;
    const existing = pairScores.get(key);
    const w = (existing?.weight ?? 0) + e.weight;
    pairScores.set(key, {
      nodeA,
      nodeB,
      weight: w,
      metadata: (e.metadata as Record<string, unknown>) ?? undefined,
    });
  }

  let results: RivalryScore[] = [...pairScores.values()].map((p) => ({
    nodeA: p.nodeA,
    nodeB: p.nodeB,
    intensityScore: p.weight,
    weight: p.weight,
    metadata: p.metadata,
  }));

  if (usePathDepth && rivalEdges.length > 0) {
    const adj = new Map<string, Set<string>>();
    for (const e of rivalEdges) {
      if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, new Set());
      adj.get(e.fromNodeId)!.add(e.toNodeId);
      if (!adj.has(e.toNodeId)) adj.set(e.toNodeId, new Set());
      adj.get(e.toNodeId)!.add(e.fromNodeId);
    }
    for (const r of results) {
      const shared = [...(adj.get(r.nodeA) ?? [])].filter((x) => adj.get(r.nodeB)?.has(x));
      if (shared.length > 0) {
        r.intensityScore = r.weight * (1 + 0.2 * Math.min(shared.length, 3));
        r.pathDepth = 2;
        r.metadata = { ...r.metadata, sharedRivalCount: shared.length };
      }
    }
  }

  results.sort((a, b) => b.intensityScore - a.intensityScore);
  return results.slice(0, limit);
}
