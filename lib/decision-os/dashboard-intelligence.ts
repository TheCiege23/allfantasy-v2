/**
 * Decision OS — Phase 8.1 Intelligence Pipeline Unification.
 *
 * Composes the ALREADY-REAL, already-tested Phase 5.1-5.2 behavioral pipeline
 * with the ALREADY-REAL Phase 6.1/6.2/6.4 decision intelligence layer to
 * produce a real Manager DNA profile + Manager Recommendation set for one
 * manager in one league. Every building block here is imported unchanged
 * from its own file — this module adds ZERO new derivation logic, only
 * composition (loads real rows -> maps to events -> assembles facts ->
 * derives behavioral intelligence -> detects patterns -> assembles DNA ->
 * assembles recommendations).
 *
 * Read-only: only reads via the existing Phase 5.1 port functions (the same
 * ones `lib/decision-os/behavioral/api/real-data-provider.ts` already uses
 * for the live Intelligence API). No writes, no cache-warming.
 *
 * Server-only: performs real Prisma reads via the port layer. Call from a
 * Server Component, a Route Handler, or another server-only module — never
 * from a Client Component directly.
 *
 * Honest degradation (P2): a manager with zero events still gets a real
 * (not fabricated) profile — every count is genuinely 0, `primaryIdentity`
 * naturally resolves to 'unknown', and `buildManagerDnaViewModel`/
 * `buildDecisionRecommendationsViewModel` already render that as an honest
 * insufficient-data state. Nothing here invents data when a source is thin.
 *
 * Deferred (documented, not built here — see PHASE_8_1_PIPELINE_UNIFICATION.md):
 * `leagueBenchmark` (Phase 6.5) is intentionally omitted from the DNA/
 * recommendation inputs — platform-wide cross-league benchmarking is a
 * separate, heavier composition out of this ticket's scope. Commissioner-
 * tier recommendations (Phase 6.4 `assembleCommissionerRecommendations`)
 * are also deferred — this module only produces MANAGER-tier output.
 */

import {
  loadWaiverClaimRows,
  loadLeagueTradeRows,
  loadRosterMoveRows,
  loadDraftRows,
  loadRedraftTradeRows,
  loadRedraftRosterPlayerRows,
} from '@/lib/decision-os/behavioral/port'
import {
  mapWaiverClaimsToEvents,
  mapLeagueTradesToEvents,
  mapRosterMovesToEvents,
  mapDraftRowsToEvents,
  mapRedraftTradesToEvents,
  mapRedraftRosterPlayersToEvents,
} from '@/lib/decision-os/behavioral/mappers'
import {
  assembleManagerBehavioralFacts,
  assembleLeagueBehavioralFacts,
} from '@/lib/decision-os/behavioral/assemble'
import { deriveManagerBehavioralIntelligence } from '@/lib/decision-os/behavioral/manager-intelligence'
import type { ManagerBehavioralIntelligence, ParticipationTier } from '@/lib/decision-os/behavioral/manager-intelligence'
import type { BehavioralEvent } from '@/lib/decision-os/behavioral/events/types'
import {
  detectBehavioralPatterns,
  assembleManagerDna,
  assembleManagerRecommendations,
} from '@/lib/decision-os/phase6'
import type {
  ManagerDnaProfile,
  ManagerSignalInput,
  ManagerEngagementTier,
} from '@/lib/decision-os/phase6/dna/types'
import type { RecommendationSet } from '@/lib/decision-os/phase6/recommendations/types'

function lookbackDays(): number {
  return Math.max(1, parseInt(process.env.INTELLIGENCE_LOOKBACK_DAYS ?? '90', 10) || 90)
}

function sinceDate(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

/**
 * Same event-loading shape as real-data-provider.ts's loadAllLeagueEvents, plus
 * the Phase 2E redraft trade/roster sources (docs/DECISION_OS_MANAGER_DNA_PHASE2D_REAL_DATA_READINESS.md):
 * the live redraft product writes to RedraftTradeProposal/RedraftTradeAsset and
 * RedraftRoster/RedraftRosterPlayer, not AfLeagueTrade/AfRosterMoveHistory — so
 * without these two additional sources, real redraft trade and roster activity
 * would never reach this pipeline at all. All four original sources are
 * unchanged; this only adds two more to the same Promise.all/event-array
 * composition.
 */
async function loadLeagueEvents(leagueId: string, since: Date): Promise<BehavioralEvent[]> {
  const [waiverRows, tradeRows, rosterMoveRows, draftData, redraftTradeRows, redraftRosterPlayerRows] =
    await Promise.all([
      loadWaiverClaimRows(leagueId, since),
      loadLeagueTradeRows(leagueId, since),
      loadRosterMoveRows(leagueId, since),
      loadDraftRows(leagueId),
      loadRedraftTradeRows(leagueId, since),
      loadRedraftRosterPlayerRows(leagueId, since),
    ])
  return [
    ...mapWaiverClaimsToEvents(waiverRows),
    ...mapLeagueTradesToEvents(tradeRows),
    ...mapRosterMovesToEvents(rosterMoveRows),
    ...mapDraftRowsToEvents(draftData.session, draftData.picks),
    ...mapRedraftTradesToEvents(redraftTradeRows),
    ...mapRedraftRosterPlayersToEvents(redraftRosterPlayerRows),
  ]
}

/** Phase 5.2 ParticipationTier -> Phase 6.2 ManagerEngagementTier. Only the bottom label differs. */
function toEngagementTier(tier: ParticipationTier): ManagerEngagementTier {
  return tier === 'inactive' ? 'dormant' : tier
}

/** Honest per-week rate from a real event count over the real lookback window. Never estimated when the count is 0. */
function perWeekRate(eventCount: number, lookback: number | null): number {
  const weeks = Math.max(1, (lookback ?? lookbackDays()) / 7)
  return Math.round((eventCount / weeks) * 100) / 100
}

function toManagerSignal(mi: ManagerBehavioralIntelligence): ManagerSignalInput {
  return {
    managerId: mi.managerId,
    engagementScore: mi.overallEngagementScore,
    engagementTier: toEngagementTier(mi.participationTier),
    activityRates: {
      lineupEditsPerWeek: perWeekRate(mi.lineupEngagement.eventCount, mi.lookbackDays),
      waiverClaimsPerWeek: perWeekRate(mi.waiverEngagement.eventCount, mi.lookbackDays),
      tradeProposalsPerWeek: perWeekRate(mi.tradeEngagement.eventCount, mi.lookbackDays),
      // Honest 0 — this pipeline has no login/session event source (matches the
      // existing Phase 5.2 convention: every zero here is a real absence, not a fill-in).
      loginSessionsPerWeek: 0,
    },
    completeness: mi.completeness,
  }
}

export type ManagerIntelligencePayload = {
  managerDna: ManagerDnaProfile | null
  recommendations: RecommendationSet | null
}

/**
 * Resolve a real Manager DNA profile + Manager Recommendation set for one
 * manager in one league, via the real Phase 5.1/5.2 -> 6.1/6.2/6.4 pipeline.
 *
 * Always computes facts for `managerId` even if they have zero events (an
 * honest zero-activity profile, not a skipped one). Other active managers'
 * signals/patterns are included too, since Phase 6.1 pattern detection and
 * Phase 6.2 DNA classification both take the full league's manager set as
 * input — matching the exact composition already proven by
 * `real-data-provider.ts`'s `buildLeaguePipeline`.
 */
export async function resolveManagerIntelligencePayload({
  leagueId,
  managerId,
  now = new Date(),
}: {
  leagueId: string
  managerId: string
  now?: Date
}): Promise<ManagerIntelligencePayload> {
  try {
    const lookback = lookbackDays()
    const since = sinceDate(lookback)
    const events = await loadLeagueEvents(leagueId, since)

    const leagueFacts = assembleLeagueBehavioralFacts({ leagueId, events, lookbackDays: lookback })
    const managerIds = new Set(leagueFacts.activeManagerIds)
    managerIds.add(managerId)

    const managerIntelligences: ManagerBehavioralIntelligence[] = [...managerIds].map((id) => {
      const facts = assembleManagerBehavioralFacts({ managerId: id, leagueId, events, lookbackDays: lookback })
      return deriveManagerBehavioralIntelligence(facts, events, now)
    })

    const patternsResult = detectBehavioralPatterns({ leagueId, events, analysisWindowDays: lookback })

    const managerSignals: ManagerSignalInput[] = managerIntelligences.map(toManagerSignal)

    const dnaResult = assembleManagerDna({
      leagueId,
      managerPatterns: patternsResult.managerPatterns,
      managerSignals,
    })

    const targetProfile = dnaResult.profiles.find((p) => p.managerId === managerId) ?? null
    const targetPatternGroup = patternsResult.managerPatterns.find((g) => g.managerId === managerId)

    const recommendations = assembleManagerRecommendations({
      managerId,
      leagueId,
      identity: targetProfile ?? undefined,
      patterns: targetPatternGroup?.patterns,
      // leagueBenchmark intentionally omitted — Phase 6.5 platform-wide
      // benchmarking is out of this ticket's scope (documented deferral).
    })

    return { managerDna: targetProfile, recommendations }
  } catch {
    // Degraded-safe, matching real-data-provider.ts's own contract: a
    // failure here must never break the page. Callers already handle
    // `null` as "insufficient data" via buildManagerDnaViewModel/
    // buildDecisionRecommendationsViewModel's existing fallback paths.
    return { managerDna: null, recommendations: null }
  }
}
