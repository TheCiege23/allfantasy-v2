import { listDramaEvents } from '@/lib/drama-engine/DramaQueryService'
import { listProfilesByLeague } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'
import { normalizeOptionalSportForRelationship } from './SportRelationshipResolver'
import type { BehaviorDramaManagerContext } from './types'

export interface BehaviorDramaBridgeInput {
  leagueId: string
  sport?: string | null
  season?: number | null
  managerIds?: string[]
  limitPerManager?: number
}

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean))]
}

function calculateBehaviorHeat(profile: {
  aggressionScore: number
  activityScore: number
  tradeFrequencyScore: number
  waiverFocusScore: number
  riskToleranceScore: number
} | null): number {
  if (!profile) return 0
  return (
    0.22 * profile.aggressionScore +
    0.28 * profile.activityScore +
    0.2 * profile.tradeFrequencyScore +
    0.1 * profile.waiverFocusScore +
    0.2 * profile.riskToleranceScore
  )
}

export async function buildBehaviorDramaContext(
  input: BehaviorDramaBridgeInput
): Promise<BehaviorDramaManagerContext[]> {
  const sport = normalizeOptionalSportForRelationship(input.sport)
  const profiles = await listProfilesByLeague(input.leagueId, {
    sport: sport ?? undefined,
    season: input.season ?? undefined,
    limit: 300,
  })
  const profileByManager = new Map(profiles.map((p) => [p.managerId, p]))
  const managers = uniq(input.managerIds?.length ? input.managerIds : profiles.map((p) => p.managerId))

  const rows = await Promise.all(
    managers.map(async (managerId) => {
      const profile = profileByManager.get(managerId) ?? null
      const dramaEvents = await listDramaEvents(input.leagueId, {
        sport: sport ?? undefined,
        season: input.season ?? undefined,
        relatedManagerId: managerId,
        limit: input.limitPerManager ?? 5,
      }).catch(() => [])
      return {
        managerId,
        profile,
        dramaEvents,
        behaviorHeat: calculateBehaviorHeat(profile),
      }
    })
  )

  return rows.sort((a, b) => b.behaviorHeat - a.behaviorHeat)
}
