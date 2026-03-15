/**
 * League Intelligence Graph — builds graph nodes from league, teams, trades, results, rivalries.
 * Modular: only adds nodes for entities that exist in the given scope (leagueId / season).
 */

import { prisma } from "@/lib/prisma";
import {
  type GraphNodePayload,
  type GraphNodeType,
  nodeId,
  NODE_TYPES,
} from "./types";

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);

export function isNodeType(s: string): s is GraphNodeType {
  return NODE_TYPE_SET.has(s);
}

export interface GraphNodeBuilderInput {
  leagueId: string;
  season: number | null;
  /** If true, include trades from LeagueTradeHistory where sleeperLeagueId = league.platformLeagueId */
  includeTrades?: boolean;
  /** If true, include UserRivalry rows (scoped by userId when provided) */
  includeRivalries?: boolean;
  /** When building for a league, optionally restrict rivalries to this user (e.g. league owner) */
  scopeUserId?: string | null;
}

/**
 * Builds all graph nodes for the given league (and optional season).
 * Does not persist; returns payloads for the caller to save.
 */
export async function buildGraphNodes(
  input: GraphNodeBuilderInput
): Promise<GraphNodePayload[]> {
  const { leagueId, season, includeTrades = true, includeRivalries = true, scopeUserId } = input;
  const nodes: GraphNodePayload[] = [];

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) return nodes;

  const seasonNum = season ?? null;
  const seasonStr = season != null ? String(season) : null;
  const sportNorm = league.sport != null ? String(league.sport).toUpperCase() : null;

  // League node
  nodes.push({
    nodeId: nodeId("League", league.id, leagueId, seasonNum),
    nodeType: "League",
    entityId: league.id,
    leagueId: league.id,
    season: seasonNum,
    sport: sportNorm,
    metadata: { name: league.name ?? undefined, platform: league.platform },
  });

  // TeamSeason + Manager from LeagueTeam
  for (const team of league.teams) {
    const teamEntityId = team.id;
    nodes.push({
      nodeId: nodeId("TeamSeason", teamEntityId, leagueId, seasonNum),
      nodeType: "TeamSeason",
      entityId: teamEntityId,
      leagueId: leagueId,
      season: seasonNum,
      sport: sportNorm,
      metadata: {
        teamName: team.teamName,
        ownerName: team.ownerName,
        externalId: team.externalId,
        wins: team.wins,
        losses: team.losses,
      },
    });
    const managerEntityId = `manager:${team.ownerName}:${team.externalId}`;
    nodes.push({
      nodeId: nodeId("Manager", managerEntityId, leagueId, seasonNum),
      nodeType: "Manager",
      entityId: managerEntityId,
      leagueId: leagueId,
      season: seasonNum,
      sport: sportNorm,
      metadata: { ownerName: team.ownerName, teamId: team.id },
    });
  }

  // Championship nodes from SeasonResult (champion = true)
  const seasonResults = await prisma.seasonResult.findMany({
    where: {
      leagueId,
      ...(seasonStr != null ? { season: seasonStr } : {}),
      champion: true,
    },
  });
  for (const row of seasonResults) {
    const entityId = `champ:${row.leagueId}:${row.season}:${row.rosterId}`;
    nodes.push({
      nodeId: nodeId("Championship", entityId, leagueId, row.season ? parseInt(row.season, 10) : null),
      nodeType: "Championship",
      entityId,
      leagueId,
      season: row.season ? parseInt(row.season, 10) : null,
      sport: sportNorm,
      metadata: { rosterId: row.rosterId, season: row.season },
    });
  }

  // Trades: from LeagueTradeHistory by platform league id(s) — include dynasty historical seasons
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
    const seenTradeIds = new Set<string>();
    for (const history of histories) {
      const trades = season != null ? history.trades.filter((t) => t.season === season) : history.trades;
      for (const t of trades) {
        if (seenTradeIds.has(t.id)) continue;
        seenTradeIds.add(t.id);
        nodes.push({
          nodeId: nodeId("Trade", t.id, leagueId, t.season),
          nodeType: "Trade",
          entityId: t.id,
          leagueId,
          season: t.season,
          metadata: {
            week: t.week,
            partnerRosterId: t.partnerRosterId,
            partnerName: t.partnerName,
          },
        });
      }
    }
  }

  // Rivalry nodes + Manager nodes by userId (so we can link RIVAL_OF between users)
  if (includeRivalries) {
    const userIds = scopeUserId ? [scopeUserId] : [league.userId];
    const rivalries = await prisma.userRivalry.findMany({
      where: {
        OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }],
      },
    });
    const seenUserIds = new Set<string>();
    for (const r of rivalries) {
      for (const uid of [r.userAId, r.userBId]) {
        if (seenUserIds.has(uid)) continue;
        seenUserIds.add(uid);
        const managerNodeId = nodeId("Manager", uid, leagueId, seasonNum);
        if (nodes.some((n) => n.nodeId === managerNodeId)) continue;
        nodes.push({
          nodeId: managerNodeId,
          nodeType: "Manager",
          entityId: uid,
          leagueId,
          season: seasonNum,
          sport: sportNorm,
          metadata: { source: "rivalry" },
        });
      }
      const entityId = [r.userAId, r.userBId].sort().join("_");
      if (!nodes.some((n) => n.entityId === entityId && n.nodeType === "Rivalry")) {
        nodes.push({
          nodeId: nodeId("Rivalry", entityId, leagueId, seasonNum),
          nodeType: "Rivalry",
          entityId,
          leagueId,
          season: seasonNum,
          sport: sportNorm,
          metadata: { userAId: r.userAId, userBId: r.userBId, totalMeetings: r.totalMeetings, winsA: r.winsA, winsB: r.winsB },
        });
      }
    }
  }

  return nodes;
}
