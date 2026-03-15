/**
 * League Intelligence Graph — builds graph edges from nodes and league data.
 * Depends on GraphNodeBuilder output to resolve fromNodeId / toNodeId.
 */

import { prisma } from "@/lib/prisma";
import type { GraphNodePayload } from "./types";
import { edgeId, type GraphEdgePayload, type GraphEdgeType } from "./types";

export interface GraphEdgeBuilderInput {
  leagueId: string;
  season: number | null;
  nodes: GraphNodePayload[];
  includeTrades?: boolean;
  includeRivalries?: boolean;
  scopeUserId?: string | null;
}

function findNode(nodes: GraphNodePayload[], nodeType: string, entityId: string): string | null {
  const n = nodes.find((x) => x.nodeType === nodeType && x.entityId === entityId);
  return n?.nodeId ?? null;
}

/**
 * Builds all graph edges for the given league and nodes. Does not persist.
 */
export async function buildGraphEdges(
  input: GraphEdgeBuilderInput
): Promise<GraphEdgePayload[]> {
  const { leagueId, season, nodes, includeTrades = true, includeRivalries = true, scopeUserId } = input;
  const edges: GraphEdgePayload[] = [];
  const seenEdgeIds = new Set<string>();

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) return edges;

  const seasonNum = season ?? null;
  const sportNorm = league.sport != null ? String(league.sport).toUpperCase() : null;

  // MANAGES + OWNS: Manager -> TeamSeason (MANAGES), Manager -> TeamSeason (OWNS for ownership)
  for (const team of league.teams) {
    const managerEntityId = `manager:${team.ownerName}:${team.externalId}`;
    const teamNodeId = findNode(nodes, "TeamSeason", team.id);
    const managerNodeId = findNode(nodes, "Manager", managerEntityId);
    if (teamNodeId && managerNodeId) {
      for (const type of ["MANAGES", "OWNS"] as GraphEdgeType[]) {
        const eid = edgeId(managerNodeId, teamNodeId, type, seasonNum);
        if (seenEdgeIds.has(eid)) continue;
        seenEdgeIds.add(eid);
        edges.push({
          edgeId: eid,
          fromNodeId: managerNodeId,
          toNodeId: teamNodeId,
          edgeType: type,
          weight: 1,
          season: seasonNum,
          sport: sportNorm,
          metadata: null,
        });
      }
    }
  }

  // WON_TITLE: TeamSeason -> Championship (map rosterId to team via externalId)
  const seasonStr = season != null ? String(season) : null;
  const championResults = await prisma.seasonResult.findMany({
    where: {
      leagueId,
      champion: true,
      ...(seasonStr != null ? { season: seasonStr } : {}),
    },
  });
  for (const row of championResults) {
    const team = league.teams.find((t) => t.externalId === row.rosterId);
    if (!team) continue;
    const champEntityId = `champ:${row.leagueId}:${row.season}:${row.rosterId}`;
    const teamNodeId = findNode(nodes, "TeamSeason", team.id);
    const champNodeId = findNode(nodes, "Championship", champEntityId);
    if (teamNodeId && champNodeId) {
      const eid = edgeId(teamNodeId, champNodeId, "WON_TITLE", row.season ? parseInt(row.season, 10) : null);
      if (!seenEdgeIds.has(eid)) {
        seenEdgeIds.add(eid);
        edges.push({
          edgeId: eid,
          fromNodeId: teamNodeId,
          toNodeId: champNodeId,
          edgeType: "WON_TITLE",
          weight: 1,
          season: row.season ? parseInt(row.season, 10) : null,
          metadata: { rosterId: row.rosterId },
        });
      }
    }
  }

  // Trades: ACQUIRED — use all dynasty season platform league ids when available
  const sleeperPlatformIds: string[] = [];
  if (league.platform === "sleeper") {
    const dynastySeasons = await prisma.leagueDynastySeason.findMany({
      where: { leagueId },
      select: { platformLeagueId: true },
    });
    if (dynastySeasons.length > 0) {
      sleeperPlatformIds.push(...dynastySeasons.map((d) => d.platformLeagueId));
    } else if (league.platformLeagueId) {
      sleeperPlatformIds.push(league.platformLeagueId);
    }
  }
  if (includeTrades && sleeperPlatformIds.length > 0) {
    const histories = await prisma.leagueTradeHistory.findMany({
      where: { sleeperLeagueId: { in: sleeperPlatformIds } },
      include: { trades: true },
    });
    for (const history of histories) {
      const trades = season != null ? history.trades.filter((t) => t.season === season) : history.trades;
      for (const t of trades) {
        const tradeNodeId = findNode(nodes, "Trade", t.id);
        if (!tradeNodeId) continue;
        const partnerRosterId = t.partnerRosterId != null ? String(t.partnerRosterId) : null;
        if (!partnerRosterId) continue;
        const partnerTeam = league.teams.find((x) => x.externalId === partnerRosterId);
        if (!partnerTeam) continue;
        const teamNodeId = findNode(nodes, "TeamSeason", partnerTeam.id);
        if (!teamNodeId) continue;
        const eid = edgeId(tradeNodeId, teamNodeId, "ACQUIRED", t.season, t.id);
        if (seenEdgeIds.has(eid)) continue;
        seenEdgeIds.add(eid);
        const edgeSport = t.sport ? String(t.sport).toUpperCase() : sportNorm;
        edges.push({
          edgeId: eid,
          fromNodeId: tradeNodeId,
          toNodeId: teamNodeId,
          edgeType: "ACQUIRED",
          weight: 1,
          season: t.season,
          sport: edgeSport,
          metadata: { tradeId: t.id, week: t.week },
        });
      }
    }
  }

  // TRADED_WITH: between two TeamSeasons when we have both sides (same transactionId)
  if (includeTrades && sleeperPlatformIds.length > 0) {
    const historiesTx = await prisma.leagueTradeHistory.findMany({
      where: { sleeperLeagueId: { in: sleeperPlatformIds } },
      include: { trades: true },
    });
    const byTx: Map<string, Array<{ rosterId: string; username: string }>> = new Map();
    for (const history of historiesTx) {
      const trades = season != null ? history.trades.filter((t) => t.season === season) : history.trades;
      for (const t of trades) {
        const partnerRosterId = t.partnerRosterId != null ? String(t.partnerRosterId) : null;
        if (!partnerRosterId) continue;
        const list = byTx.get(t.transactionId) ?? [];
        list.push({ rosterId: partnerRosterId, username: history.sleeperUsername });
        byTx.set(t.transactionId, list);
      }
    }
    for (const [txId, list] of byTx) {
      const rosterIds = [...new Set(list.map((x) => x.rosterId))].filter((id) => {
        const team = league.teams.find((t) => t.externalId === id);
        return !!team;
      });
      if (rosterIds.length < 2) continue;
      const [a, b] = rosterIds;
      const teamA = league.teams.find((t) => t.externalId === a)!;
      const teamB = league.teams.find((t) => t.externalId === b)!;
      const nodeA = findNode(nodes, "TeamSeason", teamA.id);
      const nodeB = findNode(nodes, "TeamSeason", teamB.id);
      if (!nodeA || !nodeB) continue;
      const [fromId, toId] = nodeA < nodeB ? [nodeA, nodeB] : [nodeB, nodeA];
      const eid = edgeId(fromId, toId, "TRADED_WITH", seasonNum, txId);
      if (seenEdgeIds.has(eid)) continue;
      seenEdgeIds.add(eid);
      edges.push({
        edgeId: eid,
        fromNodeId: fromId,
        toNodeId: toId,
        edgeType: "TRADED_WITH",
        weight: list.length,
        season: seasonNum,
        sport: sportNorm,
        metadata: null,
      });
    }
  }

  // FACED + DEFEATED: from MatchupFact (warehouse) or WeeklyMatchup
  const matchupFacts = await prisma.matchupFact.findMany({
    where: { leagueId, ...(seasonNum != null ? { season: seasonNum } : {}) },
  });
  const facedCount = new Map<string, number>();
  const defeatedCount = new Map<string, number>();
  for (const m of matchupFacts) {
    const teamA = league.teams.find((t) => t.externalId === m.teamA || t.id === m.teamA);
    const teamB = league.teams.find((t) => t.externalId === m.teamB || t.id === m.teamB);
    if (!teamA || !teamB) continue;
    const nodeA = findNode(nodes, "TeamSeason", teamA.id);
    const nodeB = findNode(nodes, "TeamSeason", teamB.id);
    if (!nodeA || !nodeB) continue;
    const [fromId, toId] = nodeA < nodeB ? [nodeA, nodeB] : [nodeB, nodeA];
    const facedKey = `${fromId}|${toId}`;
    facedCount.set(facedKey, (facedCount.get(facedKey) ?? 0) + 1);
    if (m.winnerTeamId) {
      const winnerNode = m.winnerTeamId === teamA.id || m.winnerTeamId === teamA.externalId ? nodeA : (m.winnerTeamId === teamB.id || m.winnerTeamId === teamB.externalId ? nodeB : null);
      const loserNode = winnerNode === nodeA ? nodeB : nodeA;
      if (winnerNode && loserNode) {
        const defKey = `${winnerNode}|${loserNode}`;
        defeatedCount.set(defKey, (defeatedCount.get(defKey) ?? 0) + 1);
      }
    }
  }
  for (const [key, w] of facedCount) {
    const [fromId, toId] = key.split("|");
    const eid = edgeId(fromId!, toId!, "FACED", seasonNum, key);
    if (seenEdgeIds.has(eid)) continue;
    seenEdgeIds.add(eid);
    edges.push({
      edgeId: eid,
      fromNodeId: fromId!,
      toNodeId: toId!,
      edgeType: "FACED",
      weight: w,
      season: seasonNum,
      sport: sportNorm,
      metadata: null,
    });
  }
  for (const [key, w] of defeatedCount) {
    const [winnerId, loserId] = key.split("|");
    const eid = edgeId(winnerId!, loserId!, "DEFEATED", seasonNum, key);
    if (seenEdgeIds.has(eid)) continue;
    seenEdgeIds.add(eid);
    edges.push({
      edgeId: eid,
      fromNodeId: winnerId!,
      toNodeId: loserId!,
      edgeType: "DEFEATED",
      weight: w,
      season: seasonNum,
      sport: sportNorm,
      metadata: null,
    });
  }

  // RIVAL_OF: between two Manager nodes (userId-based)
  if (includeRivalries) {
    const userIds = scopeUserId ? [scopeUserId] : [league.userId];
    const rivalries = await prisma.userRivalry.findMany({
      where: {
        OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }],
      },
    });
    for (const r of rivalries) {
      const nodeA = findNode(nodes, "Manager", r.userAId);
      const nodeB = findNode(nodes, "Manager", r.userBId);
      if (!nodeA || !nodeB) continue;
      const [fromId, toId] = nodeA < nodeB ? [nodeA, nodeB] : [nodeB, nodeA];
      const intensity = r.totalMeetings + (r.winsA + r.winsB);
      const eid = edgeId(fromId, toId, "RIVAL_OF", seasonNum, r.id);
      if (seenEdgeIds.has(eid)) continue;
      seenEdgeIds.add(eid);
      edges.push({
        edgeId: eid,
        fromNodeId: fromId,
        toNodeId: toId,
        edgeType: "RIVAL_OF",
        weight: intensity > 0 ? intensity : 1,
        season: seasonNum,
        sport: sportNorm,
        metadata: { winsA: r.winsA, winsB: r.winsB, totalMeetings: r.totalMeetings },
      });
    }
  }

  return edges;
}
