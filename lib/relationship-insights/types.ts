import type { DramaEventView } from '@/lib/drama-engine/DramaQueryService'
import type { RivalryRecordView } from '@/lib/rivalry-engine/RivalryQueryService'
import type { ManagerPsychProfileView } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'
import type { LeagueRelationshipProfile } from '@/lib/league-intelligence-graph'

export interface BehaviorDramaManagerContext {
  managerId: string
  profile: ManagerPsychProfileView | null
  dramaEvents: DramaEventView[]
  behaviorHeat: number
}

export interface UnifiedStorylineRecord {
  id: string
  headline: string
  sport: string
  season: number | null
  storylineScore: number
  rivalryId: string | null
  rivalryTier: string | null
  dramaEventId: string | null
  dramaType: string | null
  managerAId: string | null
  managerBId: string | null
  relatedManagerIds: string[]
  relatedTeamIds: string[]
  reasons: string[]
}

export interface UnifiedRelationshipInsights {
  leagueId: string
  sport: string | null
  season: number | null
  relationshipProfile: LeagueRelationshipProfile
  rivalries: RivalryRecordView[]
  profiles: ManagerPsychProfileView[]
  drama: DramaEventView[]
  behaviorDramaContext: BehaviorDramaManagerContext[]
  storylines: UnifiedStorylineRecord[]
}
