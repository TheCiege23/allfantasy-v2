/**
 * League Intelligence Graph — builds graph edges from nodes and league data.
 * Depends on GraphNodeBuilder output to resolve fromNodeId / toNodeId.
 */

import { prisma } from "@/lib/prisma";
import { normalizeToSupportedSport } from "@/lib/sport-scope";
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

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
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
  const sportNorm = normalizeToSupportedSport(league.sport != null ? String(league.sport) : null);
  const leagueNodeId = findNode(nodes, "League", leagueId);
  const pushEdge = (edge: GraphEdgePayload) => {
    if (seenEdgeIds.has(edge.edgeId)) return;
    seenEdgeIds.add(edge.edgeId);
    edges.push(edge);
  };

  // MANAGES + OWNS: Manager -> TeamSeason (MANAGES), Manager -> TeamSeason (OWNS for ownership)
  for (const team of league.teams) {
    const managerEntityId = `manager:${team.ownerName}:${team.externalId}`;
    const teamNodeId = findNode(nodes, "TeamSeason", team.id);
    const managerNodeId = findNode(nodes, "Manager", managerEntityId);
    if (teamNodeId && managerNodeId) {
      for (const type of ["MANAGES", "OWNS"] as GraphEdgeType[]) {
        const eid = edgeId(managerNodeId, teamNodeId, type, seasonNum);
        pushEdge({
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
      if (leagueNodeId) {
        pushEdge({
          edgeId: edgeId(managerNodeId, leagueNodeId, "LEAGUE_MEMBER_OF", seasonNum),
          fromNodeId: managerNodeId,
          toNodeId: leagueNodeId,
          edgeType: "LEAGUE_MEMBER_OF",
          weight: 1,
          season: seasonNum,
          sport: sportNorm,
          metadata: { source: "manager_membership" },
        });
        pushEdge({
          edgeId: edgeId(teamNodeId, leagueNodeId, "LEAGUE_MEMBER_OF", seasonNum, team.id),
          fromNodeId: teamNodeId,
          toNodeId: leagueNodeId,
          edgeType: "LEAGUE_MEMBER_OF",
          weight: 1,
          season: seasonNum,
          sport: sportNorm,
          metadata: { source: "team_membership" },
        });
      }
    }
  }

  // Commissioner relationship if a commissioner manager node exists.
  if (leagueNodeId) {
    const commissionerManagerNodeId = findNode(nodes, "Manager", league.userId);
    if (commissionerManagerNodeId) {
      pushEdge({
        edgeId: edgeId(leagueNodeId, commissionerManagerNodeId, "COMMISSIONED_BY", seasonNum),
        fromNodeId: leagueNodeId,
        toNodeId: commissionerManagerNodeId,
        edgeType: "COMMISSIONED_BY",
        weight: 1,
        season: seasonNum,
        sport: sportNorm,
        metadata: { role: "commissioner" },
      });
      pushEdge({
        edgeId: edgeId(commissionerManagerNodeId, leagueNodeId, "COMMISSIONER_OF", seasonNum),
        fromNodeId: commissionerManagerNodeId,
        toNodeId: leagueNodeId,
        edgeType: "COMMISSIONER_OF",
        weight: 1,
        season: seasonNum,
        sport: sportNorm,
        metadata: { role: "commissioner" },
      });
    }
  }

  // WON_TITLE: TeamSeason -> Championship (map rosterId to team via externalId)
  const seasonStr = season != null ? String(season) : null;
  const seasonResults = await prisma.seasonResult.findMany({
    where: {
      leagueId,
      ...(seasonStr != null ? { season: seasonStr } : {}),
    },
  });
  const championResults = seasonResults.filter((r) => r.champion);
  for (const row of championResults) {
    const team = league.teams.find((t) => t.externalId === row.rosterId);
    if (!team) continue;
    const champEntityId = `champ:${row.leagueId}:${row.season}:${row.rosterId}`;
    const teamNodeId = findNode(nodes, "TeamSeason", team.id);
    const champNodeId = findNode(nodes, "Championship", champEntityId);
    if (teamNodeId && champNodeId) {
      const eid = edgeId(teamNodeId, champNodeId, "WON_TITLE", row.season ? parseInt(row.season, 10) : null);
      pushEdge({
        edgeId: eid,
        fromNodeId: teamNodeId,
        toNodeId: champNodeId,
        edgeType: "WON_TITLE",
        weight: 1,
        season: row.season ? parseInt(row.season, 10) : null,
        sport: sportNorm,
        metadata: { rosterId: row.rosterId },
      });
      if (leagueNodeId) {
        pushEdge({
          edgeId: edgeId(teamNodeId, leagueNodeId, "CHAMPION_OF", row.season ? parseInt(row.season, 10) : null, row.rosterId),
          fromNodeId: teamNodeId,
          toNodeId: leagueNodeId,
          edgeType: "CHAMPION_OF",
          weight: 1,
          season: row.season ? parseInt(row.season, 10) : null,
          sport: sportNorm,
          metadata: { rosterId: row.rosterId },
        });
      }
    }
  }

  // ELIMINATED: season champion eliminates non-champions at season end.
  const seasonBuckets = new Map<string, typeof seasonResults>();
  for (const row of seasonResults) {
    const key = row.season;
    const bucket = seasonBuckets.get(key) ?? [];
    bucket.push(row);
    seasonBuckets.set(key, bucket);
  }
  for (const [seasonKey, rows] of seasonBuckets) {
    const seasonInt = parseInt(seasonKey, 10);
    const champions = rows.filter((r) => r.champion);
    const nonChampions = rows.filter((r) => !r.champion);
    for (const champ of champions) {
      const champTeam = league.teams.find((t) => t.externalId === champ.rosterId);
      const champNodeId = champTeam ? findNode(nodes, "TeamSeason", champTeam.id) : null;
      if (!champNodeId) continue;
      for (const loser of nonChampions) {
        const loserTeam = league.teams.find((t) => t.externalId === loser.rosterId);
        const loserNodeId = loserTeam ? findNode(nodes, "TeamSeason", loserTeam.id) : null;
        if (!loserNodeId) continue;
        pushEdge({
          edgeId: edgeId(champNodeId, loserNodeId, "ELIMINATED", Number.isNaN(seasonInt) ? seasonNum : seasonInt, `${champ.rosterId}:${loser.rosterId}`),
          fromNodeId: champNodeId,
          toNodeId: loserNodeId,
          edgeType: "ELIMINATED",
          weight: 1,
          season: Number.isNaN(seasonInt) ? seasonNum : seasonInt,
          sport: sportNorm,
          metadata: { reason: "season_end_champion" },
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
        const edgeSport = t.sport ? normalizeToSupportedSport(t.sport) : sportNorm;
        pushEdge({
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
      pushEdge({
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
    pushEdge({
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
    pushEdge({
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
      pushEdge({
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

  // DRAFTED: Manager -> DraftPick edges for historical draft context.
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
  for (const draft of draftFacts) {
    if (!draft.managerId) continue;
    const draftEntityId = `${draft.season ?? "na"}:${draft.round}:${draft.pickNumber}:${draft.playerId}`;
    const draftNodeId = findNode(nodes, "DraftPick", draftEntityId);
    const managerNodeId = findNode(nodes, "Manager", draft.managerId);
    if (!draftNodeId || !managerNodeId) continue;
    pushEdge({
      edgeId: edgeId(managerNodeId, draftNodeId, "DRAFTED", draft.season ?? seasonNum, draftEntityId),
      fromNodeId: managerNodeId,
      toNodeId: draftNodeId,
      edgeType: "DRAFTED",
      weight: 1,
      season: draft.season ?? seasonNum,
      sport: draft.sport ? normalizeToSupportedSport(draft.sport) : sportNorm,
      metadata: {
        round: draft.round,
        pickNumber: draft.pickNumber,
        playerId: draft.playerId,
      },
    });
  }

  // DRAMA_EVENT_EDGE: connect related managers/teams participating in the same drama event.
  const dramaEvents = await prisma.dramaEvent.findMany({
    where: {
      leagueId,
      ...(seasonNum != null ? { season: seasonNum } : {}),
    },
    select: {
      id: true,
      sport: true,
      season: true,
      dramaType: true,
      headline: true,
      dramaScore: true,
      relatedManagerIds: true,
      relatedTeamIds: true,
    },
    take: 500,
  }).catch(() => []);
  for (const event of dramaEvents) {
    const eventSport = event.sport ? normalizeToSupportedSport(event.sport) : sportNorm;
    const relatedTeamIds = asStringArray(event.relatedTeamIds);
    const relatedManagerIds = asStringArray(event.relatedManagerIds);

    const teamNodeIds = relatedTeamIds
      .map((teamId) => {
        const team = league.teams.find((t) => t.id === teamId || t.externalId === teamId);
        return team ? findNode(nodes, "TeamSeason", team.id) : null;
      })
      .filter((id): id is string => Boolean(id));
    const managerNodeIds = relatedManagerIds
      .map((managerId) => findNode(nodes, "Manager", managerId))
      .filter((id): id is string => Boolean(id));

    const pair = teamNodeIds.length >= 2 ? [teamNodeIds[0]!, teamNodeIds[1]!] : managerNodeIds.length >= 2 ? [managerNodeIds[0]!, managerNodeIds[1]!] : null;
    if (!pair) continue;
    const [fromId, toId] = pair[0] < pair[1] ? [pair[0], pair[1]] : [pair[1], pair[0]];
    pushEdge({
      edgeId: edgeId(fromId, toId, "DRAMA_EVENT_EDGE", event.season ?? seasonNum, event.id),
      fromNodeId: fromId,
      toNodeId: toId,
      edgeType: "DRAMA_EVENT_EDGE",
      weight: Math.max(1, event.dramaScore),
      season: event.season ?? seasonNum,
      sport: eventSport,
      metadata: {
        dramaType: event.dramaType,
        headline: event.headline,
        eventId: event.id,
      },
    });
  }

  // POWER_SHIFT_EDGE: connect consecutive season champions to show dynasty transitions.
  const championsBySeason = championResults
    .map((r) => ({ season: parseInt(r.season, 10), rosterId: r.rosterId }))
    .filter((r) => !Number.isNaN(r.season))
    .sort((a, b) => a.season - b.season);
  for (let i = 1; i < championsBySeason.length; i++) {
    const prev = championsBySeason[i - 1]!;
    const next = championsBySeason[i]!;
    const prevTeam = league.teams.find((t) => t.externalId === prev.rosterId);
    const nextTeam = league.teams.find((t) => t.externalId === next.rosterId);
    if (!prevTeam || !nextTeam) continue;
    const prevNodeId = findNode(nodes, "TeamSeason", prevTeam.id);
    const nextNodeId = findNode(nodes, "TeamSeason", nextTeam.id);
    if (!prevNodeId || !nextNodeId) continue;
    pushEdge({
      edgeId: edgeId(prevNodeId, nextNodeId, "POWER_SHIFT_EDGE", next.season, `${prev.season}:${next.season}`),
      fromNodeId: prevNodeId,
      toNodeId: nextNodeId,
      edgeType: "POWER_SHIFT_EDGE",
      weight: 1,
      season: next.season,
      sport: sportNorm,
      metadata: {
        fromSeason: prev.season,
        toSeason: next.season,
        fromRosterId: prev.rosterId,
        toRosterId: next.rosterId,
      },
    });
  }

  return edges;
}
