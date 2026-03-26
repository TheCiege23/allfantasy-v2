/**
 * NarrativeContextAssembler — assembles fact-only context from drama, rivalry, graph, rankings, legacy.
 * No invented data; used as input to one-brain narrative composer.
 */

import { listDramaEvents } from "@/lib/drama-engine/DramaQueryService"
import { buildRelationshipSummary } from "@/lib/league-intelligence-graph/RelationshipSummaryBuilder"
import { getUnifiedRelationshipInsights } from "@/lib/relationship-insights"
import { getSportNarrativeLabel, normalizeToSupportedSport } from "./SportNarrativeResolver"
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
  const { leagueId, season = null, storyType, limitDrama = 15, limitRivalries = 10 } = input
  const sport = normalizeToSupportedSport(input.sport)
  const sportLabel = getSportNarrativeLabel(sport)

  const [dramaEvents, relationshipProfile, unified] = await Promise.all([
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
    getUnifiedRelationshipInsights({
      leagueId,
      sport,
      season,
      limit: 10,
      syncGraphRivalryEdges: true,
    }).catch(() => null),
  ])

  const rivalries =
    unified?.rivalries?.length
      ? unified.rivalries.slice(0, limitRivalries).map((r) => ({
          nodeA: r.managerAId,
          nodeB: r.managerBId,
          intensityScore: r.rivalryScore,
        }))
      : relationshipProfile?.strongestRivalries?.slice(0, limitRivalries).map((r: any) => ({
          nodeA: r.nodeA ?? r.entityA ?? "",
          nodeB: r.nodeB ?? r.entityB ?? "",
          intensityScore: r.intensityScore ?? r.score,
        })) ?? []

  let graphSummary: string | undefined
  let rankingsSnapshot: string | undefined
  let legacyHint: string | undefined
  let simulationHint: string | undefined
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
    if (unified?.storylines?.length) {
      parts.push(`${unified.storylines.length} unified storylines linked across graph/rivalry/profile/drama.`)
      if (unified.storylines[0]?.headline) {
        parts.push(`Top storyline: ${unified.storylines[0].headline}`)
      }
    }
    graphSummary = parts.length ? parts.join(" ") : undefined

    const influenceCount = relationshipProfile.influenceLeaders?.length ?? 0
    const centralCount = relationshipProfile.centralManagers?.length ?? 0
    if (influenceCount || centralCount) {
      rankingsSnapshot = `Power landscape: ${influenceCount} influence leaders and ${centralCount} central managers are shaping league momentum.`
    }

    const transitions = relationshipProfile.dynastyPowerTransitions?.length ?? 0
    if (transitions > 0) {
      legacyHint = `Legacy pressure is active with ${transitions} recent dynasty power transitions.`
    }

    const eliminationPatterns = relationshipProfile.repeatedEliminationPatterns?.length ?? 0
    if (eliminationPatterns > 0) {
      simulationHint = `Playoff pressure indicators are elevated with ${eliminationPatterns} repeated elimination patterns in recent seasons.`
    }
  }

  const allowedManagerNames = new Set<string>()
  const allowedEntityIds = new Set<string>()
  dramaEvents.forEach((e) => e.relatedManagerIds.forEach((id) => allowedManagerNames.add(id)))
  dramaEvents.forEach((e) => e.relatedManagerIds.forEach((id) => allowedEntityIds.add(id)))
  dramaEvents.forEach((e) =>
    (e.relatedTeamIds ?? []).forEach((id) => {
      allowedManagerNames.add(id)
      allowedEntityIds.add(id)
    })
  )
  rivalries.forEach((r) => {
    if (r.nodeA) {
      allowedManagerNames.add(r.nodeA)
      allowedEntityIds.add(r.nodeA)
    }
    if (r.nodeB) {
      allowedManagerNames.add(r.nodeB)
      allowedEntityIds.add(r.nodeB)
    }
  })
  unified?.behaviorDramaContext?.forEach((row) => {
    if (row.managerId) {
      allowedManagerNames.add(row.managerId)
      allowedEntityIds.add(row.managerId)
    }
  })
  ;(unified?.storylines ?? []).forEach((storyline) => {
    if (storyline.managerAId) {
      allowedManagerNames.add(storyline.managerAId)
      allowedEntityIds.add(storyline.managerAId)
    }
    if (storyline.managerBId) {
      allowedManagerNames.add(storyline.managerBId)
      allowedEntityIds.add(storyline.managerBId)
    }
    storyline.relatedManagerIds.forEach((id) => {
      allowedManagerNames.add(id)
      allowedEntityIds.add(id)
    })
    storyline.relatedTeamIds.forEach((id) => {
      allowedManagerNames.add(id)
      allowedEntityIds.add(id)
    })
    extractContextNames(storyline.headline).forEach((name) => allowedManagerNames.add(name))
  })
  dramaEvents.forEach((event) => {
    extractContextNames(event.headline).forEach((name) => allowedManagerNames.add(name))
    extractContextNames(event.summary ?? "").forEach((name) => allowedManagerNames.add(name))
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
      relatedTeamIds: e.relatedTeamIds ?? [],
    })),
    rivalries,
    graphSummary,
    rankingsSnapshot,
    legacyHint,
    simulationHint,
    allowedEntityIds: Array.from(allowedEntityIds),
    allowedManagerNames: Array.from(allowedManagerNames),
  }
}

function extractContextNames(text: string): string[] {
  if (!text) return []
  const candidates = text.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? []
  return candidates.filter((token) => !/^(week|season|story|league|playoff|title)$/i.test(token))
}
