import type { LineupActionSummaryPayload } from '@/lib/lineup-actions/types'
import type { TradesDashboardResponse, WaiverDashboardResponse } from '@/app/dashboard/dashboardStripApiTypes'
import type { AiTimeContextPayload } from '@/lib/time-engine/types'

export type TodayActionsEngineResponse = {
  serverTimeIso: string
  /** Same time envelope as AI payloads — Today strip + modals stay time-aware. */
  aiTimeContext: AiTimeContextPayload
  lineup: LineupActionSummaryPayload
  waivers: WaiverDashboardResponse
  trades: TradesDashboardResponse
  /** Primary league used for War Room snapshot + waiver timing (most recently updated claimed team). */
  primaryLeagueId: string | null
  counts: {
    /** Sum of pickup rows across leagues in waiver recommendations (trending suggestions, not claims filed). */
    waiverPickupSuggestions: number
    /** Injury report rows in DB for the user’s league sports (recent window). */
    injuryReportRowsInUserSports: number
    /** Lineup scan items tied to injured/questionable/doubtful starters (excludes informational-only). */
    lineupInjuryDecisionsToReview: number
    /** Actions with matchup prep reason / MatchupPrep module. */
    matchupPrepDecisionsToReview: number
    /** Subset of lineup actions tagged War Room (merge layer). */
    warRoomLineupSignals: number
    /** War Room command center orchestrated action count for `primaryLeagueId` (0 if no league / failed). */
    warRoomOrchestratedPriorities: number
    /** `max(orchestrated, lineup war-room signals)` — chip uses this so nothing is double-counted as two categories. */
    warRoomDecisionsToReview: number
    /** `ai_start_sit` lineup actions. */
    startSitReviewActions: number
    /** `ai_waiver` lineup actions — must-add/strong-add picks at critical/high urgency. */
    waiverUrgentAdds: number
    /** `weather_risk` lineup actions. */
    weatherRiskActions: number
    /** Leagues with at least one weekly matchup row for the user’s roster in DB. */
    leaguesWithSyncedWeeklyMatchupData: number
    pendingTrades: number
    /** Mirrors `lineup.totalUnresolvedSlotActions` for label parity with lineup chip. */
    unresolvedLineupSlotActions: number
    /** Mirrors `lineup.urgentLineupActions` — real urgent tier from scan. */
    urgentLineupActions: number
  }
  /**
   * Primary league waiver process estimate from DB (`timezone` + `waiverProcessTime`).
   * Never emit “claims due tonight” without a resolved instant.
   */
  waiverTiming: {
    nextWaiverProcessKnown: boolean
    nextWaiverProcessIsoUtc: string | null
    waiverTimingHint: string | null
  }
  /** AI Auto Start/Sit Protection — real swap counts, no placeholder urgency. */
  autoStartSitProtection: {
    globalEnabled: boolean
    autoSwapsLast24h: number
  }
}
