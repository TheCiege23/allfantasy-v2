import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeDraftPlayer } from './normalize-draft-player'
import type { DraftSport, PlayerDisplayModel } from './types'

export function buildDraftPlayerDisplayModel(input: {
  playerName: string
  position: string
  team?: string | null
  sport?: string | null
  playerId?: string | null
  byeWeek?: number | null
  injuryStatus?: string | null
  adp?: number | null
  secondaryPositions?: string[] | null
  positionEligibility?: string[] | null
  teamAffiliation?: string | null
  collegeOrPipeline?: string | null
  isDevy?: boolean
  school?: string | null
  draftEligibleYear?: number | null
  graduatedToNFL?: boolean
  poolType?: 'college' | 'pro'
}): PlayerDisplayModel {
  const sport = normalizeToSupportedSport(input.sport ?? DEFAULT_SPORT) as DraftSport
  const normalized = normalizeDraftPlayer(
    {
      name: input.playerName,
      position: input.position,
      team: input.team ?? null,
      playerId: input.playerId ?? null,
      byeWeek: input.byeWeek ?? null,
      injuryStatus: input.injuryStatus ?? null,
      adp: input.adp ?? null,
      secondaryPositions: input.secondaryPositions ?? null,
      positionEligibility: input.positionEligibility ?? null,
      collegeOrPipeline: input.collegeOrPipeline ?? null,
      teamAffiliation: input.teamAffiliation ?? null,
      isDevy: input.isDevy,
      school: input.school ?? null,
      draftEligibleYear: input.draftEligibleYear ?? null,
      graduatedToNFL: input.graduatedToNFL,
      poolType: input.poolType,
    },
    sport,
  )
  const display = normalized.display
  if (input.teamAffiliation != null && input.teamAffiliation.trim()) {
    display.metadata.teamAffiliation = input.teamAffiliation.trim()
  }
  return display
}
