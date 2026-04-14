/**
 * Manager Edge Engine — Actionable Competitive Edge System
 *
 * Transforms existing psychological profiles, tendency data, and
 * opponent profiles into specific negotiation strategies, exploit
 * notes, and approach tactics. This is the "weapon" layer.
 *
 * Consumes: PsychologicalProfiles, ManagerTendencyProfile, OpponentProfile
 * Pure deterministic. No AI calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArchetypeBadge =
  | 'Shark'          // Low overpay, high accept rate — skilled negotiator
  | 'Gambler'        // High variance, takes risks
  | 'Fair Dealer'    // Even-handed, predictable
  | 'Taco'           // Overpays consistently
  | 'Hoarder'        // Rarely trades, holds assets
  | 'Impulsive'      // Reacts to news/injuries quickly
  | 'Patient Builder' // Long-term focus, accumulates picks
  | 'Win-Now Addict'  // Sacrifices future for present
  | 'Contrarian'      // Goes against consensus

export interface NegotiationTendencies {
  /** How likely to negotiate vs accept/reject quickly (0-100) */
  negotiationScore: number
  /** How likely to panic-trade after bad news (0-100) */
  panicLikelihood: number
  /** Tendency to buy high / chase recent performance (0-100) */
  buyHighTendency: number
  /** Tendency to sell low / dump after bad weeks (0-100) */
  sellLowTendency: number
  /** Bias toward rookies over proven vets (0-100, 50=neutral) */
  rookieBias: number
  /** Bias toward veterans over youth (0-100, 50=neutral) */
  veteranBias: number
  /** Overreaction to injury news (0-100) */
  injuryOverreaction: number
  /** General risk appetite (0-100) */
  riskAppetite: number
  /** Patience — willingness to wait for value (0-100) */
  patienceScore: number
  /** How quickly they respond to trade offers (0-100, higher=faster) */
  tradeResponsiveness: number
  /** How often they change their lineup (0-100, higher=more changes) */
  lineupVolatility: number
  /** Waiver wire aggression (0-100) */
  waiverAggression: number
}

export interface NegotiationTip {
  tip: string
  category: 'approach' | 'framing' | 'timing' | 'asset_preference' | 'avoid'
  confidence: 'high' | 'medium' | 'low'
}

export interface ExploitNote {
  description: string
  /** How reliably this exploit works (0-100) */
  reliability: number
  /** What type of exploit */
  type: 'overpay_tendency' | 'panic_window' | 'position_bias' | 'timing_weakness' | 'perception_gap' | 'structure_preference'
}

export interface CautionNote {
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface TraitRadarScores {
  aggression: number      // 0-100
  patience: number        // 0-100
  riskTaking: number      // 0-100
  negotiation: number     // 0-100
  marketAwareness: number // 0-100
  consistency: number     // 0-100
}

export interface ManagerEdgeProfile {
  managerId: string
  managerName: string
  leagueId: string

  // Badge
  archetype: ArchetypeBadge
  archetypeDescription: string

  // Tendencies
  tendencies: NegotiationTendencies

  // Trait radar
  traitRadar: TraitRadarScores

  // Actionable outputs
  negotiationTips: NegotiationTip[]
  exploitNotes: ExploitNote[]
  cautionNotes: CautionNote[]

  // Quick-reference
  likelyToValue: string[]    // assets/positions they overvalue
  likelyToUndervalue: string[] // assets/positions they undervalue
  bestApproachSummary: string  // 1-2 sentence approach guide
  commonMistakes: string[]

  // Meta
  sampleSize: number
  confidenceLevel: 'high' | 'medium' | 'low'
  computedAt: string
}

// ---------------------------------------------------------------------------
// Input (aggregated from existing systems)
// ---------------------------------------------------------------------------

export interface ManagerEdgeInput {
  managerId: string
  managerName: string
  leagueId: string
  /** From PsychologicalProfileEngine */
  profileLabels?: string[]
  aggressionScore?: number
  activityScore?: number
  tradeFrequencyScore?: number
  waiverFocusScore?: number
  riskToleranceScore?: number
  /** From ManagerTendencyEngine */
  starterPremium?: number
  positionBias?: Record<string, number>
  riskTolerance?: number
  consolidationBias?: number
  overpayThreshold?: number
  fairnessTolerance?: number
  sampleSize?: number
  /** From OpponentTendencies */
  rookieBias?: number
  buyLowHunter?: number
  tradeWillingness?: number
  loyaltyFactor?: number
  veteranLean?: number
  pitchAngles?: Array<{ angle: string; effectiveness: number; description: string }>
  /** From CrossLeagueReputation */
  crossLeagueArchetype?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function scale100(v: number | undefined, fallback = 50): number {
  if (v == null) return fallback
  return clamp(Math.round(v), 0, 100)
}

/** Convert -1..1 range to 0-100 */
function bipolarTo100(v: number | undefined, fallback = 50): number {
  if (v == null) return fallback
  return clamp(Math.round((v + 1) * 50), 0, 100)
}

// ---------------------------------------------------------------------------
// Archetype Detection
// ---------------------------------------------------------------------------

function detectArchetype(input: ManagerEdgeInput): { badge: ArchetypeBadge; description: string } {
  const labels = input.profileLabels ?? []
  const aggression = input.aggressionScore ?? 50
  const risk = input.riskToleranceScore ?? 50
  const tradeFreq = input.tradeFrequencyScore ?? 50
  const overpay = input.overpayThreshold ?? 0
  const crossArchetype = input.crossLeagueArchetype

  // Cross-league archetype takes priority if available
  if (crossArchetype === 'Shark') return { badge: 'Shark', description: 'Skilled negotiator who consistently gets the better end of trades. Rarely overpays.' }
  if (crossArchetype === 'Taco') return { badge: 'Taco', description: 'Consistently overpays in trades. Target for value extraction.' }
  if (crossArchetype === 'Gambler') return { badge: 'Gambler', description: 'Takes big risks for big rewards. Loves upside plays and will accept volatile trades.' }

  // Profile-label based
  if (labels.includes('aggressive') && tradeFreq >= 70) return { badge: 'Impulsive', description: 'Reacts quickly to news and events. Will make moves before thinking them through.' }
  if (labels.includes('conservative') && tradeFreq <= 30) return { badge: 'Hoarder', description: 'Rarely makes trades. Must be approached with compelling, safe offers.' }
  if (labels.includes('patient rebuilder')) return { badge: 'Patient Builder', description: 'Playing the long game. Values future assets and youth over win-now pieces.' }
  if (labels.includes('win-now') && aggression >= 60) return { badge: 'Win-Now Addict', description: 'Will overpay for proven starters. Sacrifices future for present production.' }
  if (labels.includes('value-first') && risk <= 40) return { badge: 'Fair Dealer', description: 'Seeks balanced trades. Will reject anything that feels unfair.' }
  if (labels.includes('chaos agent')) return { badge: 'Contrarian', description: 'Unpredictable. Makes unconventional moves that sometimes work out.' }

  // Score-based fallback
  if (overpay > 0.15) return { badge: 'Taco', description: 'History of overpaying in trades. Opportunity for value extraction.' }
  if (aggression >= 70 && risk >= 60) return { badge: 'Gambler', description: 'High risk tolerance. Open to volatile trade structures.' }
  if (aggression <= 30) return { badge: 'Hoarder', description: 'Low trade activity. Difficult to engage in negotiations.' }

  return { badge: 'Fair Dealer', description: 'Standard trading profile. Responds to fair market-value offers.' }
}

// ---------------------------------------------------------------------------
// Negotiation Tendencies
// ---------------------------------------------------------------------------

function computeNegotiationTendencies(input: ManagerEdgeInput): NegotiationTendencies {
  return {
    negotiationScore: scale100(input.tradeFrequencyScore, 50),
    panicLikelihood: input.aggressionScore != null && input.riskToleranceScore != null
      ? clamp(Math.round(input.aggressionScore * 0.4 + (100 - (input.riskToleranceScore ?? 50)) * 0.3 + (input.activityScore ?? 50) * 0.3), 0, 100)
      : 40,
    buyHighTendency: bipolarTo100(input.starterPremium, 50),
    sellLowTendency: input.overpayThreshold != null
      ? clamp(Math.round((1 - Math.abs(input.overpayThreshold)) * 100 * 0.5 + (input.aggressionScore ?? 50) * 0.5), 0, 100)
      : 40,
    rookieBias: scale100(input.rookieBias, 50),
    veteranBias: scale100(input.veteranLean != null ? input.veteranLean * 100 : undefined, 50),
    injuryOverreaction: input.aggressionScore != null
      ? clamp(Math.round(input.aggressionScore * 0.6 + (100 - (input.riskToleranceScore ?? 50)) * 0.4), 0, 100)
      : 40,
    riskAppetite: scale100(input.riskToleranceScore, 50),
    patienceScore: input.tradeFrequencyScore != null
      ? clamp(100 - input.tradeFrequencyScore, 0, 100)
      : 50,
    tradeResponsiveness: scale100(input.tradeWillingness != null ? input.tradeWillingness * 100 : undefined, 50),
    lineupVolatility: scale100(input.activityScore, 50),
    waiverAggression: scale100(input.waiverFocusScore, 50),
  }
}

// ---------------------------------------------------------------------------
// Trait Radar
// ---------------------------------------------------------------------------

function computeTraitRadar(tendencies: NegotiationTendencies, input: ManagerEdgeInput): TraitRadarScores {
  return {
    aggression: scale100(input.aggressionScore, 50),
    patience: tendencies.patienceScore,
    riskTaking: tendencies.riskAppetite,
    negotiation: tendencies.negotiationScore,
    marketAwareness: input.overpayThreshold != null
      ? clamp(Math.round(100 - Math.abs(input.overpayThreshold) * 200), 0, 100)
      : 50,
    consistency: 100 - Math.abs(tendencies.buyHighTendency - 50) - Math.abs(tendencies.sellLowTendency - 50),
  }
}

// ---------------------------------------------------------------------------
// Negotiation Tips
// ---------------------------------------------------------------------------

function buildNegotiationTips(input: ManagerEdgeInput, tendencies: NegotiationTendencies, archetype: ArchetypeBadge): NegotiationTip[] {
  const tips: NegotiationTip[] = []

  // Approach tips based on archetype
  switch (archetype) {
    case 'Shark':
      tips.push({ tip: 'Come prepared with data. This manager knows player values and won\'t accept lowball offers.', category: 'approach', confidence: 'high' })
      tips.push({ tip: 'Frame trades as mutually beneficial — they respect fair dealers.', category: 'framing', confidence: 'high' })
      break
    case 'Taco':
      tips.push({ tip: 'Lead with name-brand players they recognize. They value perceived star power over actual production.', category: 'framing', confidence: 'high' })
      tips.push({ tip: 'Offer in 2-for-1 structures — they like getting "more pieces."', category: 'approach', confidence: 'medium' })
      break
    case 'Gambler':
      tips.push({ tip: 'Include upside plays — they love ceiling over floor.', category: 'asset_preference', confidence: 'high' })
      tips.push({ tip: 'Frame picks as "lottery tickets" — they respond to upside language.', category: 'framing', confidence: 'medium' })
      break
    case 'Hoarder':
      tips.push({ tip: 'Be patient — they rarely trade but will engage if the offer is clearly in their favor.', category: 'timing', confidence: 'high' })
      tips.push({ tip: 'Offer safe, proven assets. They need to feel zero risk.', category: 'approach', confidence: 'high' })
      break
    case 'Impulsive':
      tips.push({ tip: 'Strike after breaking news — they react emotionally to injuries and depth chart changes.', category: 'timing', confidence: 'high' })
      tips.push({ tip: 'Send offers quickly after bad performance weeks — they\'ll sell low.', category: 'timing', confidence: 'medium' })
      break
    case 'Patient Builder':
      tips.push({ tip: 'Offer draft picks and young players — they value future over present.', category: 'asset_preference', confidence: 'high' })
      tips.push({ tip: 'Don\'t rush — they make deliberate decisions.', category: 'timing', confidence: 'high' })
      break
    case 'Win-Now Addict':
      tips.push({ tip: 'Offer proven starters in exchange for picks and youth — they\'ll overpay for immediate production.', category: 'approach', confidence: 'high' })
      tips.push({ tip: 'Frame assets by their current-week impact, not long-term value.', category: 'framing', confidence: 'medium' })
      break
    case 'Contrarian':
      tips.push({ tip: 'Conventional pitches won\'t work. Frame offers as unconventional or contrarian moves.', category: 'framing', confidence: 'medium' })
      break
    default:
      tips.push({ tip: 'Standard approach: lead with fair market-value offers grounded in data.', category: 'approach', confidence: 'medium' })
  }

  // Position bias tips
  const posBias = input.positionBias ?? {}
  const highBias = Object.entries(posBias).filter(([_, v]) => v > 0.15).sort((a, b) => b[1] - a[1])
  if (highBias.length > 0) {
    tips.push({
      tip: `They overvalue ${highBias.map(([p]) => p).join(', ')} — include these positions to make offers more appealing.`,
      category: 'asset_preference',
      confidence: 'high',
    })
  }

  // Pitch angles from opponent profile
  if (input.pitchAngles) {
    const topPitch = input.pitchAngles.sort((a, b) => b.effectiveness - a.effectiveness)[0]
    if (topPitch) {
      tips.push({
        tip: `Most effective pitch angle: "${topPitch.angle}" — ${topPitch.description}`,
        category: 'framing',
        confidence: topPitch.effectiveness >= 70 ? 'high' : 'medium',
      })
    }
  }

  return tips.slice(0, 6)
}

// ---------------------------------------------------------------------------
// Exploit & Caution Notes
// ---------------------------------------------------------------------------

function buildExploitNotes(input: ManagerEdgeInput, tendencies: NegotiationTendencies, archetype: ArchetypeBadge): ExploitNote[] {
  const exploits: ExploitNote[] = []

  if (tendencies.panicLikelihood >= 65) {
    exploits.push({
      description: 'Likely to panic-trade after bad news. Monitor for injury reactions and send offers immediately.',
      reliability: tendencies.panicLikelihood,
      type: 'panic_window',
    })
  }

  if (tendencies.buyHighTendency >= 65) {
    exploits.push({
      description: 'Chases recent performance. Sell them players coming off career weeks at inflated value.',
      reliability: tendencies.buyHighTendency,
      type: 'perception_gap',
    })
  }

  if (tendencies.sellLowTendency >= 60) {
    exploits.push({
      description: 'Dumps players after bad stretches. Buy low on their underperformers.',
      reliability: tendencies.sellLowTendency,
      type: 'panic_window',
    })
  }

  if (archetype === 'Taco') {
    exploits.push({
      description: 'Consistent overpayer. Target them for value extraction on any trade.',
      reliability: 85,
      type: 'overpay_tendency',
    })
  }

  if (archetype === 'Win-Now Addict') {
    exploits.push({
      description: 'Will sacrifice future value for present production. Sell them aging vets for picks.',
      reliability: 70,
      type: 'structure_preference',
    })
  }

  const posBias = input.positionBias ?? {}
  const overvalued = Object.entries(posBias).filter(([_, v]) => v > 0.2)
  if (overvalued.length > 0) {
    exploits.push({
      description: `Overvalues ${overvalued.map(([p]) => p).join(', ')} — include these to pad your side of trades.`,
      reliability: 60,
      type: 'position_bias',
    })
  }

  if (tendencies.injuryOverreaction >= 65) {
    exploits.push({
      description: 'Overreacts to injury news. Buy their injured players at discount during uncertainty windows.',
      reliability: tendencies.injuryOverreaction,
      type: 'timing_weakness',
    })
  }

  return exploits.sort((a, b) => b.reliability - a.reliability).slice(0, 5)
}

function buildCautionNotes(input: ManagerEdgeInput, tendencies: NegotiationTendencies, archetype: ArchetypeBadge): CautionNote[] {
  const cautions: CautionNote[] = []

  if (archetype === 'Shark') {
    cautions.push({ description: 'Elite negotiator — double-check every trade for hidden value extraction.', severity: 'high' })
  }

  if (tendencies.patienceScore >= 75) {
    cautions.push({ description: 'Very patient — offers may sit unanswered for days. Don\'t overreach with follow-up pressure.', severity: 'medium' })
  }

  if (archetype === 'Hoarder') {
    cautions.push({ description: 'Rarely trades. May reject reasonable offers simply because they prefer inaction.', severity: 'medium' })
  }

  if (archetype === 'Contrarian') {
    cautions.push({ description: 'Unpredictable decision-making. Conventional trade logic may not apply.', severity: 'medium' })
  }

  if (input.fairnessTolerance != null && input.fairnessTolerance < 0.15) {
    cautions.push({ description: 'Low fairness tolerance — even slightly lopsided offers will be rejected on principle.', severity: 'high' })
  }

  if (tendencies.tradeResponsiveness <= 25) {
    cautions.push({ description: 'Low trade responsiveness — may ignore or ghost trade offers entirely.', severity: 'low' })
  }

  return cautions.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Value / Undervalue Analysis
// ---------------------------------------------------------------------------

function computeValuePreferences(input: ManagerEdgeInput, tendencies: NegotiationTendencies): {
  likelyToValue: string[]
  likelyToUndervalue: string[]
} {
  const likelyToValue: string[] = []
  const likelyToUndervalue: string[] = []

  const posBias = input.positionBias ?? {}
  for (const [pos, bias] of Object.entries(posBias)) {
    if (bias > 0.15) likelyToValue.push(pos)
    if (bias < -0.15) likelyToUndervalue.push(pos)
  }

  if (tendencies.rookieBias >= 65) likelyToValue.push('Rookies')
  if (tendencies.rookieBias <= 35) likelyToUndervalue.push('Rookies')
  if (tendencies.veteranBias >= 65) likelyToValue.push('Veterans')
  if (tendencies.veteranBias <= 35) likelyToUndervalue.push('Veterans')

  if (input.consolidationBias != null && input.consolidationBias > 0.4) {
    likelyToValue.push('Consolidated star power')
    likelyToUndervalue.push('Multiple smaller assets')
  }

  if (input.starterPremium != null && input.starterPremium > 0.3) {
    likelyToValue.push('Proven starters')
    likelyToUndervalue.push('Draft picks')
  }

  return {
    likelyToValue: [...new Set(likelyToValue)],
    likelyToUndervalue: [...new Set(likelyToUndervalue)],
  }
}

function buildCommonMistakes(tendencies: NegotiationTendencies, archetype: ArchetypeBadge): string[] {
  const mistakes: string[] = []

  if (tendencies.buyHighTendency >= 60) mistakes.push('Buys high on recent performance — chases hot streaks')
  if (tendencies.sellLowTendency >= 60) mistakes.push('Sells low after bad weeks — reactive dumping')
  if (tendencies.panicLikelihood >= 60) mistakes.push('Panic-trades after injuries — doesn\'t wait for clarity')
  if (tendencies.injuryOverreaction >= 60) mistakes.push('Overreacts to injury designations before game-time decisions')
  if (archetype === 'Win-Now Addict') mistakes.push('Mortgages the future for marginal present upgrades')
  if (tendencies.waiverAggression >= 75) mistakes.push('Overspends FAAB on short-term pickups')
  if (tendencies.patienceScore <= 25) mistakes.push('Impatient — makes trades without exploring all options')

  return mistakes.slice(0, 4)
}

function buildApproachSummary(archetype: ArchetypeBadge, tendencies: NegotiationTendencies): string {
  switch (archetype) {
    case 'Shark': return 'Approach with data-backed, fair offers. They respect preparation and will reject lowballs. Be concise and professional.'
    case 'Taco': return 'Lead with name-brand players and 2-for-1 structures. They value quantity and perceived star power over actual production.'
    case 'Gambler': return 'Pitch upside and ceiling. Include speculative assets they\'ll find exciting. Frame trades as "swings for the fences."'
    case 'Hoarder': return 'Be patient and persistent. Send a strong, clearly favorable offer and wait. Follow up once, then move on.'
    case 'Impulsive': return 'Strike fast after breaking news. They trade on emotion — timing is everything. Send offers within 30 minutes of major events.'
    case 'Patient Builder': return 'Offer picks and young players. Respect their timeline. Frame trades as "building blocks" for their future.'
    case 'Win-Now Addict': return 'Sell them aging starters in exchange for picks. Frame everything by this-week impact. They\'ll overpay for proven production.'
    case 'Contrarian': return 'Think outside the box. Standard pitches won\'t work. Present unconventional angles and contrarian takes.'
    default: return 'Standard approach: fair market-value offers with clear data support.'
  }
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export function computeManagerEdgeProfile(input: ManagerEdgeInput): ManagerEdgeProfile {
  const { badge: archetype, description: archetypeDescription } = detectArchetype(input)
  const tendencies = computeNegotiationTendencies(input)
  const traitRadar = computeTraitRadar(tendencies, input)
  const negotiationTips = buildNegotiationTips(input, tendencies, archetype)
  const exploitNotes = buildExploitNotes(input, tendencies, archetype)
  const cautionNotes = buildCautionNotes(input, tendencies, archetype)
  const { likelyToValue, likelyToUndervalue } = computeValuePreferences(input, tendencies)
  const commonMistakes = buildCommonMistakes(tendencies, archetype)
  const bestApproachSummary = buildApproachSummary(archetype, tendencies)

  const sampleSize = input.sampleSize ?? 0
  const confidenceLevel: 'high' | 'medium' | 'low' =
    sampleSize >= 8 ? 'high' : sampleSize >= 3 ? 'medium' : 'low'

  return {
    managerId: input.managerId,
    managerName: input.managerName,
    leagueId: input.leagueId,
    archetype,
    archetypeDescription,
    tendencies,
    traitRadar,
    negotiationTips,
    exploitNotes,
    cautionNotes,
    likelyToValue,
    likelyToUndervalue,
    bestApproachSummary,
    commonMistakes,
    sampleSize,
    confidenceLevel,
    computedAt: new Date().toISOString(),
  }
}
