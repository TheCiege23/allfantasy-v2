/**
 * NarrativeContextAssembler — assembles fact-only context from drama, rivalry, graph, rankings, legacy.
 * No invented data; used as input to one-brain narrative composer.
 */

import { listDramaEvents } from "@/lib/drama-engine/DramaQueryService"
import { buildRelationshipSummary } from "@/lib/league-intelligence-graph/RelationshipSummaryBuilder"
import { getSportNarrativeLabel } from "./SportNarrativeResolver"
import type { NarrativeContextPackage, StoryType } from "./types"

export interface AssembleContextInput {
  leagueId: string
  sport: string
  season?: number | null
  storyType: StoryType
  /** Optional: limit drama events and rivalries for smaller payload. */
  limitDrama?: number
  limitRivalries?: number
}

/**
 * Assemble a narrative context package from league data. All data is real (from DB/graph).
 */
export async function assembleNarrativeContext(
  input: AssembleContextInput
): Promise<NarrativeContextPackage> {
  const { leagueId, sport, season = null, storyType, limitDrama = 15, limitRivalries = 10 } = input
  const sportLabel = getSportNarrativeLabel(sport)

  const [dramaEvents, relationshipProfile] = await Promise.all([
    listDramaEvents(leagueId, { sport, season, limit: limitDrama }).catch(() => []),
    buildRelationshipSummary({
      leagueId,
      season,
      limitRivalries,
      limitClusters: 5,
      limitInfluence: 8,
      limitCentral: 10,
      limitTransitions: 8,
      limitElimination: 8,
    }).catch(() => null),
  ])

  const rivalries = relationshipProfile?.strongestRivalries?.slice(0, limitRivalries).map((r: any) => ({
    nodeA: r.nodeA ?? r.entityA ?? "",
    nodeB: r.nodeB ?? r.entityB ?? "",
    intensityScore: r.intensityScore ?? r.score,
  })) ?? []

  let graphSummary: string | undefined
  if (relationshipProfile) {
    const parts: string[] = []
    if (relationshipProfile.strongestRivalries?.length) {
      parts.push(`${relationshipProfile.strongestRivalries.length} top rivalries.`)
    }
    if (relationshipProfile.influenceLeaders?.length) {
      parts.push(`${relationshipProfile.influenceLeaders.length} influence leaders.`)
    }
    if (relationshipProfile.dynastyPowerTransitions?.length) {
      parts.push(`${relationshipProfile.dynastyPowerTransitions.length} power transitions.`)
    }
    graphSummary = parts.length ? parts.join(" ") : undefined
  }

  const allowedManagerNames = new Set<string>()
  dramaEvents.forEach((e) => e.relatedManagerIds.forEach((id) => allowedManagerNames.add(id)))
  rivalries.forEach((r) => {
    if (r.nodeA) allowedManagerNames.add(r.nodeA)
    if (r.nodeB) allowedManagerNames.add(r.nodeB)
  })

  return {
    leagueId,
    sport,
    sportLabel,
    season,
    storyType,
    dramaEvents: dramaEvents.map((e) => ({
      id: e.id,
      headline: e.headline,
      summary: e.summary ?? null,
      dramaType: e.dramaType,
      dramaScore: e.dramaScore,
      relatedManagerIds: e.relatedManagerIds ?? [],
    })),
    rivalries,
    graphSummary,
    allowedEntityIds: Array.from(allowedManagerNames),
    allowedManagerNames: Array.from(allowedManagerNames),
  }
}
