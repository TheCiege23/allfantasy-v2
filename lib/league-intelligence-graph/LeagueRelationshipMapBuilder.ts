/**
 * League Intelligence Graph — builds a relationship map (nodes + edges) for UI/API consumption.
 */

import { prisma } from "@/lib/prisma";
import type { GraphQueryInput } from "./GraphQueryService";
import {
  getStrongestRivals,
  getTopTradePartners,
  getManagerConnectionScores,
  getDramaCentralTeams,
  getEraDominance,
  getPowerShiftOverTime,
} from "./GraphQueryService";

export interface RelationshipMapInput extends GraphQueryInput {
  includeRivals?: boolean;
  includeTradePartners?: boolean;
  includeManagerScores?: boolean;
  includeDramaTeams?: boolean;
  includeEraDominance?: boolean;
  includePowerShift?: boolean;
}

export interface RelationshipMapOutput {
  leagueId: string;
  season: number | null;
  nodes: Array<{
    nodeId: string;
    nodeType: string;
    entityId: string;
    metadata: Record<string, unknown> | null;
  }>;
  edges: Array<{
    edgeId: string;
    fromNodeId: string;
    toNodeId: string;
    edgeType: string;
    weight: number;
    metadata: Record<string, unknown> | null;
  }>;
  rivals: Array<{ nodeA: string; nodeB: string; weight: number; metadata?: Record<string, unknown> }>;
  tradePartners: Array<{
    fromNodeId: string;
    toNodeId: string;
    tradeCount: number;
    totalWeight?: number;
  }>;
  managerScores: Array<{
    nodeId: string;
    entityId: string;
    degree: number;
    weightedDegree: number;
    isIsolated: boolean;
  }>;
  dramaTeams: Array<{
    nodeId: string;
    entityId: string;
    dramaScore: number;
    metadata?: Record<string, unknown>;
  }>;
  eraDominance: Array<{
    nodeId: string;
    entityId: string;
    seasons: number[];
    titleCount: number;
  }>;
  powerShift: Array<{ season: number; topNodeIds: string[]; metric: string; metadata?: Record<string, unknown> }>;
}

/**
 * Builds a full relationship map for the league (and optional season) for visualizations and API.
 */
export async function buildRelationshipMap(
  input: RelationshipMapInput
): Promise<RelationshipMapOutput> {
  const {
    leagueId,
    season = null,
    includeRivals = true,
    includeTradePartners = true,
    includeManagerScores = true,
    includeDramaTeams = true,
    includeEraDominance = true,
    includePowerShift = true,
    limit = 50,
  } = input;

  const queryInput: GraphQueryInput = { leagueId, season, limit };

  const nodes = await prisma.graphNode.findMany({
    where: { leagueId, ...(season != null ? { season } : {}) },
    select: { nodeId: true, nodeType: true, entityId: true, metadata: true },
  });
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const nodeIdList = [...nodeIds];

  const [edgesInScope, rivals, tradePartners, managerScores, dramaTeams, eraDominance, powerShift] =
    await Promise.all([
      prisma.graphEdge.findMany({
        where: {
          fromNodeId: { in: nodeIdList },
          toNodeId: { in: nodeIdList },
          ...(season != null ? { season } : {}),
        },
        select: { edgeId: true, fromNodeId: true, toNodeId: true, edgeType: true, weight: true, metadata: true },
      }),
      includeRivals ? getStrongestRivals(queryInput) : Promise.resolve([]),
      includeTradePartners ? getTopTradePartners(queryInput) : Promise.resolve([]),
      includeManagerScores ? getManagerConnectionScores(queryInput) : Promise.resolve([]),
      includeDramaTeams ? getDramaCentralTeams(queryInput) : Promise.resolve([]),
      includeEraDominance ? getEraDominance(queryInput) : Promise.resolve([]),
      includePowerShift ? getPowerShiftOverTime({ leagueId, limit }) : Promise.resolve([]),
    ]);

  return {
    leagueId,
    season,
    nodes: nodes.map((n) => ({
      nodeId: n.nodeId,
      nodeType: n.nodeType,
      entityId: n.entityId,
      metadata: (n.metadata as Record<string, unknown>) ?? null,
    })),
    edges: edgesInScope.map((e) => ({
      edgeId: e.edgeId,
      fromNodeId: e.fromNodeId,
      toNodeId: e.toNodeId,
      edgeType: e.edgeType,
      weight: e.weight,
      metadata: (e.metadata as Record<string, unknown>) ?? null,
    })),
    rivals,
    tradePartners,
    managerScores,
    dramaTeams,
    eraDominance,
    powerShift,
  };
}
