/**
 * Decision OS — Phase 5.0 Behavioral Event type contract.
 *
 * Provider-agnostic, origin-blind canonical event shapes. Nothing here performs IO.
 * Each event is a typed, immutable record of something that happened in a league.
 *
 * Architecture invariants (ADR_PHASE5_0_BEHAVIORAL_EVENT_FOUNDATION.md):
 *   P1 — provider identity lives in provenance only, never in event shapes or metadata keys
 *   P2 — every null field is genuinely unknown; nothing is fabricated to fill a gap
 *   P3 — events flow INTO intelligence; intelligence never generates or modifies events
 */

import type { BehavioralEventSource, BehavioralEventType } from './taxonomy'

// ── Provenance ───────────────────────────────────────────────────────────────

/**
 * Origin metadata for an event — NEVER consumed by decision logic.
 * Used only for debugging, telemetry, and deduplication.
 */
export interface BehavioralEventProvenance {
  /** Provider name ('sleeper', 'espn', etc.) or null for native/system events. */
  provider: string | null
  /** The provider's own ID for this event — used for import deduplication. */
  sourceId: string | null
  /** When this event was imported from the provider. Null for real-time (api/cron/system) events. */
  importedAt: string | null
  /** Which canonical DB tables/sources this event was derived from. */
  derivedFrom: string[]
}

// ── Uncertainty ──────────────────────────────────────────────────────────────

export interface BehavioralEventUncertainty {
  /**
   * Which fields have uncertain values (e.g., ['occurredAt', 'managerId']).
   * Empty array = full confidence in all fields.
   */
  sources: string[]
  /**
   * Confidence in the `occurredAt` timestamp.
   *   'exact'       — system time of the event
   *   'approximate' — derived from a related record; may be off by seconds to hours
   *   'unknown'     — best-guess or placeholder
   */
  timestampConfidence: 'exact' | 'approximate' | 'unknown'
  /**
   * Confidence in `managerId`.
   *   'confirmed' — authenticated user who performed the action
   *   'inferred'  — matched by roster ownership or similar heuristic
   *   'unknown'   — actor cannot be determined
   */
  actorConfidence: 'confirmed' | 'inferred' | 'unknown'
}

// ── Per-event metadata interfaces ────────────────────────────────────────────
// Each interface is the exact payload for one event type. Fields are nullable when
// they may be absent (import gaps, system events, provider variations).

/** lineup_viewed — manager opened the lineup editor */
export interface LineupViewedMetadata {
  week: number | null
  season: number | null
  leagueType: 'redraft' | 'dynasty' | null
}

/** lineup_saved — manager committed lineup changes */
export interface LineupSavedMetadata {
  week: number | null
  season: number | null
  leagueType: 'redraft' | 'dynasty' | null
  /** Number of starter slot changes made in this save. */
  slotChanges: number
  startedPlayerIds: string[]
  benchedPlayerIds: string[]
}

/** trade_created — trade proposal submitted */
export interface TradeCreatedMetadata {
  proposalId: string
  proposerRosterId: string
  receiverRosterId: string
  assetCount: number
  vetoMode: 'commissioner' | 'league_vote' | 'no_veto' | null
  expiresAt: string | null
}

/** trade_accepted — trade proposal accepted by receiver */
export interface TradeAcceptedMetadata {
  proposalId: string
  acceptorRosterId: string
  assetCount: number
}

/** trade_rejected — trade proposal rejected or vetoed */
export interface TradeRejectedMetadata {
  proposalId: string
  rejectorRosterId: string
  /** Reason given by the rejector or commissioner, if provided. */
  rejectionReason: string | null
}

/** waiver_claim_created — waiver claim submitted by a manager */
export interface WaiverClaimCreatedMetadata {
  claimId: string
  addPlayerId: string | null
  addPlayerName: string | null
  dropPlayerId: string | null
  dropPlayerName: string | null
  /** FAAB bid amount; null for priority-based leagues. */
  bidAmount: number | null
  /** Waiver priority position; null for FAAB leagues. */
  priority: number | null
  waiverType: 'faab' | 'priority' | null
}

/** waiver_claim_processed — waiver wire ran; claim awarded or denied */
export interface WaiverClaimProcessedMetadata {
  claimId: string
  outcome: 'awarded' | 'denied'
  denialReason: string | null
  addPlayerId: string | null
  dropPlayerId: string | null
  bidAmount: number | null
  priority: number | null
}

/** commissioner_action — commissioner performed a hub action */
export interface CommissionerActionMetadata {
  /** Canonical action key matching the Commissioner Hub action taxonomy. */
  actionKey: string
  actionLabel: string | null
  targetRosterId: string | null
  targetPlayerId: string | null
  week: number | null
  reason: string | null
}

/** rules_changed — league settings or rules modified */
export interface RulesChangedMetadata {
  /** Which setting keys changed (provider-agnostic key names from canonical league settings). */
  changedKeys: string[]
  /** Broad category of the change ('scoring', 'roster', 'waiver', 'trade', 'schedule', 'other'). */
  settingCategory: string | null
}

/** league_opened — manager opened any league surface */
export interface LeagueOpenedMetadata {
  /** Which surface was opened ('overview', 'standings', 'roster', 'settings', etc.). */
  surface: string | null
}

/** live_scoring_opened — manager opened the live scoring view */
export interface LiveScoringOpenedMetadata {
  week: number | null
  matchupId: string | null
}

/** recap_viewed — manager viewed a week recap or matchup result */
export interface RecapViewedMetadata {
  week: number | null
  matchupId: string | null
}

/** draft_started — draft began */
export interface DraftStartedMetadata {
  draftId: string | null
  draftType: 'snake' | 'linear' | 'auction' | null
  totalPicks: number | null
  totalManagers: number | null
}

/** draft_pick_made — a pick was made during a draft */
export interface DraftPickMadeMetadata {
  draftId: string | null
  pickNumber: number
  overallPick: number
  round: number | null
  playerId: string | null
  playerName: string | null
  position: string | null
  team: string | null
}

// ── Metadata map (eventType → metadata interface) ────────────────────────────

export interface BehavioralEventMetadataMap {
  lineup_viewed: LineupViewedMetadata
  lineup_saved: LineupSavedMetadata
  trade_created: TradeCreatedMetadata
  trade_accepted: TradeAcceptedMetadata
  trade_rejected: TradeRejectedMetadata
  waiver_claim_created: WaiverClaimCreatedMetadata
  waiver_claim_processed: WaiverClaimProcessedMetadata
  commissioner_action: CommissionerActionMetadata
  rules_changed: RulesChangedMetadata
  league_opened: LeagueOpenedMetadata
  live_scoring_opened: LiveScoringOpenedMetadata
  recap_viewed: RecapViewedMetadata
  draft_started: DraftStartedMetadata
  draft_pick_made: DraftPickMadeMetadata
}

// ── Base event (common fields on every event) ────────────────────────────────

interface BaseBehavioralEvent {
  /** Canonical unique ID for this event (UUID or deterministic hash). */
  eventId: string
  /** When the underlying action occurred (ISO 8601). See `uncertainty.timestampConfidence`. */
  occurredAt: string
  /** When this event was recorded in the AllFantasy system (ISO 8601). Always present. */
  recordedAt: string
  /** Canonical AllFantasy league ID. */
  leagueId: string
  /** Canonical AllFantasy manager/user ID, or null for system events. */
  managerId: string | null
  /** How this event was recorded: api | import | cron | system. */
  source: BehavioralEventSource
  /** Origin metadata — provenance only, never consumed by decision logic. */
  provenance: BehavioralEventProvenance
  /**
   * Honest completeness score 0–100.
   * 100 = all fields present with full confidence.
   * Degrades for null managerId (−20), approximate timestamp (−10), missing metadata fields (−10 each).
   */
  completeness: number
  /** What is uncertain about this event. */
  uncertainty: BehavioralEventUncertainty
}

// ── Canonical discriminated union ────────────────────────────────────────────

/**
 * The canonical behavioral event. A discriminated union on `eventType` — TypeScript narrows
 * `event.metadata` to the correct per-event interface when `event.eventType` is known.
 *
 * @example
 * if (event.eventType === 'trade_created') {
 *   event.metadata.proposalId  // typed as string
 * }
 */
export type BehavioralEvent = {
  [K in BehavioralEventType]: BaseBehavioralEvent & {
    eventType: K
    metadata: BehavioralEventMetadataMap[K]
  }
}[BehavioralEventType]

// ── Convenience accessor ─────────────────────────────────────────────────────

/** Narrow a BehavioralEvent to a specific event type. */
export type BehavioralEventOf<T extends BehavioralEventType> = Extract<BehavioralEvent, { eventType: T }>

// ── Runtime type guard ───────────────────────────────────────────────────────

import { isBehavioralEventType, isBehavioralEventSource } from './taxonomy'

/**
 * Runtime type guard for BehavioralEvent. Validates structural shape only —
 * does NOT validate per-event metadata fields (those are enforced by the assembler/port).
 */
export function isBehavioralEvent(value: unknown): value is BehavioralEvent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['eventId'] === 'string' &&
    isBehavioralEventType(v['eventType']) &&
    typeof v['occurredAt'] === 'string' &&
    typeof v['recordedAt'] === 'string' &&
    typeof v['leagueId'] === 'string' &&
    (v['managerId'] === null || typeof v['managerId'] === 'string') &&
    isBehavioralEventSource(v['source']) &&
    typeof v['provenance'] === 'object' && v['provenance'] !== null &&
    typeof v['completeness'] === 'number' &&
    v['completeness'] >= 0 && v['completeness'] <= 100 &&
    typeof v['uncertainty'] === 'object' && v['uncertainty'] !== null &&
    typeof v['metadata'] === 'object' && v['metadata'] !== null
  )
}

// ── Completeness helpers ─────────────────────────────────────────────────────

/** Clamp a completeness score to the valid [0, 100] range. */
export function clampCompleteness(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * Compute a completeness score for an event given what is known.
 * Starts at 100 and deducts for missing or uncertain fields.
 */
export function computeEventCompleteness(opts: {
  hasManagerId: boolean
  timestampConfidence: BehavioralEventUncertainty['timestampConfidence']
  hasProvider: boolean
  missingMetadataFieldCount: number
}): number {
  let score = 100
  if (!opts.hasManagerId) score -= 20
  if (opts.timestampConfidence === 'approximate') score -= 10
  if (opts.timestampConfidence === 'unknown') score -= 30
  if (!opts.hasProvider) score -= 10
  score -= opts.missingMetadataFieldCount * 10
  return clampCompleteness(score)
}

// ── Provenance / uncertainty factory helpers ─────────────────────────────────

/** Returns a minimal provenance for a system-generated native event. */
export function makeSystemProvenance(derivedFrom: string[]): BehavioralEventProvenance {
  return { provider: null, sourceId: null, importedAt: null, derivedFrom }
}

/** Returns a provenance for an event imported from an external provider. */
export function makeImportedProvenance(
  provider: string,
  sourceId: string | null,
  importedAt: string,
  derivedFrom: string[],
): BehavioralEventProvenance {
  return { provider, sourceId, importedAt, derivedFrom }
}

/** Returns the maximum-uncertainty value (all fields unknown). */
export function makeMaxUncertainty(): BehavioralEventUncertainty {
  return { sources: ['occurredAt', 'managerId'], timestampConfidence: 'unknown', actorConfidence: 'unknown' }
}

/** Returns the minimum-uncertainty value (all fields confirmed). */
export function makeMinUncertainty(): BehavioralEventUncertainty {
  return { sources: [], timestampConfidence: 'exact', actorConfidence: 'confirmed' }
}
