/**
 * League Intelligence Graph — builds graph nodes from league, teams, trades, results, rivalries.
 * Modular: only adds nodes for entities that exist in the given scope (leagueId / season).
 */

import { prisma } from "@/lib/prisma";
import { normalizeToSupportedSport } from "@/lib/sport-scope";
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

function managerKey(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return v.toLowerCase();
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
  const seenNodeIds = new Set<string>();
  const pushNode = (node: GraphNodePayload) => {
    if (seenNodeIds.has(node.nodeId)) return;
    seenNodeIds.add(node.nodeId);
    nodes.push(node);
  };

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  });
  if (!league) return nodes;

  const seasonNum = season ?? null;
  const seasonStr = season != null ? String(season) : null;
  const sportNorm = normalizeToSupportedSport(league.sport != null ? String(league.sport) : null);

  const [reputationRows, hallEntries] = await Promise.all([
    prisma.managerReputationRecord.findMany({
      where: { leagueId },
      select: {
        managerId: true,
        overallScore: true,
        tier: true,
        commissionerTrustScore: true,
        updatedAt: true,
      },
    }).catch(() => []),
    prisma.hallOfFameEntry.findMany({
      where: { leagueId, entityType: { in: ["Manager", "manager"] } },
      select: { entityId: true, score: true, inductedAt: true },
      take: 500,
    }).catch(() => []),
  ]);

  const reputationByManager = new Map<
    string,
    {
      overallScore: number;
      tier: string;
      commissionerTrustScore: number;
      updatedAt: string;
    }
  >();
  for (const row of reputationRows) {
    const k = managerKey(row.managerId);
    if (!k) continue;
    reputationByManager.set(k, {
      overallScore: row.overallScore,
      tier: row.tier,
      commissionerTrustScore: row.commissionerTrustScore,
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  const hallByManager = new Map<string, { entryCount: number; bestScore: number; lastInductedAt: string }>();
  for (const row of hallEntries) {
    const k = managerKey(row.entityId);
    if (!k) continue;
    const score = Number(row.score);
    const current = hallByManager.get(k) ?? { entryCount: 0, bestScore: 0, lastInductedAt: row.inductedAt.toISOString() };
    current.entryCount += 1;
    current.bestScore = Math.max(current.bestScore, score);
    if (row.inductedAt.toISOString() > current.lastInductedAt) {
      current.lastInductedAt = row.inductedAt.toISOString();
    }
    hallByManager.set(k, current);
  }

  // League node
  pushNode({
    nodeId: nodeId("League", league.id, leagueId, seasonNum),
    nodeType: "League",
    entityId: league.id,
    leagueId: league.id,
    season: seasonNum,
    sport: sportNorm,
    metadata: {
      leagueId: league.id,
      season: seasonNum,
      sport: sportNorm,
      name: league.name ?? undefined,
      platform: league.platform,
    },
  });

  // Commissioner manager node (if available).
  const commissionerManagerNodeId = nodeId("Manager", league.userId, leagueId, seasonNum);
  if (league.userId) {
    const commissionerReputation = reputationByManager.get(managerKey(league.userId) ?? "__missing__");
    const commissionerHall = hallByManager.get(managerKey(league.userId) ?? "__missing__");
    pushNode({
      nodeId: commissionerManagerNodeId,
      nodeType: "Manager",
      entityId: league.userId,
      leagueId: league.id,
      season: seasonNum,
      sport: sportNorm,
      metadata: {
        managerId: league.userId,
        displayName: "Commissioner",
        sport: sportNorm,
        isCommissioner: true,
        reputation: commissionerReputation ?? null,
        hallOfFame: commissionerHall ?? null,
      },
    });
  }

  // TeamSeason + Manager from LeagueTeam.
  for (const team of league.teams) {
    const teamEntityId = team.id;
    pushNode({
      nodeId: nodeId("TeamSeason", teamEntityId, leagueId, seasonNum),
      nodeType: "TeamSeason",
      entityId: teamEntityId,
      leagueId: leagueId,
      season: seasonNum,
      sport: sportNorm,
      metadata: {
        teamId: team.id,
        leagueId,
        season: seasonNum,
        sport: sportNorm,
        teamName: team.teamName,
        ownerName: team.ownerName,
        externalId: team.externalId,
        wins: team.wins,
        losses: team.losses,
      },
    });

    const managerEntityId = `manager:${team.ownerName}:${team.externalId}`;
    const rep =
      reputationByManager.get(managerKey(managerEntityId) ?? "__missing__") ??
      reputationByManager.get(managerKey(team.ownerName) ?? "__missing__");
    const hall =
      hallByManager.get(managerKey(managerEntityId) ?? "__missing__") ??
      hallByManager.get(managerKey(team.ownerName) ?? "__missing__");

    pushNode({
      nodeId: nodeId("Manager", managerEntityId, leagueId, seasonNum),
      nodeType: "Manager",
      entityId: managerEntityId,
      leagueId: leagueId,
      season: seasonNum,
      sport: sportNorm,
      metadata: {
        managerId: managerEntityId,
        displayName: team.ownerName,
        ownerName: team.ownerName,
        teamId: team.id,
        sport: sportNorm,
        reputation: rep ?? null,
        hallOfFame: hall ?? null,
      },
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
    pushNode({
      nodeId: nodeId("Championship", entityId, leagueId, row.season ? parseInt(row.season, 10) : null),
      nodeType: "Championship",
      entityId,
      leagueId,
      season: row.season ? parseInt(row.season, 10) : null,
      sport: sportNorm,
      metadata: { rosterId: row.rosterId, season: row.season },
    });
  }

  // Trades: from LeagueTradeHistory by platform league id(s) — include dynasty historical seasons.
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
        pushNode({
          nodeId: nodeId("Trade", t.id, leagueId, t.season),
          nodeType: "Trade",
          entityId: t.id,
          leagueId,
          season: t.season,
          sport: t.sport ? normalizeToSupportedSport(t.sport) : sportNorm,
          metadata: {
            week: t.week,
            partnerRosterId: t.partnerRosterId,
            partnerName: t.partnerName,
          },
        });
      }
    }
  }

  // Draft history nodes for storyline and timeline context.
  const draftFacts = await prisma.draftFact.findMany({
    where: {
      leagueId,
      ...(seasonNum != null ? { season: seasonNum } : {}),
    },
    select: {
      season: true,
      round: true,
      pickNumber: true,
      playerId: true,
      managerId: true,
      sport: true,
    },
    take: 1000,
  }).catch(() => []);
  for (const d of draftFacts) {
    const draftEntityId = `${d.season ?? "na"}:${d.round}:${d.pickNumber}:${d.playerId}`;
    pushNode({
      nodeId: nodeId("DraftPick", draftEntityId, leagueId, d.season ?? seasonNum),
      nodeType: "DraftPick",
      entityId: draftEntityId,
      leagueId,
      season: d.season ?? seasonNum,
      sport: d.sport ? normalizeToSupportedSport(d.sport) : sportNorm,
      metadata: {
        season: d.season ?? seasonNum,
        round: d.round,
        pickNumber: d.pickNumber,
        playerId: d.playerId,
        managerId: d.managerId,
      },
    });
    if (d.managerId) {
      const rep = reputationByManager.get(managerKey(d.managerId) ?? "__missing__");
      const hall = hallByManager.get(managerKey(d.managerId) ?? "__missing__");
      pushNode({
        nodeId: nodeId("Manager", d.managerId, leagueId, d.season ?? seasonNum),
        nodeType: "Manager",
        entityId: d.managerId,
        leagueId,
        season: d.season ?? seasonNum,
        sport: d.sport ? normalizeToSupportedSport(d.sport) : sportNorm,
        metadata: {
          managerId: d.managerId,
          displayName: d.managerId,
          source: "draft_history",
          sport: d.sport ? normalizeToSupportedSport(d.sport) : sportNorm,
          reputation: rep ?? null,
          hallOfFame: hall ?? null,
        },
      });
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
        if (seenNodeIds.has(managerNodeId)) continue;
        const rep = reputationByManager.get(managerKey(uid) ?? "__missing__");
        const hall = hallByManager.get(managerKey(uid) ?? "__missing__");
        pushNode({
          nodeId: managerNodeId,
          nodeType: "Manager",
          entityId: uid,
          leagueId,
          season: seasonNum,
          sport: sportNorm,
          metadata: {
            managerId: uid,
            displayName: uid,
            source: "rivalry",
            sport: sportNorm,
            reputation: rep ?? null,
            hallOfFame: hall ?? null,
          },
        });
      }
      const entityId = [r.userAId, r.userBId].sort().join("_");
      if (!nodes.some((n) => n.entityId === entityId && n.nodeType === "Rivalry")) {
        pushNode({
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
