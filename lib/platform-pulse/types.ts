/**
 * Platform Pulse (Dashboard V2 Phase 3.6) — the first cross-context intelligence
 * surface. A pure aggregation layer over intelligence the dashboard ALREADY holds,
 * producing a priority-ranked briefing of "what deserves my attention right now."
 *
 * The engine stays pure and i18n-free: it decides WHICH items matter and how they
 * rank, emitting a stable `kind` + interpolation `data`. The card localizes
 * `kind`/`data` into title/summary via `useLanguage`, so no translated strings
 * live in the engine and the ranking logic is deterministically testable.
 */
import type { TrajectorySummary } from '@/lib/trajectory/summarize'

/** The four Decision OS lenses (shared with the rest of Dashboard V2). */
export type PulseCategory = 'Predict' | 'Monitor' | 'Recommend' | 'Explain'

/** Stable item kinds the card maps to localized copy. */
export type PulseKind =
  | 'lineup_urgent' // empty / illegal / native-gap starter
  | 'injury_watch' // injured / questionable / doubtful starter
  | 'ai_recommendation' // ai_start_sit / ai_waiver / matchup_prep / war_room / weather
  | 'waiver_pickups' // cross-league waiver count
  | 'pending_trades' // cross-league pending-trade count
  | 'expiring_trade' // native trade expiring soon
  | 'draft_soon' // upcoming draft within the window
  | 'league_health_low' // a commissioned league's low sub-score
  | 'league_needs_attention' // worst-health league across (Global)

/** Interpolation data for the card to localize — never pre-rendered copy. */
export interface PulseData {
  leagueName?: string
  playerName?: string
  count?: number
  score?: number
  /** Which health sub-score, e.g. 'health' | 'engagement' | 'fairness' | 'sustainability'. */
  metric?: string
  /** Whole hours until an event (draft), for `draft_soon`. */
  hoursUntil?: number
}

export interface PlatformPulseItem {
  id: string
  kind: PulseKind
  category: PulseCategory
  /** Higher = more important. Used only for cross-signal ranking; not shown raw. */
  priority: number
  /** Stable source key the card localizes, e.g. 'StartSit', 'commissioner'. */
  source: string
  data: PulseData
  /** Source-provided confidence in [0, 1], only when real. Never fabricated. */
  confidence?: number
  /** Real trajectory when the source already has one; absent otherwise (no fake movement). */
  trajectory?: TrajectorySummary
  /** Real reasoning for the "Why?" affordance, or null. Never fabricated. */
  why?: string | null
  leagueId?: string
  leagueName?: string
}
