/**
 * T4 Commissioner Trade Review engine — pure, deterministic, rule-based. No AI, no auto-veto, no
 * value changes, no collusion language. Consumes existing T2 snapshot + asset/profile/settings data
 * and emits a review summary + transparent flags + non-accusatory notes.
 */

import type { CommissionerReview, ContextFlag, ReviewSummary, RiskFlag } from './types'
import type { MarketContext } from './types'
import type { TeamProfile } from '@/lib/trade-value/types'

const FAIRNESS_DELTA_HIGH = 70 // fairness below this = notable value imbalance
const CONFIDENCE_LOW = 60
const FAAB_IMBALANCE_MIN = 20

export interface ReviewAsset {
  kind: string // player | draft_pick | faab | future_consideration
  fromRosterId: string
  toRosterId: string
  position?: string | null
  faabAmount?: number | null
}

export interface CommissionerReviewInput {
  proposerRosterId: string
  receiverRosterId: string
  status: string
  vetoMode: string
  vetoThreshold: number | null
  sport: string
  currentWeek: number | null
  settings: { tradeReviewHours: number | null; tradeDeadlineWeek: number | null; draftPickTrading: boolean }
  snapshot: { grade: string; fairnessScore: number; confidenceScore: number; valueDifference: number; sideTotals: Array<{ rosterId: string; total: number }> } | null
  assets: ReviewAsset[]
  proposerProfile?: TeamProfile | null
  receiverProfile?: TeamProfile | null
  hasMarketEvents: boolean
  marketContext: MarketContext
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

/** Assets a roster RECEIVES (assets whose toRosterId === rosterId). */
function received(assets: ReviewAsset[], rosterId: string) {
  return assets.filter((a) => a.toRosterId === rosterId)
}
function sent(assets: ReviewAsset[], rosterId: string) {
  return assets.filter((a) => a.fromRosterId === rosterId)
}

export function detectRiskFlags(input: CommissionerReviewInput): RiskFlag[] {
  const flags: RiskFlag[] = []
  const snap = input.snapshot

  if (!snap) flags.push('VALUE_SNAPSHOT_MISSING')
  if (snap && snap.fairnessScore < FAIRNESS_DELTA_HIGH) flags.push('VALUE_DELTA_HIGH')
  if (snap && snap.confidenceScore < CONFIDENCE_LOW) flags.push('LOW_CONFIDENCE_VALUES')

  const proposerSends = sent(input.assets, input.proposerRosterId)
  const receiverSends = sent(input.assets, input.receiverRosterId)
  if (proposerSends.length === 0 || receiverSends.length === 0) flags.push('ONE_SIDE_EMPTY')

  const faabBy = (rosterId: string) =>
    sent(input.assets, rosterId)
      .filter((a) => a.kind === 'faab')
      .reduce((s, a) => s + (a.faabAmount ?? 0), 0)
  const pFaab = faabBy(input.proposerRosterId)
  const rFaab = faabBy(input.receiverRosterId)
  if (Math.abs(pFaab - rFaab) >= FAAB_IMBALANCE_MIN && (pFaab === 0 || rFaab === 0)) flags.push('FAAB_IMBALANCE')

  if (input.assets.some((a) => a.kind === 'draft_pick')) flags.push('DRAFT_PICK_INCLUDED')

  if (
    input.settings.tradeDeadlineWeek != null &&
    input.currentWeek != null &&
    input.currentWeek >= input.settings.tradeDeadlineWeek - 1 &&
    input.currentWeek <= input.settings.tradeDeadlineWeek
  ) {
    flags.push('DEADLINE_NEAR')
  }

  if (input.status === 'accepted') flags.push('TRADE_ALREADY_ACCEPTED')
  if (input.status === 'vetoed') flags.push('TRADE_ALREADY_VETOED')
  if (!input.hasMarketEvents) flags.push('MARKET_EVENT_HISTORY_MISSING')

  return flags
}

export function detectContextFlags(input: CommissionerReviewInput): ContextFlag[] {
  const flags: ContextFlag[] = []
  if (input.sport === 'NCAAF') flags.push('NCAAF_LIMITED_DATA')

  const sides: Array<{ rosterId: string; profile?: TeamProfile | null }> = [
    { rosterId: input.proposerRosterId, profile: input.proposerProfile },
    { rosterId: input.receiverRosterId, profile: input.receiverProfile },
  ]

  for (const { rosterId, profile } of sides) {
    if (!profile) continue
    const recv = received(input.assets, rosterId)
    const sentAssets = sent(input.assets, rosterId)
    const recvPlayers = recv.filter((a) => a.kind === 'player')
    const recvFutureValue = recv.some((a) => a.kind === 'draft_pick' || a.kind === 'faab')

    if (profile.stance === 'contender' && recvPlayers.length > 0) {
      if (!flags.includes('CONTENDER_BUYING_POINTS')) flags.push('CONTENDER_BUYING_POINTS')
    }
    if (profile.stance === 'rebuilder' && recvFutureValue) {
      if (!flags.includes('REBUILDER_ACQUIRING_FUTURE_VALUE')) flags.push('REBUILDER_ACQUIRING_FUTURE_VALUE')
    }
    if (
      profile.weakPositions.length &&
      recvPlayers.some((a) => a.position && profile.weakPositions.includes(a.position.toUpperCase()))
    ) {
      if (!flags.includes('POSITION_NEED_FILLED')) flags.push('POSITION_NEED_FILLED')
    }
    // Depth loss: sends 2+ players and receives 1 or fewer.
    if (sentAssets.filter((a) => a.kind === 'player').length >= 2 && recvPlayers.length <= 1) {
      if (!flags.includes('DEPTH_LOSS_WARNING')) flags.push('DEPTH_LOSS_WARNING')
    }
  }

  return flags
}

const NOTE_TEMPLATES: Partial<Record<RiskFlag | ContextFlag, string>> = {
  VALUE_DELTA_HIGH: 'Manual review suggested: value difference is high.',
  LOW_CONFIDENCE_VALUES: 'Low confidence data — some assets lacked projections.',
  ONE_SIDE_EMPTY: 'One side of this trade has no assets.',
  FAAB_IMBALANCE: 'FAAB is sent by only one side.',
  DEADLINE_NEAR: 'Trade deadline is near.',
  CONTENDER_BUYING_POINTS: 'A contending team is acquiring win-now production.',
  REBUILDER_ACQUIRING_FUTURE_VALUE: 'A rebuilding team is acquiring future value.',
  POSITION_NEED_FILLED: 'This trade may still make sense — it fills a positional need.',
  DEPTH_LOSS_WARNING: 'A team is thinning depth at a position.',
  NCAAF_LIMITED_DATA: 'NCAAF has limited valuation data — interpret values cautiously.',
}

export function buildCommissionerTradeReview(input: CommissionerReviewInput): CommissionerReview {
  const snap = input.snapshot
  const fairnessScore = snap?.fairnessScore ?? 0
  const confidenceScore = snap?.confidenceScore ?? 0
  const valueDelta = snap?.valueDifference ?? 0

  const riskFlags = detectRiskFlags(input)
  const contextFlags = detectContextFlags(input)

  const lopsided = Boolean(snap && fairnessScore < 60)
  const expired = input.status === 'expired'
  const deadlineFlag = riskFlags.includes('DEADLINE_NEAR')

  // Transparent composite (documented): 60% fairness + 40% confidence, no snapshot ⇒ 0.
  const reviewScore = snap ? Math.round(0.6 * fairnessScore + 0.4 * confidenceScore) : 0

  const reviewRecommended =
    input.status === 'pending' &&
    (riskFlags.includes('VALUE_DELTA_HIGH') ||
      riskFlags.includes('LOW_CONFIDENCE_VALUES') ||
      riskFlags.includes('ONE_SIDE_EMPTY') ||
      riskFlags.includes('FAAB_IMBALANCE') ||
      riskFlags.includes('VALUE_SNAPSHOT_MISSING'))

  const summary: ReviewSummary = {
    reviewScore,
    fairnessScore,
    confidenceScore,
    valueDelta,
    grade: snap?.grade ?? null,
    status: input.status,
    reviewRecommended,
    lopsided,
    deadlineFlag,
    expired,
    vetoMode: input.vetoMode,
    reviewHours: input.settings.tradeReviewHours,
  }

  const notes: string[] = []
  for (const f of [...riskFlags, ...contextFlags]) {
    const t = NOTE_TEMPLATES[f]
    if (t && !notes.includes(t)) notes.push(t)
  }
  if (input.marketContext.sampleSize === 0 && input.marketContext.message) {
    notes.push(input.marketContext.message)
  }

  return { summary, riskFlags, contextFlags, notes, marketContext: input.marketContext }
}
