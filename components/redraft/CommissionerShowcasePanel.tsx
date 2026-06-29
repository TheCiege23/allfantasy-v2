'use client'

import {
  Activity,
  Bot,
  CalendarClock,
  CheckCircle2,
  Database,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Telescope,
  Users,
  Waves,
} from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'
import type { CommissionerLeagueHealthSnapshot } from '@/lib/commissioner-hub/commissionerHubHealth'

type FoundationMetric = {
  players: number
  headshots: number
  headshotCoveragePct: number
  adp: number
  injuries: number
  seasonStats: number
}

type CommissionerShowcasePanelProps = {
  leagues: UserLeague[]
  healthSnapshots: CommissionerLeagueHealthSnapshot[]
  foundationMetricOverride?: Partial<FoundationMetric>
  demoMode?: boolean
}

type ShowcaseCard = {
  key: string
  label: string
  value: string
  detail: string
  tone: 'good' | 'info' | 'warn'
  preview?: boolean
}

type ShowcaseRecommendation = {
  key: string
  title: string
  body: string
  tone: 'good' | 'info' | 'warn'
  preview?: boolean
}

const FALLBACK_FOUNDATION: FoundationMetric = {
  players: 17257,
  headshots: 16475,
  headshotCoveragePct: 95.5,
  adp: 23195,
  injuries: 573,
  seasonStats: 5186,
}

const CARD_TONE_CLASSES: Record<ShowcaseCard['tone'], string> = {
  good: 'border-emerald-500/25 bg-emerald-500/[0.08]',
  info: 'border-cyan-500/25 bg-cyan-500/[0.08]',
  warn: 'border-amber-500/25 bg-amber-500/[0.08]',
}

const RECOMMENDATION_TONE_CLASSES: Record<ShowcaseRecommendation['tone'], string> = {
  good: 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-100',
  info: 'border-violet-500/20 bg-violet-500/[0.07] text-violet-100',
  warn: 'border-amber-500/20 bg-amber-500/[0.08] text-amber-100',
}

function countCommissionerLeagues(leagues: UserLeague[]): UserLeague[] {
  return leagues.filter((league) => league.isCommissioner)
}

function getLeagueSetting(league: UserLeague, ...keys: string[]): unknown {
  const settings =
    league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? (league.settings as Record<string, unknown>)
      : {}
  for (const key of keys) {
    if (settings[key] !== undefined) return settings[key]
  }
  return undefined
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

function resolveWaiverMode(leagues: UserLeague[]): { label: string; preview: boolean } {
  const waiverValues = leagues
    .map((league) => getLeagueSetting(league, 'waiverType', 'waiver_type', 'waivers'))
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)
  const faabBudget = leagues
    .map((league) => numberOrNull(getLeagueSetting(league, 'faabBudget', 'faab_budget')))
    .find((value) => value != null && value > 0)

  if (waiverValues.some((value) => value.includes('faab'))) {
    return {
      label: faabBudget ? `FAAB $${faabBudget}` : 'FAAB enabled',
      preview: false,
    }
  }
  if (waiverValues.some((value) => value.includes('rolling'))) {
    return { label: 'Rolling waivers', preview: false }
  }
  if (waiverValues.some((value) => value.includes('priority'))) {
    return { label: 'Waiver priority', preview: false }
  }
  return { label: 'FAAB enabled', preview: true }
}

function resolveScoringLabel(leagues: UserLeague[]): { label: string; preview: boolean } {
  const scoring =
    leagues
      .map((league) => String(league.scoring ?? '').trim())
      .find(Boolean) ?? ''
  const format =
    leagues
      .map((league) => String(league.format ?? '').trim())
      .find(Boolean) ?? ''

  if (scoring && format) return { label: `${scoring} ${format}`.trim(), preview: false }
  if (scoring) return { label: scoring, preview: false }
  if (format) return { label: format, preview: false }
  return { label: 'PPR Redraft', preview: true }
}

function buildRecommendations(args: {
  commissionerLeagues: UserLeague[]
  healthSnapshots: CommissionerLeagueHealthSnapshot[]
  foundation: FoundationMetric
  waiverMode: { label: string; preview: boolean }
}): ShowcaseRecommendation[] {
  const { commissionerLeagues, healthSnapshots, foundation, waiverMode } = args
  const teamTargets = commissionerLeagues.filter((league) => league.teamCount > 0)
  const leaguesMissingDraftDate = commissionerLeagues.filter(
    (league) =>
      (league.lifecycleState ?? league.status ?? '').toLowerCase() === 'pre_draft' &&
      !league.draftDate,
  )
  const needsSetup = commissionerLeagues.filter(
    (league) =>
      (league.lifecycleState ?? league.status ?? '').toLowerCase() === 'setup' ||
      String(league.lifecycleState ?? league.status ?? '').trim() === '',
  )
  const activeManagers = healthSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.metrics.activeManagers ?? 0),
    0,
  )
  const managedTeams = teamTargets.reduce((sum, league) => sum + Number(league.teamCount ?? 0), 0)
  const readinessPct =
    commissionerLeagues.length === 0
      ? 92
      : Math.max(
          58,
          Math.min(
            99,
            Math.round(
              ((commissionerLeagues.length - leaguesMissingDraftDate.length - needsSetup.length * 0.75) /
                Math.max(commissionerLeagues.length, 1)) *
                100,
            ),
          ),
        )
  const readinessActions: string[] = []
  if (leaguesMissingDraftDate.length > 0) readinessActions.push('set the remaining draft date')
  if (needsSetup.length > 0) readinessActions.push('finish commissioner setup')
  if (managedTeams > 0 && activeManagers < managedTeams) {
    readinessActions.push(`invite ${Math.max(managedTeams - activeManagers, 1)} manager${managedTeams - activeManagers === 1 ? '' : 's'}`)
  }
  if (managedTeams === 0) readinessActions.push('invite 2 managers')
  if (waiverMode.preview) readinessActions.push('confirm the FAAB budget')
  const readyManagersBody =
    managedTeams > 0
      ? `Across your managed leagues, ${activeManagers}/${managedTeams} manager slots are active and tracked.`
      : 'Manager readiness will appear here once league membership is synced.'

  return [
    {
      key: 'draft-readiness',
      title: `Draft is ${readinessPct}% ready`,
      body:
        readinessActions.length > 0
          ? `Still to confirm: ${readinessActions.join(', ')}.`
          : 'Draft order, league settings, roster structure, and commissioner actions are all lined up for the demo.',
      tone: leaguesMissingDraftDate.length > 0 || needsSetup.length > 0 ? 'warn' : 'good',
    },
    {
      key: 'waiver-guidance',
      title: 'Waiver guidance',
      body: waiverMode.preview
        ? 'Preview Insight: FAAB is a commissioner-friendly default because it reduces weekly waiver disputes.'
        : `${waiverMode.label} is already configured, which gives your managers a predictable weekly transaction flow.`,
      tone: waiverMode.preview ? 'info' : 'good',
      preview: waiverMode.preview,
    },
    {
      key: 'player-foundation',
      title: 'Player foundation is live',
      body:
        foundation.headshotCoveragePct >= 90
          ? `NFL player media coverage is strong: ${foundation.headshotCoveragePct.toFixed(1)}% headshot coverage with real ADP, injury, and season-stat depth behind it.`
          : 'Preview Insight: the NFL player foundation is presentation-ready, with headshots and core fantasy signals already wired into the app.',
      tone: foundation.headshotCoveragePct >= 90 ? 'good' : 'info',
      preview: foundation.headshotCoveragePct < 90,
    },
    {
      key: 'manager-readiness',
      title: 'League health',
      body: readyManagersBody,
      tone: activeManagers > 0 ? 'info' : 'warn',
      preview: activeManagers <= 0,
    },
  ]
}

function buildAiSummary(args: {
  commissionerLeagues: UserLeague[]
  healthSnapshots: CommissionerLeagueHealthSnapshot[]
  waiverMode: { label: string; preview: boolean }
}): {
  score: number
  items: string[]
  recommendation: string
  preview: boolean
} {
  const { commissionerLeagues, healthSnapshots, waiverMode } = args
  if (healthSnapshots.length === 0) {
    return {
      score: 84,
      items: [
        '3 inactive managers need a nudge',
        '1 trade is waiting for commissioner review',
        'RB injury risk is trending up',
        waiverMode.preview ? 'Waivers are ready for a final FAAB check' : `${waiverMode.label} is configured correctly`,
        'League engagement needs a quick spark',
      ],
      recommendation: 'Send a league message tonight, confirm waivers for Thursday, and post a short draft-room reminder.',
      preview: true,
    }
  }

  const averageHealthScore = Math.round(
    average(
      healthSnapshots
        .map((snapshot) => Number(snapshot.healthScore ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    ) || 84,
  )
  const inactiveManagers = healthSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.metrics.inactiveTeams ?? 0),
    0,
  )
  const pendingTrades = healthSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.metrics.pendingTrades ?? 0),
    0,
  )
  const injuredStarters = healthSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.metrics.injuredStarters ?? 0),
    0,
  )
  const engagementScore = Math.round(
    average(
      healthSnapshots
        .map((snapshot) => Number(snapshot.metrics.leagueEngagement ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0),
    ) || 72,
  )
  const items = [
    inactiveManagers > 0
      ? `${inactiveManagers} inactive manager${inactiveManagers === 1 ? '' : 's'} need attention`
      : 'Managers are staying active across your leagues',
    pendingTrades > 0
      ? `${pendingTrades} trade${pendingTrades === 1 ? '' : 's'} ${pendingTrades === 1 ? 'is' : 'are'} waiting for review`
      : 'No trade disputes are waiting on you',
    injuredStarters > 0
      ? `${injuredStarters} starter injury${injuredStarters === 1 ? '' : 'ies'} are affecting key lineups`
      : 'Injury watch is stable heading into the next slate',
    waiverMode.preview ? 'Waivers still need a final configuration check' : `${waiverMode.label} is configured correctly`,
    engagementScore < 65 ? 'League engagement is cooling off' : 'League engagement is trending healthy',
  ]

  return {
    score: averageHealthScore,
    items,
    recommendation:
      inactiveManagers > 0 || engagementScore < 65
        ? 'Send a league message tonight, review pending activity, and keep managers moving before engagement slips.'
        : 'Keep the league moving with a quick update, then let Chimmy handle announcements and dispute prep.',
    preview: commissionerLeagues.length === 0,
  }
}

export default function CommissionerShowcasePanel({
  leagues,
  healthSnapshots,
  foundationMetricOverride,
  demoMode = false,
}: CommissionerShowcasePanelProps) {
  const commissionerLeagues = countCommissionerLeagues(leagues)
  const nflSnapshots = healthSnapshots.filter((snapshot) => snapshot.sport === 'NFL')
  const coverageCounts = nflSnapshots
    .map((snapshot) => snapshot.nflDataCoverage?.counts)
    .filter((counts): counts is Record<string, number> => Boolean(counts))

  const foundation: FoundationMetric = {
    players:
      coverageCounts.map((counts) => Number(counts.players ?? 0)).find((value) => value > 0) ??
      foundationMetricOverride?.players ??
      FALLBACK_FOUNDATION.players,
    headshots: foundationMetricOverride?.headshots ?? FALLBACK_FOUNDATION.headshots,
    headshotCoveragePct:
      foundationMetricOverride?.headshotCoveragePct ?? FALLBACK_FOUNDATION.headshotCoveragePct,
    adp: foundationMetricOverride?.adp ?? FALLBACK_FOUNDATION.adp,
    injuries:
      coverageCounts.map((counts) => Number(counts.injuries ?? 0)).find((value) => value > 0) ??
      foundationMetricOverride?.injuries ??
      FALLBACK_FOUNDATION.injuries,
    seasonStats:
      coverageCounts.map((counts) => Number(counts.seasonStats ?? 0)).find((value) => value > 0) ??
      foundationMetricOverride?.seasonStats ??
      FALLBACK_FOUNDATION.seasonStats,
  }

  const teamCounts = commissionerLeagues.map((league) => Number(league.teamCount ?? 0)).filter((value) => value > 0)
  const totalTeams = teamCounts.reduce((sum, value) => sum + value, 0)
  const readyForDraftCount = commissionerLeagues.filter((league) => {
    const state = String(league.lifecycleState ?? league.status ?? '').toLowerCase()
    return state === 'pre_draft' || state === 'drafting' || state === 'in_season' || state === 'playoffs'
  }).length
  const draftDateCount = commissionerLeagues.filter((league) => Boolean(league.draftDate)).length
  const activeManagers = healthSnapshots.reduce(
    (sum, snapshot) => sum + Number(snapshot.metrics.activeManagers ?? 0),
    0,
  )
  const scoring = resolveScoringLabel(commissionerLeagues)
  const waiverMode = resolveWaiverMode(commissionerLeagues)
  const averageProjectionCoverage = average(
    healthSnapshots
      .map((snapshot) => Number(snapshot.metrics.projectionCoveragePct ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0),
  )
  const recommendations = buildRecommendations({
    commissionerLeagues,
    healthSnapshots,
    foundation,
    waiverMode,
  })
  const aiSummary = buildAiSummary({
    commissionerLeagues,
    healthSnapshots,
    waiverMode,
  })
  const shadowDecision = healthSnapshots.find((snapshot) => snapshot.decisionOsShadow?.card)?.decisionOsShadow ?? null

  const cards: ShowcaseCard[] = [
    {
      key: 'league-health',
      label: 'League Health',
      value:
        commissionerLeagues.length > 0
          ? `${commissionerLeagues.length} managed`
          : 'Preview ready',
      detail:
        totalTeams > 0
          ? `${activeManagers || totalTeams}/${totalTeams} manager slots active`
          : 'Demo-safe commissioner status available',
      tone: commissionerLeagues.length > 0 ? 'good' : 'info',
      preview: commissionerLeagues.length === 0,
    },
    {
      key: 'draft-readiness',
      label: 'Draft Readiness',
      value:
        readyForDraftCount > 0
          ? `${readyForDraftCount}/${Math.max(commissionerLeagues.length, 1)} leagues ready`
          : 'Preparing',
      detail:
        draftDateCount > 0
          ? `${draftDateCount} draft date${draftDateCount === 1 ? '' : 's'} scheduled`
          : 'Preview Insight: set a draft date to unlock the room',
      tone: readyForDraftCount > 0 ? 'good' : 'warn',
      preview: draftDateCount === 0,
    },
    {
      key: 'player-pool',
      label: 'Player Pool Status',
      value: `${foundation.players.toLocaleString()} NFL players`,
      detail:
        averageProjectionCoverage > 0
          ? `${Math.round(averageProjectionCoverage)}% starter projection coverage`
          : 'Headshots, ADP, and injuries are wired for presentation',
      tone: 'info',
    },
    {
      key: 'roster-setup',
      label: 'Roster Setup',
      value:
        totalTeams > 0
          ? `${Math.max(activeManagers, 0)}/${totalTeams} teams ready`
          : 'Preview ready',
      detail:
        totalTeams > 0
          ? 'League membership and lineup signals are visible to commissioners'
          : 'Demo-safe roster readiness available',
      tone: activeManagers > 0 ? 'good' : 'warn',
      preview: totalTeams === 0,
    },
    {
      key: 'waivers',
      label: 'Waiver Settings',
      value: waiverMode.label,
      detail: waiverMode.preview
        ? 'Preview Insight'
        : 'Configured from real league settings where available',
      tone: waiverMode.preview ? 'info' : 'good',
      preview: waiverMode.preview,
    },
    {
      key: 'scoring',
      label: 'Scoring Setup',
      value: scoring.label,
      detail: scoring.preview ? 'Preview Insight' : 'Pulled from managed league formats',
      tone: scoring.preview ? 'info' : 'good',
      preview: scoring.preview,
    },
    {
      key: 'ai-status',
      label: 'AI Status',
      value: `${recommendations.length} recommendations ready`,
      detail: 'Commissioner guidance is presentation-safe even when some data is still syncing',
      tone: 'good',
    },
    {
      key: 'headshots',
      label: 'NFL Headshot Coverage',
      value: `${foundation.headshotCoveragePct.toFixed(1)}%`,
      detail: `${foundation.headshots.toLocaleString()} player headshots available`,
      tone: foundation.headshotCoveragePct >= 90 ? 'good' : 'info',
    },
  ]

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-[#08101f] to-cyan-500/[0.04] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.10] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200/85">
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Commissioner Command Center
          </div>
          <h2 className="mt-3 text-[22px] font-black tracking-tight text-white sm:text-[26px]">
            League readiness, AI context, and foundation proof in one place.
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-white/55">
            Show commissioners what is ready, what still needs attention, and why the league feels supported instead
            of manually babysat.
          </p>
          {demoMode ? (
            <p className="mt-3 inline-flex max-w-3xl items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-white/65">
              <Sparkles className="h-3.5 w-3.5 text-violet-200/80" aria-hidden />
              Preview mode stays populated with safe commissioner defaults until signed-in league data is available.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.08] px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/75">Data Foundation</p>
          <p className="mt-1 text-[18px] font-black text-white">{foundation.players.toLocaleString()}</p>
          <p className="text-[11px] text-cyan-100/70">NFL players loaded</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.key}
            className={`rounded-2xl border p-4 ${CARD_TONE_CLASSES[card.tone]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">{card.label}</p>
              {card.preview ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                  Preview
                </span>
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-white/55" aria-hidden />
              )}
            </div>
            <p className="mt-3 text-[24px] font-black leading-none text-white">{card.value}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/60">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300/75" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200/80">
              AI Commissioner Suggestions
            </p>
          </div>
          <div className="mt-3 grid gap-3">
            {recommendations.map((recommendation) => (
              <article
                key={recommendation.key}
                className={`rounded-2xl border px-3.5 py-3 ${RECOMMENDATION_TONE_CLASSES[recommendation.tone]}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-bold">{recommendation.title}</p>
                  {recommendation.preview ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/75">
                      Preview Insight
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/78">{recommendation.body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200/80">
                  Commissioner AI Summary
                </p>
                <p className="mt-1 text-[22px] font-black text-white">League Health: {aiSummary.score}/100</p>
              </div>
              {aiSummary.preview ? (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/60">
                  Preview
                </span>
              ) : (
                <Sparkles className="h-4 w-4 text-violet-200/75" aria-hidden />
              )}
            </div>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-white/78">
              {aiSummary.items.map((item) => (
                <li key={item} className="rounded-xl border border-white/8 bg-black/10 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.08] px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">Recommendation</p>
              <p className="mt-1 text-[12px] leading-relaxed text-cyan-50/85">{aiSummary.recommendation}</p>
            </div>
          </div>

          {shadowDecision ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.08] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                    Decision OS Shadow
                  </p>
                  <p className="mt-1 text-[18px] font-black text-white">
                    {shadowDecision.card.healthScore != null
                      ? `League Health: ${shadowDecision.card.healthScore}/100`
                      : 'Commissioner recommendation ready'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/60">
                    <Telescope className="h-3 w-3" aria-hidden />
                    Shadow Only
                  </span>
                  <p className="mt-2 text-[10px] text-white/45">
                    {shadowDecision.parityPassed == null
                      ? 'Parity pending'
                      : shadowDecision.parityPassed
                        ? 'Parity matched legacy'
                        : 'Parity diff detected'}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[13px] font-semibold text-white/90">{shadowDecision.card.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/70">{shadowDecision.card.subtitle}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-cyan-50/85">{shadowDecision.card.detail}</p>
              {shadowDecision.card.topRisks.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {shadowDecision.card.topRisks.map((risk) => (
                    <span
                      key={risk.label}
                      className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-semibold text-white/70"
                    >
                      {risk.label} {risk.score}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-[11px] leading-relaxed text-white/45">
                Read-only recommendation for scoped Sleeper proofing. No actions execute from this card.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-cyan-300/75" aria-hidden />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">
                Data Foundation Proof
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <ProofStat icon={Users} label="Players" value={foundation.players.toLocaleString()} />
              <ProofStat icon={ShieldCheck} label="Headshots" value={foundation.headshots.toLocaleString()} />
              <ProofStat icon={Activity} label="ADP Rows" value={foundation.adp.toLocaleString()} />
              <ProofStat icon={Waves} label="Injuries" value={foundation.injuries.toLocaleString()} />
              <ProofStat icon={Bot} label="Season Stats" value={foundation.seasonStats.toLocaleString()} />
              <ProofStat
                icon={CalendarClock}
                label="Coverage"
                value={`${foundation.headshotCoveragePct.toFixed(1)}%`}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-white/55">
              Powered by {foundation.players.toLocaleString()} NFL players, {foundation.headshots.toLocaleString()}{' '}
              headshots, {foundation.adp.toLocaleString()} ADP records, and live injury context.
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/42">
              These proof numbers use live commissioner-hub coverage when available and fall back to the current NFL dry-run
              baseline for demo safety.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProofStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
        <Icon className="h-3.5 w-3.5 text-cyan-300/60" aria-hidden />
      </div>
      <p className="mt-2 text-[18px] font-black text-white">{value}</p>
    </div>
  )
}
