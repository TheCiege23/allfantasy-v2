import { prisma } from '@/lib/prisma'
import { edgeId } from '@/lib/league-intelligence-graph'
import { listRivalries } from '@/lib/rivalry-engine/RivalryQueryService'
import { normalizeOptionalSportForRelationship } from './SportRelationshipResolver'

export interface GraphRivalryBridgeInput {
  leagueId: string
  sport?: string | null
  season?: number | null
  limit?: number
}

export interface GraphRivalryBridgeResult {
  linkedRivalries: number
  upsertedEdges: number
  skipped: number
}

function parseMetadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

export async function syncRivalryEdgesIntoGraph(
  input: GraphRivalryBridgeInput
): Promise<GraphRivalryBridgeResult> {
  const league = await prisma.league.findUnique({
    where: { id: input.leagueId },
    select: {
      id: true,
      season: true,
      sport: true,
      teams: {
        select: {
          id: true,
          externalId: true,
          ownerName: true,
        },
      },
    },
  })
  if (!league) return { linkedRivalries: 0, upsertedEdges: 0, skipped: 0 }

  const sport = normalizeOptionalSportForRelationship(input.sport ?? league.sport ?? null)
  const season = input.season ?? league.season ?? new Date().getUTCFullYear()

  const rivalries = await listRivalries(input.leagueId, {
    sport: sport ?? undefined,
    season,
    limit: input.limit ?? 200,
  })
  if (rivalries.length === 0) return { linkedRivalries: 0, upsertedEdges: 0, skipped: 0 }

  const graphNodes = await prisma.graphNode.findMany({
    where: {
      leagueId: input.leagueId,
      ...(sport ? { sport } : {}),
      OR: [{ season }, { season: null }],
    },
    select: {
      nodeId: true,
      nodeType: true,
      entityId: true,
      metadata: true,
    },
  })

  const teamNodeByExternalId = new Map<string, string>()
  const managerNodeByOwnerName = new Map<string, string>()
  const managerNodeByExternalId = new Map<string, string>()

  for (const node of graphNodes) {
    const meta = parseMetadataRecord(node.metadata)
    if (node.nodeType === 'TeamSeason') {
      const externalFromMeta = String(meta.externalId ?? '').trim()
      if (externalFromMeta) {
        teamNodeByExternalId.set(normalizeKey(externalFromMeta), node.nodeId)
      }
      if (node.entityId) {
        const team = league.teams.find((t) => t.id === node.entityId)
        if (team?.externalId) {
          teamNodeByExternalId.set(normalizeKey(team.externalId), node.nodeId)
        }
      }
      continue
    }
    if (node.nodeType !== 'Manager') continue

    const ownerName = String(meta.ownerName ?? meta.displayName ?? '').trim()
    if (ownerName) {
      managerNodeByOwnerName.set(normalizeKey(ownerName), node.nodeId)
    }
    const parts = node.entityId.split(':')
    if (parts.length >= 3 && parts[0] === 'manager') {
      const externalId = parts[2]
      if (externalId) {
        managerNodeByExternalId.set(normalizeKey(externalId), node.nodeId)
      }
      const ownerFromEntity = parts[1]
      if (ownerFromEntity) {
        managerNodeByOwnerName.set(normalizeKey(ownerFromEntity), node.nodeId)
      }
    }
  }

  const managerByTeamNode = new Map<string, string>()
  const managerEdges = await prisma.graphEdge.findMany({
    where: {
      edgeType: 'MANAGES',
      season,
      ...(sport ? { sport } : {}),
      fromNodeId: { in: graphNodes.filter((n) => n.nodeType === 'Manager').map((n) => n.nodeId) },
      toNodeId: { in: graphNodes.filter((n) => n.nodeType === 'TeamSeason').map((n) => n.nodeId) },
    },
    select: { fromNodeId: true, toNodeId: true },
  })
  for (const edge of managerEdges) {
    managerByTeamNode.set(edge.toNodeId, edge.fromNodeId)
  }

  let upsertedEdges = 0
  let skipped = 0

  for (const rivalry of rivalries) {
    const aKey = normalizeKey(rivalry.managerAId)
    const bKey = normalizeKey(rivalry.managerBId)

    const teamNodeA = teamNodeByExternalId.get(aKey) ?? null
    const teamNodeB = teamNodeByExternalId.get(bKey) ?? null
    const managerNodeA =
      managerNodeByExternalId.get(aKey) ??
      managerNodeByOwnerName.get(aKey) ??
      (teamNodeA ? managerByTeamNode.get(teamNodeA) ?? null : null)
    const managerNodeB =
      managerNodeByExternalId.get(bKey) ??
      managerNodeByOwnerName.get(bKey) ??
      (teamNodeB ? managerByTeamNode.get(teamNodeB) ?? null : null)

    const edgePairs: Array<{ fromNodeId: string; toNodeId: string; suffix: string }> = []
    if (managerNodeA && managerNodeB && managerNodeA !== managerNodeB) {
      const [fromNodeId, toNodeId] =
        managerNodeA < managerNodeB ? [managerNodeA, managerNodeB] : [managerNodeB, managerNodeA]
      edgePairs.push({ fromNodeId, toNodeId, suffix: `rr:${rivalry.id}:manager` })
    }
    if (teamNodeA && teamNodeB && teamNodeA !== teamNodeB) {
      const [fromNodeId, toNodeId] =
        teamNodeA < teamNodeB ? [teamNodeA, teamNodeB] : [teamNodeB, teamNodeA]
      edgePairs.push({ fromNodeId, toNodeId, suffix: `rr:${rivalry.id}:team` })
    }

    if (edgePairs.length === 0) {
      skipped += 1
      continue
    }

    for (const pair of edgePairs) {
      const resolvedEdgeId = edgeId(pair.fromNodeId, pair.toNodeId, 'RIVAL_OF', season, pair.suffix)
      await prisma.graphEdge.upsert({
        where: { edgeId: resolvedEdgeId },
        create: {
          edgeId: resolvedEdgeId,
          fromNodeId: pair.fromNodeId,
          toNodeId: pair.toNodeId,
          edgeType: 'RIVAL_OF',
          weight: Math.max(1, rivalry.rivalryScore),
          season,
          sport: sport ?? undefined,
          metadata: {
            source: 'rivalryRecord',
            rivalryId: rivalry.id,
            rivalryTier: rivalry.rivalryTier,
            rivalryScore: rivalry.rivalryScore,
            managerAId: rivalry.managerAId,
            managerBId: rivalry.managerBId,
          },
        },
        update: {
          edgeType: 'RIVAL_OF',
          weight: Math.max(1, rivalry.rivalryScore),
          season,
          sport: sport ?? undefined,
          metadata: {
            source: 'rivalryRecord',
            rivalryId: rivalry.id,
            rivalryTier: rivalry.rivalryTier,
            rivalryScore: rivalry.rivalryScore,
            managerAId: rivalry.managerAId,
            managerBId: rivalry.managerBId,
          },
        },
      })
      upsertedEdges += 1
    }
  }

  return {
    linkedRivalries: rivalries.length,
    upsertedEdges,
    skipped,
  }
}
