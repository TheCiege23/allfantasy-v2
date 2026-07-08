/**
 * Platform Pulse — the aggregation engine (Deliverable 1).
 *
 * Pure: no IO, no React, no i18n. Given intelligence the dashboard already holds,
 * it selects, ranks, dedupes, and caps the highest-value items for the current
 * context. It fabricates nothing — confidence, trajectory, and reasoning are only
 * ever passed through from a real source.
 */
import type { LineupActionItem, LineupActionReasonType } from '@/lib/lineup-actions/types'
import type { CommissionerLeagueHealthSnapshot } from '@/lib/commissioner-hub/commissionerHubHealth'
import type { PlatformPulseItem, PulseCategory } from './types'

export interface PlatformPulseUpcomingDraft {
  leagueId: string
  leagueName: string
  draftDate: string
}

export interface PlatformPulseInput {
  context: 'global' | 'commissioner' | 'team'
  selectedLeagueId?: string | null
  /** `lineupData.actions` — already in DashboardOverview memory. */
  actions: LineupActionItem[]
  /** Cross-league waiver suggestion count (Global only). */
  waiverCount?: number
  /** Cross-league pending-trade count (Global only). */
  pendingTradeCount?: number
  /** SSR commissioner-health snapshots (one per commissioned league). */
  commissionerHealth?: CommissionerLeagueHealthSnapshot[] | null
  /** Derived upcoming drafts (from `leagues[].draftDate`). */
  upcomingDrafts?: PlatformPulseUpcomingDraft[]
  /** For deterministic testing of the draft window; defaults to Date.now(). */
  now?: number
}

const CAP = 5
const HEALTH_ATTENTION_THRESHOLD = 55 // a sub-score below this is worth surfacing
const DRAFT_WINDOW_HOURS = 72

const URGENCY_PRIORITY: Record<string, number> = { urgent: 92, soon: 74, normal: 55, low: 40 }

const INJURY_REASONS = new Set<LineupActionReasonType>([
  'injured_starter',
  'questionable_starter',
  'doubtful_starter',
  'injury_impact',
])

const AI_REASONS = new Set<LineupActionReasonType>([
  'ai_start_sit',
  'ai_waiver',
  'matchup_prep',
  'war_room',
  'weather_risk',
])

type Candidate = PlatformPulseItem & { dedupeKey: string }

function normalizeConfidence(c: number | null): number | undefined {
  if (c == null || !Number.isFinite(c)) return undefined
  const v = c > 1 ? c / 100 : c
  return v > 0 ? Math.min(1, v) : undefined
}

function severityBump(sev: LineupActionItem['severity']): number {
  return sev === 'critical' ? 6 : sev === 'warning' ? 3 : 0
}

function sourceKey(module: LineupActionItem['sourceModule']): string {
  return module && module !== 'unknown' ? module : 'lineup_scan'
}

function actionKind(reason: LineupActionReasonType): PlatformPulseItem['kind'] {
  if (INJURY_REASONS.has(reason)) return 'injury_watch'
  if (AI_REASONS.has(reason)) return 'ai_recommendation'
  return 'lineup_urgent'
}

function hoursUntil(iso: string, now: number): number | null {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.round((t - now) / 3_600_000)
}

/** Build the ranked pulse for the current context. Deterministic and side-effect free. */
export function buildPlatformPulse(input: PlatformPulseInput): PlatformPulseItem[] {
  const now = input.now ?? Date.now()
  const scope = input.context === 'global' ? null : input.selectedLeagueId ?? null
  const candidates: Candidate[] = []

  // 1) Lineup / recommendation / injury items from real actions.
  const actions = scope ? input.actions.filter((a) => a.leagueId === scope) : input.actions
  for (const a of actions) {
    const kind = actionKind(a.reasonType)
    const category: PulseCategory = kind === 'injury_watch' ? 'Monitor' : 'Recommend'
    candidates.push({
      id: `action:${a.leagueId}:${a.reasonType}:${a.playerId ?? a.slotId ?? ''}`,
      dedupeKey: `action:${a.leagueId}:${a.reasonType}:${a.playerId ?? a.slotId ?? a.message}`,
      kind,
      category,
      priority: (URGENCY_PRIORITY[a.urgency] ?? 50) + severityBump(a.severity),
      source: sourceKey(a.sourceModule),
      data: { leagueName: a.leagueName, playerName: a.playerName ?? undefined },
      confidence: normalizeConfidence(a.confidence),
      why: a.message || a.recommendedAction || null,
      leagueId: a.leagueId,
      leagueName: a.leagueName,
    })
  }

  // 2) Commissioner health (current-state Monitor — no trajectory, per the audit).
  const health = input.commissionerHealth ?? []
  if (input.context === 'global') {
    const worst = health
      .filter((h) => h.healthScore < HEALTH_ATTENTION_THRESHOLD)
      .sort((a, b) => a.healthScore - b.healthScore)[0]
    if (worst) {
      candidates.push({
        id: `health:${worst.leagueId}:overall`,
        dedupeKey: `health:${worst.leagueId}:overall`,
        kind: 'league_needs_attention',
        category: 'Monitor',
        priority: 84 - Math.round(worst.healthScore / 4),
        source: 'commissioner',
        data: { leagueName: worst.leagueName, score: Math.round(worst.healthScore), metric: 'health' },
        why: worst.summary || null,
        leagueId: worst.leagueId,
        leagueName: worst.leagueName,
      })
    }
  } else if (scope) {
    const mine = health.find((h) => h.leagueId === scope)
    if (mine) {
      const subScores: Array<{ metric: string; score: number }> = [
        { metric: 'health', score: mine.healthScore },
        { metric: 'engagement', score: mine.engagementScore },
        { metric: 'fairness', score: mine.fairnessScore },
        { metric: 'sustainability', score: mine.sustainabilityScore },
      ]
      for (const { metric, score } of subScores) {
        if (score < HEALTH_ATTENTION_THRESHOLD) {
          candidates.push({
            id: `health:${mine.leagueId}:${metric}`,
            dedupeKey: `health:${mine.leagueId}:${metric}`,
            kind: 'league_health_low',
            category: 'Monitor',
            priority: 78 - Math.round(score / 4),
            source: 'commissioner',
            data: { leagueName: mine.leagueName, score: Math.round(score), metric },
            why: mine.summary || null,
            leagueId: mine.leagueId,
            leagueName: mine.leagueName,
          })
        }
      }
    }
  }

  // 3) Cross-league counts — Global only (the counts are aggregate, not per-league).
  if (input.context === 'global') {
    if ((input.waiverCount ?? 0) > 0) {
      candidates.push({
        id: 'count:waiver',
        dedupeKey: 'count:waiver',
        kind: 'waiver_pickups',
        category: 'Recommend',
        priority: 58,
        source: 'Waiver',
        data: { count: input.waiverCount },
        why: null,
      })
    }
    if ((input.pendingTradeCount ?? 0) > 0) {
      candidates.push({
        id: 'count:trade',
        dedupeKey: 'count:trade',
        kind: 'pending_trades',
        category: 'Monitor',
        priority: 62,
        source: 'commissioner',
        data: { count: input.pendingTradeCount },
        why: null,
      })
    }
  }

  // 4) Upcoming drafts within the window (Predict).
  for (const d of input.upcomingDrafts ?? []) {
    if (scope && d.leagueId !== scope) continue
    const hrs = hoursUntil(d.draftDate, now)
    if (hrs == null || hrs < 0 || hrs > DRAFT_WINDOW_HOURS) continue
    candidates.push({
      id: `draft:${d.leagueId}`,
      dedupeKey: `draft:${d.leagueId}`,
      kind: 'draft_soon',
      category: 'Predict',
      priority: 76 + Math.max(0, 24 - hrs) / 4, // sooner drafts rank a touch higher
      source: 'draft',
      data: { leagueName: d.leagueName, hoursUntil: hrs },
      why: null,
      leagueId: d.leagueId,
      leagueName: d.leagueName,
    })
  }

  // Dedupe (highest priority per key), rank, cap, and strip the internal key.
  const byKey = new Map<string, Candidate>()
  for (const c of candidates) {
    const existing = byKey.get(c.dedupeKey)
    if (!existing || c.priority > existing.priority) byKey.set(c.dedupeKey, c)
  }
  return [...byKey.values()]
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, CAP)
    .map(({ dedupeKey: _dedupeKey, ...item }) => item)
}
