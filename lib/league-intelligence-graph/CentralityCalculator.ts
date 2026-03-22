/**
 * League Intelligence Graph — manager centrality and connectedness (central vs isolated).
 */

import { prisma } from "@/lib/prisma";
import { normalizeSportForGraph } from "./SportGraphResolver";

export interface CentralityInput {
  leagueId: string;
  season?: number | null;
  sport?: string | null;
  limit?: number;
}

export interface CentralityResult {
  centralManagers: Array<{
    nodeId: string;
    entityId: string;
    centralityScore: number;
    degree: number;
    weightedDegree: number;
  }>;
  isolatedManagers: Array<{ nodeId: string; entityId: string }>;
}

/**
 * Computes degree and weighted degree for Manager nodes; normalizes to 0–1 centrality score.
 * Central = high degree/weight; isolated = degree 0.
 */
export async function calculateCentrality(
  input: CentralityInput
): Promise<CentralityResult> {
  const { leagueId, season = null, sport = null, limit = 50 } = input;
  const normalizedSport = normalizeSportForGraph(sport);

  const managerNodes = await prisma.graphNode.findMany({
    where: {
      leagueId,
      nodeType: "Manager",
      ...(season != null ? { season } : {}),
      ...(normalizedSport ? { sport: normalizedSport } : {}),
    },
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
      ...(normalizedSport ? { sport: normalizedSport } : {}),
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

  const maxWeight = Math.max(1, ...[...weightedDegree.values()]);
  const central: CentralityResult["centralManagers"] = [];
  const isolated: CentralityResult["isolatedManagers"] = [];

  for (const n of managerNodes) {
    const d = degree.get(n.nodeId) ?? 0;
    const w = weightedDegree.get(n.nodeId) ?? 0;
    if (d === 0) {
      isolated.push({ nodeId: n.nodeId, entityId: n.entityId });
    } else {
      central.push({
        nodeId: n.nodeId,
        entityId: n.entityId,
        degree: d,
        weightedDegree: w,
        centralityScore: maxWeight > 0 ? w / maxWeight : 0,
      });
    }
  }

  central.sort((a, b) => b.weightedDegree - a.weightedDegree);
  return {
    centralManagers: central.slice(0, limit),
    isolatedManagers: isolated,
  };
}
