/**
 * Decision OS — Phase 5.0 Behavioral Event Taxonomy.
 *
 * Finite, versioned set of canonical event types. Adding or removing a type requires a new ADR.
 * All taxonomy constants are pure data (no IO, no DB access) — safe to import anywhere.
 */

// ── Event type registry ──────────────────────────────────────────────────────

export const BEHAVIORAL_EVENT_TYPES = [
  // Roster
  'lineup_viewed',
  'lineup_saved',
  // Transaction
  'trade_created',
  'trade_accepted',
  'trade_rejected',
  'waiver_claim_created',
  'waiver_claim_processed',
  // Commissioner
  'commissioner_action',
  'rules_changed',
  // Engagement
  'league_opened',
  'live_scoring_opened',
  'recap_viewed',
  // Draft
  'draft_started',
  'draft_pick_made',
] as const

export type BehavioralEventType = (typeof BEHAVIORAL_EVENT_TYPES)[number]

// ── Source registry ──────────────────────────────────────────────────────────

export const BEHAVIORAL_EVENT_SOURCES = ['api', 'import', 'cron', 'system'] as const

export type BehavioralEventSource = (typeof BEHAVIORAL_EVENT_SOURCES)[number]

// ── Category taxonomy ────────────────────────────────────────────────────────

export type BehavioralEventCategory = 'roster' | 'transaction' | 'commissioner' | 'engagement' | 'draft'

/**
 * Each event type belongs to exactly one category.
 * The union of all category arrays must equal BEHAVIORAL_EVENT_TYPES (enforced by tests).
 */
export const BEHAVIORAL_EVENT_CATEGORIES: Readonly<Record<BehavioralEventCategory, readonly BehavioralEventType[]>> = {
  roster: ['lineup_viewed', 'lineup_saved'],
  transaction: ['trade_created', 'trade_accepted', 'trade_rejected', 'waiver_claim_created', 'waiver_claim_processed'],
  commissioner: ['commissioner_action', 'rules_changed'],
  engagement: ['league_opened', 'live_scoring_opened', 'recap_viewed'],
  draft: ['draft_started', 'draft_pick_made'],
}

// ── Human-readable labels ────────────────────────────────────────────────────

export const BEHAVIORAL_EVENT_LABELS: Readonly<Record<BehavioralEventType, string>> = {
  lineup_viewed: 'Lineup Viewed',
  lineup_saved: 'Lineup Saved',
  trade_created: 'Trade Created',
  trade_accepted: 'Trade Accepted',
  trade_rejected: 'Trade Rejected',
  waiver_claim_created: 'Waiver Claim Created',
  waiver_claim_processed: 'Waiver Claim Processed',
  commissioner_action: 'Commissioner Action',
  rules_changed: 'Rules Changed',
  league_opened: 'League Opened',
  live_scoring_opened: 'Live Scoring Opened',
  recap_viewed: 'Recap Viewed',
  draft_started: 'Draft Started',
  draft_pick_made: 'Draft Pick Made',
}

// ── Lookup helpers ───────────────────────────────────────────────────────────

/** Returns the category for a given event type, or null if the type is unregistered. */
export function getEventCategory(eventType: BehavioralEventType): BehavioralEventCategory | null {
  for (const [category, types] of Object.entries(BEHAVIORAL_EVENT_CATEGORIES) as [BehavioralEventCategory, readonly BehavioralEventType[]][]) {
    if (types.includes(eventType)) return category
  }
  return null
}

/** Returns true if the string is a registered behavioral event type. */
export function isBehavioralEventType(value: unknown): value is BehavioralEventType {
  return typeof value === 'string' && (BEHAVIORAL_EVENT_TYPES as readonly string[]).includes(value)
}

/** Returns true if the string is a registered behavioral event source. */
export function isBehavioralEventSource(value: unknown): value is BehavioralEventSource {
  return typeof value === 'string' && (BEHAVIORAL_EVENT_SOURCES as readonly string[]).includes(value)
}
