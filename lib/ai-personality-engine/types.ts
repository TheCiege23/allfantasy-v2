/**
 * AI Personality Engine — Core Types
 *
 * Powers AI Manager behavior, social league characters,
 * and narrative generation across all AllFantasy formats.
 *
 * IMPORTANT: AI Managers are NOT Chimmy.
 * Chimmy = user-facing assistant
 * AI Managers = independent game participants
 */

// ============================================================================
// ARCHETYPES
// ============================================================================

export type PersonalityArchetype =
  | 'villain'
  | 'strategist'
  | 'underdog'
  | 'alpha'
  | 'wildcard'
  | 'risk_taker'
  | 'safe_grinder'
  | 'chaos_agent'
  | 'alliance_builder'
  | 'loner'
  | 'value_hunter'
  | 'win_now'
  | 'rebuilder'
  | 'rookie_believer'
  | 'veteran_loyalist'
  | 'defensive_specialist'
  | 'positional_purist'
  | 'storyline_star'
  | 'silent_assassin'
  | 'fan_favorite'

// ============================================================================
// TRAITS (0.0 to 1.0 scale)
// ============================================================================

export interface PersonalityTraits {
  aggression: number
  patience: number
  loyalty: number
  flexibility: number
  randomness: number
  greed: number
  riskTolerance: number
  longTermThinking: number
  emotionalVolatility: number
  narrativeBias: number
  projectionTrust: number
  rookieBias: number
  starPlayerBias: number
  scarcityAwareness: number
  revengeTendency: number
  allianceStrength: number
  bluffTendency: number
  consistencyLevel: number
}

// ============================================================================
// COMMUNICATION STYLE
// ============================================================================

export interface CommunicationStyle {
  tone: 'sharp' | 'calm' | 'energetic' | 'humble' | 'provocative' | 'analytical' | 'cryptic'
  confidence: number // 0-1
  snarkLevel: number // 0-1
  dramaLevel: number // 0-1
  seriousness: number // 0-1
  responseLength: 'terse' | 'moderate' | 'verbose'
  trashTalkStyle: 'none' | 'subtle' | 'bold' | 'relentless'
  celebrationStyle: 'silent' | 'humble' | 'loud' | 'over_the_top'
  winReaction: string
  lossReaction: string
}

// ============================================================================
// BEHAVIOR TENDENCIES
// ============================================================================

export interface DraftBehavior {
  reachFrequency: number // 0-1, how often they reach above ADP
  queueDiscipline: number // 0-1, how closely they follow their queue
  positionPriority: string[] // ordered position targeting
  starPreference: number // 0-1, stars-and-scrubs vs balanced
  rookieAggression: number // 0-1, how much they target rookies
  auctionBidStyle: 'conservative' | 'aggressive' | 'strategic' | 'chaotic'
  nominationStyle: 'value' | 'disruptive' | 'strategic' | 'random'
}

export interface SocialBehavior {
  allianceFormation: 'eager' | 'selective' | 'reluctant' | 'avoids'
  votePattern: 'strategic' | 'emotional' | 'loyal' | 'unpredictable'
  targetSelection: 'strongest' | 'weakest' | 'biggest_threat' | 'personal' | 'random'
  idolUsage: 'conservative' | 'strategic' | 'aggressive' | 'reckless'
  nominationApproach: 'calculated' | 'bold' | 'safe' | 'chaotic'
  betrayalLikelihood: number // 0-1
  juryBehavior: 'strategic' | 'emotional' | 'bitter' | 'fair'
}

export interface RosterBehavior {
  waiverActivity: 'passive' | 'moderate' | 'active' | 'hyperactive'
  tradeFrequency: 'never' | 'rare' | 'moderate' | 'frequent' | 'constant'
  tradeStyle: 'buyer' | 'seller' | 'balanced' | 'opportunistic'
  lineupOptimization: 'set_and_forget' | 'weekly_tuner' | 'daily_optimizer'
  cutAggressiveness: number // 0-1
}

// ============================================================================
// VISUAL IDENTITY
// ============================================================================

export interface VisualIdentity {
  nameStyle: 'professional' | 'casual' | 'dramatic' | 'mysterious' | 'playful'
  avatarStyle: 'classic' | 'dark' | 'bright' | 'glitch' | 'minimal'
  badgeLabel: string | null
  badgeColor: string | null
  teamBrandingFlavor: string | null
  introCardStyle: 'standard' | 'dramatic' | 'minimal' | 'flashy'
  archetypeIcon: string
}

// ============================================================================
// FULL PERSONALITY PROFILE
// ============================================================================

export interface AIPersonalityProfile {
  id: string
  archetype: PersonalityArchetype
  displayName: string
  summary: string
  traits: PersonalityTraits
  communication: CommunicationStyle
  draftBehavior: DraftBehavior
  socialBehavior: SocialBehavior
  rosterBehavior: RosterBehavior
  visual: VisualIdentity
  strengths: string[]
  weaknesses: string[]
  intensity: number // 0-1, how strongly personality affects decisions
}

// ============================================================================
// EVOLUTION
// ============================================================================

export interface PersonalityEvolution {
  fromArchetype: PersonalityArchetype
  toArchetype: PersonalityArchetype
  trigger: string
  reason: string
  week: number
  season: number
}
