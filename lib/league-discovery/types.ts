/**
 * League Discovery AI — types for skill, sports, activity, and competition balance matching.
 */

/** User skill level for matching. */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/** Preferred league activity level. */
export type PreferredActivity = 'quiet' | 'moderate' | 'active'

/** Preferred competition balance (how even/competitive the league is). */
export type CompetitionBalance = 'casual' | 'balanced' | 'competitive'

export interface UserDiscoveryPreferences {
  skillLevel?: SkillLevel
  sportsPreferences?: string[]
  preferredActivity?: PreferredActivity
  competitionBalance?: CompetitionBalance
}

/** A league candidate to score and rank. */
export interface CandidateLeague {
  id: string
  name: string
  sport?: string
  leagueSize?: number
  scoring?: string
  isDynasty?: boolean
  /** Inferred or provided: quiet | moderate | active */
  activityLevel?: string
  /** Inferred or provided: casual | balanced | competitive */
  competitionSpread?: string
  memberCount?: number
  entryCount?: number
  joinCode?: string
  tournamentName?: string
  scoringMode?: string
  maxManagers?: number
  [key: string]: unknown
}

/** One suggested league with match score and AI-generated reasons. */
export interface LeagueMatchSuggestion {
  league: CandidateLeague
  matchScore: number
  reasons: string[]
  /** Short AI summary of why this league fits (1–2 sentences). */
  summary?: string
}

export interface DiscoverySuggestInput {
  preferences: UserDiscoveryPreferences
  candidates: CandidateLeague[]
}

export interface DiscoverySuggestResult {
  suggestions: LeagueMatchSuggestion[]
  generatedAt: string
}
