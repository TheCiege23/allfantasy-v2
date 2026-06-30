'use client'

import { AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react'

// ---------------------------------------------------------------------------
// Payload types — mirrors the ImportPreviewResponse + CanonicalPreview shapes
// returned by /api/leagues/import/preview. All fields optional so the
// component degrades gracefully when data is sparse.
// ---------------------------------------------------------------------------

type PreviewLeague = {
  name?: string
  teamCount?: number
  type?: string
  sport?: string
  season?: number | null
  playoffTeams?: number
  settings?: { ppr?: boolean; superflex?: boolean; tep?: boolean }
}

type PreviewManager = {
  displayName?: string
  wins?: number
  losses?: number
  rosterSize?: number
  pointsFor?: string
}

type PreviewDataQuality = {
  completenessScore?: number
  rosterCoverage?: number
  tier?: string
  sources?: {
    users?: boolean
    rosters?: boolean
    matchups?: boolean
    trades?: boolean
    draftPicks?: boolean
    history?: boolean
  }
  signals?: string[]
}

type PreviewCanonical = {
  reviewRequired?: boolean
  reviewReasons?: string[]
  warnings?: Array<{ code: string; message: string; severity: string }>
  derivedFlags?: {
    dynasty?: boolean
    idp?: boolean
    bestBall?: boolean
    salaryCap?: boolean
    devy?: boolean
    c2c?: boolean
    tournament?: boolean
  }
}

export type CommissionerPreviewPayload = {
  league?: PreviewLeague
  managers?: PreviewManager[]
  dataQuality?: PreviewDataQuality
  transactionCount?: number
  matchupWeeks?: number
  draftPickCount?: number
  canonical?: PreviewCanonical
}

// ---------------------------------------------------------------------------
// Intelligence derivation — fully deterministic, no API calls
// ---------------------------------------------------------------------------

type HealthTier = 'strong' | 'good' | 'fair' | 'poor'
type ActivityLevel = 'Active' | 'Moderate' | 'Low'
type RiskLevel = 'Low' | 'Medium' | 'High'
type WorkloadLevel = 'Light' | 'Moderate' | 'Heavy'

type Intelligence = {
  healthScore: number
  healthTier: HealthTier
  retentionRisk: RiskLevel
  managerActivity: ActivityLevel
  rosterCoverage: number
  tradeActivity: ActivityLevel
  waiverActivity: ActivityLevel
  engagementScore: number
  workloadLevel: WorkloadLevel
  workloadItems: string[]
  recommendations: string[]
  needsAttention: number
  totalManagers: number
}

function deriveIntelligence(p: CommissionerPreviewPayload): Intelligence {
  const managers = p.managers ?? []
  const totalManagers = managers.length || p.league?.teamCount || 0
  const dq = p.dataQuality ?? {}
  const completeness = dq.completenessScore ?? 50
  const rosterCoverage = dq.rosterCoverage ?? 0
  const txCount = p.transactionCount ?? 0
  const matchupWeeks = p.matchupWeeks ?? 0
  const hasTrades = dq.sources?.trades ?? false
  const hasMatchups = dq.sources?.matchups ?? false
  const canonical = p.canonical ?? {}

  // Roster analysis
  const avgRoster =
    managers.length > 0
      ? managers.reduce((s, m) => s + (m.rosterSize ?? 0), 0) / managers.length
      : 0
  const emptyRosters = managers.filter((m) => (m.rosterSize ?? 0) === 0).length
  const thinRosters = managers.filter((m) => {
    const size = m.rosterSize ?? 0
    return size > 0 && avgRoster > 0 && size < avgRoster * 0.7
  }).length
  const needsAttention = emptyRosters + thinRosters
  const inactiveManagers = managers.filter(
    (m) => m.wins === 0 && m.losses === 0 && (m.rosterSize ?? 0) < 5,
  ).length

  // Health score
  let healthScore = completeness
  if (emptyRosters > 0) healthScore -= emptyRosters * 8
  if (canonical.reviewRequired) healthScore -= 10
  if ((canonical.warnings?.length ?? 0) > 3) healthScore -= 5
  healthScore = Math.round(Math.max(0, Math.min(100, healthScore)))

  const healthTier: HealthTier =
    healthScore >= 80
      ? 'strong'
      : healthScore >= 60
        ? 'good'
        : healthScore >= 40
          ? 'fair'
          : 'poor'

  // Retention risk
  const retentionRisk: RiskLevel =
    needsAttention > totalManagers * 0.3 || inactiveManagers > 2
      ? 'High'
      : needsAttention > 0 || inactiveManagers > 0
        ? 'Medium'
        : 'Low'

  // Activity
  const activityPct = hasMatchups
    ? Math.round((matchupWeeks / Math.max(17, matchupWeeks + 1)) * 100)
    : (managers.filter((m) => (m.rosterSize ?? 0) > 5).length / Math.max(1, totalManagers)) * 100
  const managerActivity: ActivityLevel =
    activityPct >= 70 ? 'Active' : activityPct >= 35 ? 'Moderate' : 'Low'

  // Trade
  const estimatedTrades = hasTrades ? Math.round(txCount * 0.25) : 0
  const tradeActivity: ActivityLevel =
    estimatedTrades >= 10 ? 'Active' : estimatedTrades >= 3 ? 'Moderate' : 'Low'

  // Waiver
  const waiverActivity: ActivityLevel =
    txCount >= 30 ? 'Active' : txCount >= 10 ? 'Moderate' : 'Low'

  // Engagement (0-100)
  const engagementScore = Math.round(
    rosterCoverage * 0.35 +
      Math.min(100, activityPct) * 0.35 +
      (hasTrades
        ? Math.min(100, txCount * 2)
        : txCount > 0
          ? Math.min(100, txCount * 0.5)
          : 0) *
        0.3,
  )

  // Commissioner workload
  const workloadItems: string[] = []
  if (emptyRosters > 0)
    workloadItems.push(`${emptyRosters} manager${emptyRosters > 1 ? 's' : ''} without rosters`)
  if (thinRosters > 0)
    workloadItems.push(`${thinRosters} under-rostered team${thinRosters > 1 ? 's' : ''}`)
  if (canonical.reviewRequired) workloadItems.push('League settings flagged for review')
  if (!hasMatchups && matchupWeeks === 0)
    workloadItems.push('Matchup schedule not yet available')

  const workloadLevel: WorkloadLevel =
    workloadItems.length >= 3 ? 'Heavy' : workloadItems.length >= 1 ? 'Moderate' : 'Light'

  // Recommended actions
  const recommendations: string[] = []
  if (needsAttention > 0)
    recommendations.push(
      `Reach out to ${needsAttention} manager${needsAttention > 1 ? 's' : ''} who need attention`,
    )
  if (tradeActivity === 'Low')
    recommendations.push('Trade activity is low — consider a trade reminder or deadline')
  if (waiverActivity === 'Low' && txCount < 5)
    recommendations.push('Remind managers to check the waiver wire')
  if (recommendations.length < 2) recommendations.push('Post a weekly recap to keep managers engaged')
  if (retentionRisk === 'High')
    recommendations.push('High retention risk — consider a season recap or engagement post')
  if (healthScore >= 80 && recommendations.length < 3)
    recommendations.push('League health is strong — great foundation for next season')

  return {
    healthScore,
    healthTier,
    retentionRisk,
    managerActivity,
    rosterCoverage,
    tradeActivity,
    waiverActivity,
    engagementScore,
    workloadLevel,
    workloadItems,
    recommendations,
    needsAttention,
    totalManagers,
  }
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

const TIER_COLORS: Record<HealthTier, { score: string; bar: string; label: string }> = {
  strong: { score: 'text-emerald-400', bar: 'from-emerald-600 to-emerald-400', label: 'text-emerald-300' },
  good: { score: 'text-cyan-400', bar: 'from-cyan-600 to-cyan-400', label: 'text-cyan-300' },
  fair: { score: 'text-amber-400', bar: 'from-amber-600 to-amber-400', label: 'text-amber-300' },
  poor: { score: 'text-red-400', bar: 'from-red-600 to-red-400', label: 'text-red-300' },
}

const TIER_LABEL: Record<HealthTier, string> = {
  strong: 'Strong',
  good: 'Good',
  fair: 'Fair',
  poor: 'Needs work',
}

type Sentiment = 'good' | 'neutral' | 'warn' | 'bad'

const SENTIMENT_TEXT: Record<Sentiment, string> = {
  good: 'text-emerald-300',
  neutral: 'text-cyan-300',
  warn: 'text-amber-300',
  bad: 'text-red-300',
}

const SENTIMENT_DOT: Record<Sentiment, string> = {
  good: 'bg-emerald-400',
  neutral: 'bg-cyan-400',
  warn: 'bg-amber-400',
  bad: 'bg-red-400',
}

const SENTIMENT_BAR: Record<Sentiment, string> = {
  good: 'bg-emerald-400',
  neutral: 'bg-cyan-400',
  warn: 'bg-amber-400',
  bad: 'bg-red-400',
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sentiment,
  detail,
  progress,
}: {
  label: string
  value: string
  sentiment: Sentiment
  detail: string
  progress?: number
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
          {label}
        </p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${SENTIMENT_DOT[sentiment]}`} />
      </div>
      <p className={`mt-2 text-xl font-bold ${SENTIMENT_TEXT[sentiment]}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${SENTIMENT_BAR[sentiment]}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-[12px] leading-5 text-white/50">{detail}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CommissionerIntelligencePreview
// ---------------------------------------------------------------------------

export type CommissionerIntelligencePreviewProps = {
  leagueName: string
  provider: string
  payload: CommissionerPreviewPayload
  onClose: () => void
  /** Called when the user clicks "Continue to import" — caller closes modal
   *  and scrolls to the commit section. */
  onContinue: () => void
}

export function CommissionerIntelligencePreview({
  leagueName,
  provider,
  payload,
  onClose,
  onContinue,
}: CommissionerIntelligencePreviewProps) {
  const intel = deriveIntelligence(payload)
  const tc = TIER_COLORS[intel.healthTier]
  const league = payload.league ?? {}
  const hasMeaningfulData =
    (payload.managers?.length ?? 0) > 0 || (payload.dataQuality?.completenessScore ?? 0) > 0

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm"
      style={{ background: 'rgba(2, 6, 23, 0.97)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Commissioner Intelligence Preview"
      data-testid="commissioner-intelligence-preview"
    >
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
              Commissioner Intelligence Preview
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">
              {leagueName}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {league.type ? (
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                  {league.type}
                </span>
              ) : null}
              {league.sport ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                  {league.sport}
                </span>
              ) : null}
              {league.teamCount ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
                  {league.teamCount} teams
                </span>
              ) : null}
              {league.season ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
                  {league.season}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-white/40">
                via {provider}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!hasMeaningfulData ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-[15px] font-semibold text-white/70">Preview ready</p>
            <p className="mt-2 text-[13px] text-white/40">
              More insights unlock after league activity is available.
            </p>
          </div>
        ) : (
          <>
            {/* Health Score */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    League Health Score
                  </p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className={`text-5xl font-bold ${tc.score}`}>{intel.healthScore}</span>
                    <span className="text-lg font-semibold text-white/40">/ 100</span>
                  </div>
                  <p className={`mt-1 text-[13px] font-semibold ${tc.label}`}>
                    {TIER_LABEL[intel.healthTier]}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[12px] text-white/40">
                  <p>{payload.dataQuality?.completenessScore ?? 0}% data coverage</p>
                  {intel.totalManagers > 0 ? <p>{intel.totalManagers} managers</p> : null}
                  {(payload.matchupWeeks ?? 0) > 0 ? (
                    <p>{payload.matchupWeeks} matchup weeks</p>
                  ) : null}
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tc.bar}`}
                  style={{ width: `${intel.healthScore}%` }}
                  data-testid="health-bar"
                />
              </div>
              <p className="mt-2 text-[11px] text-white/30">
                Based on data coverage, roster completeness, and league activity
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Retention Risk"
                value={intel.retentionRisk}
                sentiment={
                  intel.retentionRisk === 'Low'
                    ? 'good'
                    : intel.retentionRisk === 'Medium'
                      ? 'warn'
                      : 'bad'
                }
                detail={
                  intel.needsAttention > 0
                    ? `${intel.needsAttention} manager${intel.needsAttention > 1 ? 's' : ''} need attention`
                    : 'All managers are active'
                }
              />
              <MetricCard
                label="Manager Activity"
                value={intel.managerActivity}
                sentiment={
                  intel.managerActivity === 'Active'
                    ? 'good'
                    : intel.managerActivity === 'Moderate'
                      ? 'neutral'
                      : 'warn'
                }
                detail={
                  intel.totalManagers > 0
                    ? `${intel.totalManagers - intel.needsAttention} of ${intel.totalManagers} managers active`
                    : 'Activity data is being gathered'
                }
              />
              <MetricCard
                label="Roster Completeness"
                value={`${intel.rosterCoverage}%`}
                sentiment={
                  intel.rosterCoverage >= 80 ? 'good' : intel.rosterCoverage >= 50 ? 'neutral' : 'warn'
                }
                detail={
                  intel.rosterCoverage >= 80
                    ? 'Roster completeness is strong'
                    : intel.rosterCoverage >= 50
                      ? 'Most rosters are complete'
                      : 'Some rosters need players'
                }
                progress={intel.rosterCoverage}
              />
              <MetricCard
                label="Trade Activity"
                value={intel.tradeActivity}
                sentiment={
                  intel.tradeActivity === 'Active'
                    ? 'good'
                    : intel.tradeActivity === 'Moderate'
                      ? 'neutral'
                      : 'warn'
                }
                detail={
                  payload.dataQuality?.sources?.trades
                    ? intel.tradeActivity === 'Low'
                      ? 'Trade activity is low this season'
                      : 'Managers are actively trading'
                    : 'More insights unlock after league activity'
                }
              />
              <MetricCard
                label="Waiver Activity"
                value={intel.waiverActivity}
                sentiment={
                  intel.waiverActivity === 'Active'
                    ? 'good'
                    : intel.waiverActivity === 'Moderate'
                      ? 'neutral'
                      : 'warn'
                }
                detail={
                  (payload.transactionCount ?? 0) > 0
                    ? `${payload.transactionCount} transactions on record`
                    : 'More insights unlock after league activity'
                }
              />
              <MetricCard
                label="Engagement Score"
                value={String(intel.engagementScore)}
                sentiment={
                  intel.engagementScore >= 70
                    ? 'good'
                    : intel.engagementScore >= 45
                      ? 'neutral'
                      : 'warn'
                }
                detail={
                  intel.engagementScore >= 70
                    ? 'League engagement is strong'
                    : intel.engagementScore >= 45
                      ? 'Engagement is developing'
                      : 'Early activity — more data coming'
                }
                progress={intel.engagementScore}
              />
            </div>

            {/* Commissioner Workload */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Commissioner Workload
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    intel.workloadLevel === 'Light'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : intel.workloadLevel === 'Moderate'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {intel.workloadLevel}
                </span>
              </div>
              {intel.workloadItems.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {intel.workloadItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-white/65">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-[13px] text-white/60">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  No immediate action required — league is in good shape
                </div>
              )}
            </div>

            {/* Recommended Actions */}
            <div className="mb-8 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/70">
                Recommended Actions
              </p>
              <ol className="mt-3 space-y-2.5">
                {intel.recommendations.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-300">
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-5 text-white/75">{action}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}

        {/* Footer CTAs */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-400"
            data-testid="continue-to-import"
          >
            Continue to import
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/70 hover:bg-white/10"
          >
            Back
          </button>
        </div>
        <p className="mt-4 text-[11px] text-white/30">
          Intelligence is based on imported data. More insights unlock after league activity begins.
        </p>
      </div>
    </div>
  )
}
