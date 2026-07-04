/**
 * Decision OS — Phase 5.1 Behavioral Event Assembler.
 *
 * Pure aggregation: BehavioralEvent[] → ManagerBehavioralFacts / LeagueBehavioralFacts.
 * No IO, no DB access, no Prisma imports. Inputs are never mutated.
 *
 * Architecture invariants:
 * - All counts are 0 (never null) when no events of that type are present
 * - Completeness is 0 when there are no events (not fabricated)
 * - Warnings are additive and honest
 * - `assembleManagerBehavioralFacts` filters the event stream to `input.managerId`
 * - `assembleLeagueBehavioralFacts` expects all manager events merged into one array
 */

import type { BehavioralEvent, BehavioralEventOf } from './events/types'
import { BEHAVIORAL_EVENT_TYPES } from './events/taxonomy'
import type { BehavioralEventType } from './events/taxonomy'
import type {
  ManagerBehavioralFacts,
  LeagueBehavioralFacts,
  BehavioralFactsCoverage,
  ManagerBehavioralAssemblyInput,
  LeagueBehavioralAssemblyInput,
} from './facts'

// ── Manager facts ─────────────────────────────────────────────────────────────

/**
 * Aggregate events into ManagerBehavioralFacts for a single manager.
 * Filters the input event array to events where `managerId === input.managerId`.
 */
export function assembleManagerBehavioralFacts(
  input: ManagerBehavioralAssemblyInput,
): ManagerBehavioralFacts {
  const { managerId, leagueId, events, lookbackDays } = input
  const myEvents = events.filter((e) => e.managerId === managerId)
  const byType = groupByType(myEvents)

  const lineupSaves = byType['lineup_saved'] ?? []
  const tradeCreated = byType['trade_created'] ?? []
  const tradeAccepted = byType['trade_accepted'] ?? []
  const tradeRejected = byType['trade_rejected'] ?? []
  const waiverCreated = byType['waiver_claim_created'] ?? []
  const waiverProcessed = byType['waiver_claim_processed'] ?? []
  const commActions = byType['commissioner_action'] ?? []
  const leagueOpened = byType['league_opened'] ?? []
  const liveScoring = byType['live_scoring_opened'] ?? []
  const recaps = byType['recap_viewed'] ?? []
  const draftPicks = byType['draft_pick_made'] ?? []

  const waiverSuccessCount = waiverProcessed.filter((e) => {
    const ev = e as BehavioralEventOf<'waiver_claim_processed'>
    return ev.metadata.outcome === 'awarded'
  }).length

  const sorted = sortByOccurredDesc(myEvents)
  const lastActivity = sorted[0] ?? null
  const lastLineupSave = sortByOccurredDesc(lineupSaves)[0] ?? null

  return {
    managerId,
    leagueId,
    lastLineupSave,
    lastActivity,
    lineupSaveCount: lineupSaves.length,
    tradeProposalCount: tradeCreated.length,
    tradeAcceptedCount: tradeAccepted.length,
    tradeRejectedCount: tradeRejected.length,
    waiverClaimCount: waiverCreated.length,
    waiverSuccessCount,
    commissionerActionCount: commActions.length,
    leagueOpenCount: leagueOpened.length,
    liveScoringSessionCount: liveScoring.length,
    recapViewCount: recaps.length,
    draftPickCount: draftPicks.length,
    completeness: avgCompleteness(myEvents),
    eventCount: myEvents.length,
    lookbackDays: lookbackDays ?? null,
    warnings: buildManagerWarnings(myEvents, lineupSaves, waiverCreated),
  }
}

// ── League facts ──────────────────────────────────────────────────────────────

/**
 * Aggregate events into LeagueBehavioralFacts for an entire league.
 * Expects `input.events` to contain events from all managers in the league.
 */
export function assembleLeagueBehavioralFacts(
  input: LeagueBehavioralAssemblyInput,
): LeagueBehavioralFacts {
  const { leagueId, events, lookbackDays } = input
  const byType = groupByType(events)

  const trades = byType['trade_created'] ?? []
  const waiverClaims = byType['waiver_claim_created'] ?? []
  const waiverProcessed = byType['waiver_claim_processed'] ?? []
  const commActions = byType['commissioner_action'] ?? []
  const rulesChanges = byType['rules_changed'] ?? []
  const draftStarts = byType['draft_started'] ?? []
  const draftPicks = byType['draft_pick_made'] ?? []

  const totalWaiverSuccessCount = waiverProcessed.filter((e) => {
    const ev = e as BehavioralEventOf<'waiver_claim_processed'>
    return ev.metadata.outcome === 'awarded'
  }).length

  const activeManagerIds = [
    ...new Set(events.filter((e) => e.managerId != null).map((e) => e.managerId!)),
  ]

  const sorted = sortByOccurredDesc(events)
  const lastActivity = sorted[0] ?? null

  return {
    leagueId,
    totalTradeCount: trades.length,
    totalWaiverClaimCount: waiverClaims.length,
    totalWaiverSuccessCount,
    totalCommissionerActionCount: commActions.length,
    totalRulesChangeCount: rulesChanges.length,
    activeManagerIds,
    lastActivity,
    draftCount: draftStarts.length,
    totalDraftPickCount: draftPicks.length,
    completeness: avgCompleteness(events),
    eventCount: events.length,
    managerCount: activeManagerIds.length,
    lookbackDays: lookbackDays ?? null,
    warnings: buildLeagueWarnings(events),
  }
}

// ── Coverage profile ──────────────────────────────────────────────────────────

/**
 * Build a per-event-type coverage profile from a set of events.
 * `score` is the percentage of the 14 canonical event types that have ≥1 event.
 */
export function assembleBehavioralFactsCoverage(
  events: BehavioralEvent[],
): BehavioralFactsCoverage {
  const countsByType: Partial<Record<BehavioralEventType, number>> = {}
  for (const e of events) {
    countsByType[e.eventType] = (countsByType[e.eventType] ?? 0) + 1
  }
  const coveredTypes = BEHAVIORAL_EVENT_TYPES.filter((t) => (countsByType[t] ?? 0) > 0)
  const uncoveredTypes = BEHAVIORAL_EVENT_TYPES.filter((t) => (countsByType[t] ?? 0) === 0)
  const score =
    BEHAVIORAL_EVENT_TYPES.length > 0
      ? Math.round((coveredTypes.length / BEHAVIORAL_EVENT_TYPES.length) * 100)
      : 0

  const warnings: string[] = []
  if (events.length === 0) warnings.push('no_events')

  return { score, coveredTypes, uncoveredTypes, countsByType, warnings }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function groupByType(
  events: BehavioralEvent[],
): Partial<Record<BehavioralEventType, BehavioralEvent[]>> {
  const map: Partial<Record<BehavioralEventType, BehavioralEvent[]>> = {}
  for (const e of events) {
    if (!map[e.eventType]) map[e.eventType] = []
    map[e.eventType]!.push(e)
  }
  return map
}

function sortByOccurredDesc(events: BehavioralEvent[]): BehavioralEvent[] {
  return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

function avgCompleteness(events: BehavioralEvent[]): number {
  if (events.length === 0) return 0
  return Math.round(
    events.reduce((sum, e) => sum + e.completeness, 0) / events.length,
  )
}

function buildManagerWarnings(
  all: BehavioralEvent[],
  lineupSaves: BehavioralEvent[],
  waiverClaims: BehavioralEvent[],
): string[] {
  const w: string[] = []
  if (all.length === 0) w.push('no_events')
  if (lineupSaves.length === 0) w.push('no_lineup_save_events')
  if (waiverClaims.length === 0) w.push('no_waiver_events')
  return w
}

function buildLeagueWarnings(all: BehavioralEvent[]): string[] {
  const w: string[] = []
  if (all.length === 0) w.push('no_events')
  return w
}
