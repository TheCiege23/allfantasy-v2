/** Client-safe type for discovery league cards (no Prisma). */
export interface LeagueCard {
  id: string
  name: string
  joinCode: string
  sport: string
  challengeType?: string | null
  bracketType?: string | null
  season: number
  tournamentName: string
  tournamentId: string
  scoringMode: string
  isPaidLeague: boolean
  isPrivate: boolean
  memberCount: number
  entryCount: number
  maxManagers: number
  ownerName: string
  ownerAvatar: string | null
  joinUrl: string
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type ActivityPreference = 'quiet' | 'moderate' | 'active'
export type CompetitionBalancePreference = 'casual' | 'balanced' | 'competitive'

/** Candidate league shape for AI suggestion (preferences + list). */
export interface CandidateLeague {
  id: string
  name: string
  joinCode?: string
  sport?: string
  memberCount?: number
  entryCount?: number
  maxManagers?: number
  leagueSize?: number
  isDynasty?: boolean
  isPaidLeague?: boolean
  scoringMode?: string
  tournamentName?: string
  activityLevel?: string
  competitionSpread?: string
}

/** User discovery preferences for AI matching. */
export interface UserDiscoveryPreferences {
  skillLevel?: SkillLevel
  sportsPreferences?: string[]
  preferredActivity?: ActivityPreference
  competitionBalance?: CompetitionBalancePreference
}

export interface LeagueMatchSuggestion extends CandidateLeague {
  matchScore: number
  summary: string
  reasons: string[]
}

export interface SuggestLeaguesResult {
  suggestions: LeagueMatchSuggestion[]
  generatedAt: string
}
