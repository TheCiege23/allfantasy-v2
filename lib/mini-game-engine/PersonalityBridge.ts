/**
 * Personality ↔ Mini-Game Bridge
 *
 * Connects the AI Personality Engine to the Mini-Game Engine.
 * Personality influences HOW AI Managers behave around mini-games,
 * but does NOT alter the fair scoring/results of the game itself.
 *
 * Personality affects:
 * - Pre-game: risk choices, participation willingness, strategic setup
 * - Post-game: power usage decisions, nomination targets, social reactions
 * - Narration: recap tone, confessional style, chat reactions
 *
 * Personality does NOT affect:
 * - Scoring formulas
 * - Tiebreaker resolution
 * - Official results
 * - Audit-logged outcomes
 */

import type { AIPersonalityProfile, PersonalityTraits } from '@/lib/ai-personality-engine/types'
import type { MiniGameDefinition, MiniGameRewardType } from './types'
import { getPersonalityProfile } from '@/lib/ai-personality-engine/PersonalityRegistry'

// ============================================================================
// PRE-GAME: How personality affects approach to a mini-game
// ============================================================================

export type PreGameDecision = {
  participationWillingness: number // 0-1, how eager to join optional games
  riskApproach: 'conservative' | 'moderate' | 'aggressive' | 'reckless'
  focusMetric: string | null // which scoring metric to optimize for
  teamworkWillingness: number // 0-1, for team/tribe games
  bluffBehavior: boolean // whether they'll misdirect opponents
}

export function getPreGameDecision(
  profile: AIPersonalityProfile,
  game: MiniGameDefinition,
): PreGameDecision {
  const t = profile.traits

  const riskApproach =
    t.riskTolerance > 0.8 ? 'reckless' as const :
    t.riskTolerance > 0.6 ? 'aggressive' as const :
    t.riskTolerance > 0.3 ? 'moderate' as const :
    'conservative' as const

  return {
    participationWillingness: (t.aggression + t.riskTolerance) / 2,
    riskApproach,
    focusMetric: game.scoringRules[0]?.metric ?? null,
    teamworkWillingness: t.allianceStrength,
    bluffBehavior: t.bluffTendency > 0.5,
  }
}

// ============================================================================
// POST-GAME: How personality affects power/reward usage
// ============================================================================

export type PostGameDecision = {
  useRewardImmediately: boolean
  saveRewardForLater: boolean
  targetSelection: 'strongest_opponent' | 'weakest_opponent' | 'personal_rival' | 'random' | 'strategic'
  publicReaction: string
  privateStrategy: string
}

export function getPostGamePowerUsage(
  profile: AIPersonalityProfile,
  reward: MiniGameRewardType,
  _context: { week: number; remainingPlayers: number },
): PostGameDecision {
  const t = profile.traits
  const archetype = profile.archetype

  // Immediate vs save decision
  const useNow =
    archetype === 'risk_taker' || archetype === 'chaos_agent' || archetype === 'villain'
      ? true
      : archetype === 'strategist' || archetype === 'safe_grinder'
        ? false
        : t.patience < 0.4

  // Target selection
  let target: PostGameDecision['targetSelection'] = 'strategic'
  if (archetype === 'villain' || t.revengeTendency > 0.7) target = 'personal_rival'
  else if (archetype === 'alpha' || t.aggression > 0.7) target = 'strongest_opponent'
  else if (archetype === 'chaos_agent') target = 'random'
  else if (archetype === 'underdog') target = 'strongest_opponent'

  // Reactions
  const reactions = getReactionMessages(profile)

  return {
    useRewardImmediately: useNow,
    saveRewardForLater: !useNow,
    targetSelection: target,
    publicReaction: reactions.win,
    privateStrategy: `${profile.displayName} is considering ${target} targeting with ${reward}.`,
  }
}

// ============================================================================
// SOCIAL DECISIONS: How personality affects nominations/votes/idols
// ============================================================================

export type SocialDecision = {
  nominationTargets: string[] // ordered preference
  voteTarget: string | null
  idolUsageLikelihood: number // 0-1
  betrayalLikelihood: number // 0-1
  allianceResponse: 'accept' | 'decline' | 'betray' | 'defer'
}

export function getSocialDecision(
  profile: AIPersonalityProfile,
  context: {
    nominees: string[]
    allies: string[]
    threats: string[]
    personalRivals: string[]
    weekNumber: number
    playersRemaining: number
  },
): SocialDecision {
  const t = profile.traits
  const sb = profile.socialBehavior

  // Nomination targeting
  const targets: string[] = []
  if (sb.targetSelection === 'personal' && context.personalRivals.length > 0) {
    targets.push(...context.personalRivals)
  } else if (sb.targetSelection === 'biggest_threat') {
    targets.push(...context.threats)
  } else if (sb.targetSelection === 'weakest') {
    // Reverse threat order
    targets.push(...[...context.threats].reverse())
  } else if (sb.targetSelection === 'random') {
    // Shuffle
    targets.push(...context.threats.sort(() => Math.random() - 0.5))
  } else {
    targets.push(...context.threats)
  }

  // Filter out allies (unless betrayal-prone)
  const filteredTargets = t.loyalty > 0.6
    ? targets.filter((t) => !context.allies.includes(t))
    : targets

  // Vote target (first non-ally nominee)
  const voteTarget = context.nominees.find((n) => !context.allies.includes(n) || t.loyalty < 0.3) ?? context.nominees[0] ?? null

  // Idol usage — more likely to play early if aggressive, late if conservative
  const endgameMultiplier = context.playersRemaining <= 5 ? 1.5 : 1
  const idolLikelihood = Math.min(1, t.riskTolerance * endgameMultiplier * (sb.idolUsage === 'reckless' ? 1.5 : sb.idolUsage === 'aggressive' ? 1.2 : sb.idolUsage === 'conservative' ? 0.5 : 0.8))

  // Alliance response
  const allianceResponse =
    sb.allianceFormation === 'eager' ? 'accept' as const :
    sb.allianceFormation === 'avoids' ? 'decline' as const :
    t.loyalty > 0.6 ? 'accept' as const :
    sb.betrayalLikelihood > 0.5 ? 'betray' as const :
    'defer' as const

  return {
    nominationTargets: filteredTargets.length > 0 ? filteredTargets : targets,
    voteTarget,
    idolUsageLikelihood: idolLikelihood,
    betrayalLikelihood: sb.betrayalLikelihood,
    allianceResponse,
  }
}

// ============================================================================
// NARRATION: How personality shapes recap/confessional tone
// ============================================================================

export type NarrationStyle = {
  tone: string
  confidence: number
  dramaLevel: number
  sampleWinLine: string
  sampleLossLine: string
  sampleNominationLine: string
  sampleConfessionalOpener: string
}

export function getNarrationStyle(profile: AIPersonalityProfile): NarrationStyle {
  const c = profile.communication
  return {
    tone: c.tone,
    confidence: c.confidence,
    dramaLevel: c.dramaLevel,
    sampleWinLine: c.winReaction,
    sampleLossLine: c.lossReaction,
    sampleNominationLine: profile.archetype === 'villain'
      ? 'Nothing personal. Actually, it is.'
      : profile.archetype === 'strategist'
        ? 'This is purely strategic positioning.'
        : profile.archetype === 'underdog'
          ? 'I had to do what\'s best for my game.'
          : 'Tough call, but someone has to go.',
    sampleConfessionalOpener: profile.archetype === 'villain'
      ? 'Let me explain why everyone should be worried...'
      : profile.archetype === 'fan_favorite'
        ? 'I just love this game so much...'
        : profile.archetype === 'silent_assassin'
          ? '...'
          : `As ${profile.displayName}, I see the board clearly.`,
  }
}

function getReactionMessages(profile: AIPersonalityProfile): { win: string; loss: string } {
  return {
    win: profile.communication.winReaction,
    loss: profile.communication.lossReaction,
  }
}

// ============================================================================
// DRAFT BEHAVIOR: How personality affects draft decisions
// ============================================================================

export type DraftPersonalityModifier = {
  reachThreshold: number // how far above ADP they'll reach
  queueAdherence: number // 0-1, how closely they follow queue
  positionPriority: string[] // ordered position targeting
  starChaseMultiplier: number // multiplier for star player value
  rookieBoostMultiplier: number // multiplier for rookie value
  auctionBidStyle: 'conservative' | 'aggressive' | 'strategic' | 'chaotic'
  nominationStyle: 'value' | 'disruptive' | 'strategic' | 'random'
}

export function getDraftModifiers(profile: AIPersonalityProfile): DraftPersonalityModifier {
  const db = profile.draftBehavior
  return {
    reachThreshold: db.reachFrequency * 15, // max ADP reach in picks
    queueAdherence: db.queueDiscipline,
    positionPriority: db.positionPriority,
    starChaseMultiplier: db.starPreference > 0.7 ? 1.3 : db.starPreference > 0.4 ? 1.0 : 0.8,
    rookieBoostMultiplier: db.rookieAggression > 0.7 ? 1.4 : db.rookieAggression > 0.4 ? 1.0 : 0.7,
    auctionBidStyle: db.auctionBidStyle,
    nominationStyle: db.nominationStyle,
  }
}

// ============================================================================
// LEAGUE FORMAT INTEGRATION MAP
// ============================================================================

export type FormatIntegration = {
  miniGameTrigger: string
  participantType: 'individual' | 'team' | 'tribe'
  rewardType: string
  penaltyType: string
  personalityAffects: string[]
  personalityDoesNotAffect: string[]
}

export const FORMAT_INTEGRATIONS: Record<string, FormatIntegration> = {
  big_brother: {
    miniGameTrigger: 'weekly_hoh_and_pov',
    participantType: 'individual',
    rewardType: 'hoh_power',
    penaltyType: 'nomination_risk',
    personalityAffects: ['nomination_targets', 'veto_decision', 'vote_pattern', 'alliance_behavior', 'jury_vote', 'public_reaction'],
    personalityDoesNotAffect: ['hoh_scoring', 'pov_scoring', 'vote_count', 'official_results'],
  },
  survivor: {
    miniGameTrigger: 'weekly_immunity_challenge',
    participantType: 'tribe',
    rewardType: 'immunity',
    penaltyType: 'tribal_council',
    personalityAffects: ['idol_usage', 'vote_target', 'alliance_formation', 'merge_strategy', 'jury_vote', 'public_reaction'],
    personalityDoesNotAffect: ['challenge_scoring', 'vote_count', 'idol_validity', 'official_results'],
  },
  guillotine: {
    miniGameTrigger: 'weekly_survival',
    participantType: 'individual',
    rewardType: 'safe_status',
    penaltyType: 'eviction_risk',
    personalityAffects: ['waiver_strategy', 'roster_decisions', 'public_reaction'],
    personalityDoesNotAffect: ['scoring', 'elimination_order', 'official_results'],
  },
  zombie: {
    miniGameTrigger: 'weekly_infection_check',
    participantType: 'individual',
    rewardType: 'temporary_power',
    penaltyType: 'challenge_loss',
    personalityAffects: ['ambush_targets', 'serum_usage', 'weapon_timing', 'public_reaction'],
    personalityDoesNotAffect: ['infection_scoring', 'matchup_results', 'official_results'],
  },
  tournament: {
    miniGameTrigger: 'round_advancement',
    participantType: 'individual',
    rewardType: 'draft_advantage',
    penaltyType: 'eviction_risk',
    personalityAffects: ['draft_strategy', 'trade_behavior', 'public_reaction'],
    personalityDoesNotAffect: ['standings', 'advancement_cutline', 'official_results'],
  },
}

export function getFormatIntegration(leagueType: string): FormatIntegration | undefined {
  return FORMAT_INTEGRATIONS[leagueType]
}
