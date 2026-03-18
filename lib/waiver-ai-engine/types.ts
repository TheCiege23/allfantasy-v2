/**
 * Types for the Waiver AI Engine (PROMPT 239).
 */

import type { WaiverRosterPlayer } from '@/lib/waiver-engine'
import type { TeamNeedsMap } from '@/lib/waiver-engine/team-needs'
import type { ScoredWaiverTarget } from '@/lib/waiver-engine/waiver-scoring'

export type { UserGoal } from '@/lib/waiver-engine/team-needs'

/** Input for the waiver AI suggestion engine. */
export type WaiverAIEngineInput = {
  roster?: WaiverRosterPlayer[] | null
  teamNeeds?: TeamNeedsMap | null
  rosterPositions?: string[]
  allLeagueRosters?: { players: WaiverRosterPlayer[] }[]
  currentWeek?: number
  goal?: 'win-now' | 'balanced' | 'rebuild'
  leagueSettings: {
    isSF?: boolean
    isTEP?: boolean
    numTeams?: number
    isDynasty?: boolean
  }
  availablePlayers: Array<{
    playerId?: string
    id?: string
    playerName?: string
    name?: string
    position?: string
    team?: string | null
    age?: number | null
    value?: number
    assetValue?: { impactValue?: number; marketValue?: number; vorpValue?: number; volatility?: number }
    source?: string
  }>
  maxResults?: number
}

/** Result of suggestWaiverPickups. */
export type WaiverSuggestionsResult = {
  suggestions: ScoredWaiverTarget[]
}
