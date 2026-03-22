/**
 * League Intelligence Graph — shared types for nodes, edges, and queries.
 * Preserves alignment with Prisma GraphNode / GraphEdge / LeagueGraphSnapshot.
 */

export const NODE_TYPES = [
  "Manager",
  "Franchise",
  "League",
  "TeamSeason",
  "Player",
  "DraftPick",
  "Trade",
  "Championship",
  "CommissionerAction",
  "Rivalry",
  "DynastyEra",
] as const;

export type GraphNodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  "MANAGES",
  "OWNS",
  "TRADED_WITH",
  "RIVAL_OF",
  "DRAFTED",
  "ACQUIRED",
  "LOST_TO",
  "ELIMINATED",
  "WON_TITLE",
  "COMMISSIONER_OF",
  "COMMISSIONED_BY",
  "BLOCKED",
  "MENTIONED",
  "INFLUENCED_BY",
  "SUCCESSOR_OF",
  "FACED",
  "DEFEATED",
  "LEAGUE_MEMBER_OF",
  "CHAMPION_OF",
  "POWER_SHIFT_EDGE",
  "DRAMA_EVENT_EDGE",
  "CO_MANAGED",
] as const;

export type GraphEdgeType = (typeof EDGE_TYPES)[number];

export interface ManagerNode {
  managerId: string;
  displayName: string;
  sport: string | null;
  reputation?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface TeamNode {
  teamId: string;
  leagueId: string;
  sport: string;
  season: number | null;
  createdAt?: string;
}

export interface LeagueNode {
  leagueId: string;
  sport: string;
  season: number | null;
  createdAt?: string;
}

export interface GraphNodePayload {
  nodeId: string;
  nodeType: GraphNodeType;
  entityId: string;
  leagueId: string;
  season: number | null;
  sport?: string | null;
  metadata: Record<string, unknown> | null;
}

export interface GraphEdgePayload {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: GraphEdgeType;
  weight: number;
  season: number | null;
  sport?: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LeagueGraphSnapshotPayload {
  leagueId: string;
  season: number;
  graphVersion: number;
  nodeCount: number;
  edgeCount: number;
  summary: Record<string, unknown> | null;
}

/** Builds a stable node id. */
export function nodeId(
  nodeType: GraphNodeType,
  entityId: string,
  leagueId: string,
  season: number | null
): string {
  const s = season != null ? String(season) : "all";
  return `${nodeType}:${entityId}:${leagueId}:${s}`;
}

/** Builds a stable edge id. */
export function edgeId(
  fromNodeId: string,
  toNodeId: string,
  edgeType: GraphEdgeType,
  season: number | null,
  suffix?: string
): string {
  const s = season != null ? String(season) : "all";
  const suf = suffix ? `:${suffix}` : "";
  return `e:${fromNodeId}|${toNodeId}|${edgeType}|${s}${suf}`;
}

/** Query result: strongest rivals (pair + intensity). */
export interface RivalPair {
  nodeA: string;
  nodeB: string;
  weight: number;
  metadata?: Record<string, unknown>;
}

/** Query result: trade partner pair + count/value. */
export interface TradePartnerPair {
  fromNodeId: string;
  toNodeId: string;
  tradeCount: number;
  totalWeight?: number;
  metadata?: Record<string, unknown>;
}

/** Query result: centrality / isolation. */
export interface ManagerConnectionScore {
  nodeId: string;
  entityId: string;
  degree: number;
  weightedDegree: number;
  isIsolated: boolean;
}

/** Query result: power shift over time. */
export interface PowerShiftBucket {
  season: number;
  topNodeIds: string[];
  metric: string;
  metadata?: Record<string, unknown>;
}

// ─── Relationship & Influence Output Models ─────────────────────────────────

export interface RivalryScore {
  nodeA: string;
  nodeB: string;
  intensityScore: number;
  weight: number;
  pathDepth?: number;
  metadata?: Record<string, unknown>;
}

export interface TradeClusterMember {
  nodeId: string;
  entityId: string;
  totalTradeWeight: number;
  partnerCount: number;
}

export interface TradeCluster {
  id: string;
  members: TradeClusterMember[];
  internalWeight: number;
  dominantPair?: { nodeA: string; nodeB: string; weight: number };
  metadata?: Record<string, unknown>;
}

export interface InfluenceLeader {
  nodeId: string;
  entityId: string;
  compositeScore: number;
  centralityScore: number;
  tradeInfluenceScore: number;
  rivalryInfluenceScore: number;
  championshipImpactScore: number;
  commissionerInfluenceScore: number;
  dynastyPresenceScore: number;
  metadata?: Record<string, unknown>;
}

export interface DynastyPowerTransition {
  fromSeason: number;
  toSeason: number;
  fromNodeIds: string[];
  toNodeIds: string[];
  type: "succession" | "decline" | "shift";
  metadata?: Record<string, unknown>;
}

export interface LeagueRelationshipProfile {
  leagueId: string;
  season: number | null;
  strongestRivalries: RivalryScore[];
  tradeClusters: TradeCluster[];
  influenceLeaders: InfluenceLeader[];
  centralManagers: Array<{ nodeId: string; entityId: string; centralityScore: number; degree: number; weightedDegree: number }>;
  isolatedManagers: Array<{ nodeId: string; entityId: string }>;
  dynastyPowerTransitions: DynastyPowerTransition[];
  repeatedEliminationPatterns: Array<{ eliminatorNodeId: string; eliminatedNodeId: string; count: number; seasons: number[] }>;
  generatedAt: string;
}

export interface ManagerInfluenceProfile {
  userId: string;
  leagueId: string;
  centralityScore: number;
  tradeInfluenceScore: number;
  rivalryInfluenceScore: number;
  championshipImpactScore: number;
  commissionerInfluenceScore: number;
  dynastyPresenceScore: number;
  updatedAt: string;
}
