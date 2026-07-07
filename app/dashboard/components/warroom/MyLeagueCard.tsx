'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Crown, DollarSign, ShieldCheck } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { ChampionshipGauge } from './ChampionshipGauge'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import { useLeagueHealth, type HealthStatus } from './useLeagueHealth'
import { useCountUp } from './useCountUp'
import { formatRelativeTime } from './TodayTimeline'
import type { InterpolationVars } from '@/lib/i18n/tInterpolate'

type WaiverTimingProp = { nextWaiverProcessKnown: boolean; nextWaiverProcessIsoUtc: string | null } | null

type MyTeamSummary = {
  externalId: string
  wins: number
  losses: number
  ties: number
  currentRank: number | null
  pointsFor: number
}

type ForecastRow = {
  teamId: string
  playoffProbability: number
  championshipProbability: number
}

type MatchupRow = {
  teamAId?: string
  teamBId?: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
}

/** Real values from the League Lifecycle enum (see app/dashboard/types.ts). "complete" is the legacy
 *  coarse `status` spelling; "completed" is the precise `lifecycleState` spelling — normalized below. */
export const LIFECYCLE_KEY: Record<string, string> = {
  setup: 'dashboard.warroom.lifecycle.setup',
  pre_draft: 'dashboard.warroom.lifecycle.preDraft',
  drafting: 'dashboard.warroom.lifecycle.drafting',
  post_draft: 'dashboard.warroom.lifecycle.postDraft',
  in_season: 'dashboard.warroom.lifecycle.inSeason',
  playoffs: 'dashboard.warroom.lifecycle.playoffs',
  completed: 'dashboard.warroom.lifecycle.completed',
  offseason: 'dashboard.warroom.lifecycle.offseason',
  renewal_pending: 'dashboard.warroom.lifecycle.renewalPending',
  archived: 'dashboard.warroom.lifecycle.archived',
}

/** Raw normalized lifecycle stage (e.g. 'pre_draft'), independent of its i18n key — shared with DashboardOverview. */
export function rawStage(league: UserLeague): string | null {
  const raw = league.lifecycleState || league.status
  if (!raw) return null
  return raw === 'complete' ? 'completed' : raw
}

function stageKey(league: UserLeague): string | null {
  const stage = rawStage(league)
  if (!stage) return null
  return LIFECYCLE_KEY[stage] ?? null
}

/** Phase 2.6A — sport accent color for the card's left edge + art glow, so each league
 *  reads as its own place rather than an interchangeable gray tile. */
const SPORT_ACCENT: Record<string, string> = {
  NFL: '#f5c451',
  NBA: '#fb923c',
  MLB: '#38bdf8',
  NHL: '#22d3ee',
}

function sportAccent(sport: string): string {
  return SPORT_ACCENT[sport.toUpperCase()] ?? 'rgba(255,255,255,0.14)'
}

/** Compact "Draft in 3d 4h" style countdown for pre-draft leagues with a known date. */
function formatDraftCountdown(
  draftDate: string,
  t: (key: string) => string,
  tInterpolate: (key: string, vars?: InterpolationVars) => string,
): string | null {
  const ms = new Date(draftDate).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  if (days > 0) return tInterpolate('dashboard.warroom.myLeagueCard.draftCountdownDays', { d: days, h: hours })
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return tInterpolate('dashboard.warroom.myLeagueCard.draftCountdownHours', { h: hours, m: minutes })
  return t('dashboard.warroom.myLeagueCard.draftCountdownSoon')
}

function healthTone(status: HealthStatus): { color: string; labelKey: string } {
  switch (status) {
    case 'excellent':
      return { color: '#34d399', labelKey: 'dashboard.warroom.health.excellent' }
    case 'healthy':
      return { color: '#34d399', labelKey: 'dashboard.warroom.health.healthy' }
    case 'watch':
      return { color: '#fbbf24', labelKey: 'dashboard.warroom.health.watch' }
    case 'at_risk':
      return { color: '#f87171', labelKey: 'dashboard.warroom.health.atRisk' }
    case 'critical':
      return { color: '#f87171', labelKey: 'dashboard.warroom.health.critical' }
    default:
      return { color: 'rgba(255,255,255,0.35)', labelKey: 'dashboard.warroom.health.unknown' }
  }
}

export function MyLeagueCard({
  league,
  userId,
  waiverTiming = null,
}: {
  league: UserLeague
  userId: string | null
  /** Only meaningful when this card's league is the primary league the timing was computed for. */
  waiverTiming?: WaiverTimingProp
}) {
  const { t, tInterpolate } = useLanguage()
  const [myTeam, setMyTeam] = useState<MyTeamSummary | null>(null)
  const [forecastRows, setForecastRows] = useState<ForecastRow[] | null>(null)
  const [matchupRows, setMatchupRows] = useState<MatchupRow[] | null>(null)
  const { items: activityItems } = useActivityFeed({ limit: 20, leagueId: league.id })
  const health = useLeagueHealth(league)

  const commissionerNotice = activityItems.find((i) => i.type === 'announcement') ?? null

  useEffect(() => {
    let cancelled = false

    void fetch(`/api/league/detail?leagueId=${encodeURIComponent(league.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            teams?: Array<{
              externalId: string
              claimedByUserId: string | null
              wins: number
              losses: number
              ties: number
              currentRank: number | null
              pointsFor: number
            }>
          } | null,
        ) => {
          if (cancelled || !data?.teams) return
          const mine = userId ? data.teams.find((t) => t.claimedByUserId === userId) : null
          if (mine) {
            setMyTeam({
              externalId: mine.externalId,
              wins: mine.wins,
              losses: mine.losses,
              ties: mine.ties,
              currentRank: mine.currentRank,
              pointsFor: mine.pointsFor,
            })
          }
        },
      )
      .catch(() => {})

    const season = typeof league.season === 'number' ? league.season : new Date().getFullYear()
    const week = league.currentWeek ?? 1
    void fetch(`/api/leagues/${encodeURIComponent(league.id)}/season-forecast?season=${season}&week=${week}`, {
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { teamForecasts?: ForecastRow[] } | null) => {
        if (cancelled || !data?.teamForecasts) return
        setForecastRows(data.teamForecasts)
      })
      .catch(() => {})

    const stage = league.lifecycleState || league.status
    const hasMatchups = stage === 'in_season' || stage === 'playoffs'
    if (hasMatchups) {
      void fetch(`/api/leagues/${encodeURIComponent(league.id)}/matchups`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { matchups?: MatchupRow[] } | null) => {
          if (cancelled || !data?.matchups?.length) return
          setMatchupRows(data.matchups)
        })
        .catch(() => {})
    }

    return () => {
      cancelled = true
    }
  }, [league.id, league.season, league.currentWeek, league.lifecycleState, league.status, userId])

  const forecast = useMemo(
    () => (myTeam ? (forecastRows?.find((r) => r.teamId === myTeam.externalId) ?? null) : null),
    [forecastRows, myTeam],
  )

  const matchupInfo = useMemo(() => {
    if (!myTeam || !matchupRows?.length) return null
    const mine = matchupRows.find((m) => m.teamAId === myTeam.externalId || m.teamBId === myTeam.externalId)
    if (!mine) return null
    const iAmA = mine.teamAId === myTeam.externalId
    const opponentName = iAmA ? mine.teamBName : mine.teamAName
    const myScore = iAmA ? mine.scoreA : mine.scoreB
    const oppScore = iAmA ? mine.scoreB : mine.scoreA
    const hasResult = myScore > 0 || oppScore > 0
    return {
      opponentName,
      // W/L are kept as universal single-letter sports abbreviations (same convention as "NFL"/"PPR"),
      // not translated per-locale — matches how fantasy platforms present these across languages.
      lastResult: hasResult ? { won: myScore > oppScore, score: `${myScore.toFixed(1)}-${oppScore.toFixed(1)}` } : null,
    }
  }, [matchupRows, myTeam])

  const record = myTeam ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ''}` : null
  const tone = health ? healthTone(health.status) : null
  const stage = stageKey(league)
  const accent = sportAccent(league.sport)
  const draftCountdown =
    rawStage(league) === 'pre_draft' && league.draftDate
      ? formatDraftCountdown(league.draftDate, t, tInterpolate)
      : null

  const narrativeParts: string[] = []
  if (matchupInfo?.opponentName) {
    narrativeParts.push(tInterpolate('dashboard.warroom.myLeagueCard.vsOpponent', { opponent: matchupInfo.opponentName }))
  }
  if (waiverTiming?.nextWaiverProcessKnown && waiverTiming.nextWaiverProcessIsoUtc) {
    narrativeParts.push(
      tInterpolate('dashboard.warroom.myLeagueCard.waiversNote', {
        time: formatRelativeTime(waiverTiming.nextWaiverProcessIsoUtc, tInterpolate),
      }),
    )
  }
  const narrativeLine = narrativeParts.length > 0 ? narrativeParts.join(' · ') : null

  // Animated win count — a satisfying, readable size unlike the small inline record/rank
  // text further down, which stays static (mirrors ChampionshipGauge's count-up pattern).
  const winsCountUp = useCountUp<HTMLSpanElement>(myTeam?.wins ?? 0, 700)

  return (
    <WarRoomCard
      className="warroom-fade-in-stagger relative overflow-hidden p-4 pl-[18px]"
      accentBorder={`${accent}33`}
    >
      {/* Sport-color identity bar — each league reads as its own place, not an interchangeable tile. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]"
          style={{ boxShadow: `0 0 0 1px ${accent}40` }}
        >
          {league.logoUrl || league.avatarUrl ? (
            <Image
              src={league.logoUrl || league.avatarUrl || ''}
              alt={league.name}
              width={44}
              height={44}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[11px] font-bold text-white/40">{league.sport}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {league.isCommissioner ? <Crown className="h-3 w-3 shrink-0 text-amber-400" aria-hidden /> : null}
            <Link href={`/league/${league.id}`} className="truncate text-[14px] font-bold text-white hover:text-cyan-200">
              {league.name}
            </Link>
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/40">
            {record ? (
              <span>
                <span ref={winsCountUp.ref} className="text-[13px] font-bold text-white/80">
                  {winsCountUp.value}
                </span>
                {`-${myTeam?.losses}${myTeam?.ties ? `-${myTeam.ties}` : ''} · ${tInterpolate('dashboard.warroom.myLeagueCard.rankLabel', { rank: myTeam?.currentRank ?? '—' })}`}
              </span>
            ) : (
              <span>{league.sport}</span>
            )}
            {stage ? <span className="text-white/25">· {t(stage)}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {draftCountdown ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-300">
              <Clock className="h-2.5 w-2.5" aria-hidden />
              {draftCountdown}
            </span>
          ) : null}
          {tone ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ color: tone.color, background: `${tone.color}1a` }}
            >
              <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
              {t(tone.labelKey)}
            </span>
          ) : null}
          {league.isPaid ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
              <DollarSign className="h-2.5 w-2.5" aria-hidden />
              {league.entryFee
                ? tInterpolate('dashboard.warroom.myLeagueCard.entryFeeBadge', { amount: league.entryFee })
                : t('dashboard.warroom.myLeagueCard.paidLeague')}
            </span>
          ) : null}
        </div>
      </div>

      {narrativeLine ? (
        <p className="mt-3 truncate text-[13px] font-semibold text-cyan-100/90">{narrativeLine}</p>
      ) : null}

      <div className="mt-3.5 grid grid-cols-2 gap-2.5 text-[11px]">
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <p className="text-white/35">{t('dashboard.warroom.myLeagueCard.nextOpponent')}</p>
          <p className="mt-0.5 truncate font-semibold text-white/85">{matchupInfo?.opponentName ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <p className="text-white/35">{t('dashboard.warroom.myLeagueCard.lastResult')}</p>
          <p
            className={`mt-0.5 font-semibold ${
              matchupInfo?.lastResult ? (matchupInfo.lastResult.won ? 'text-emerald-300' : 'text-white/60') : 'text-white/60'
            }`}
          >
            {matchupInfo?.lastResult ? `${matchupInfo.lastResult.won ? 'W' : 'L'} ${matchupInfo.lastResult.score}` : '—'}
          </p>
        </div>
      </div>

      {forecast ? (
        <div className="mt-3 flex items-center justify-center gap-4 border-t border-white/[0.06] pt-3">
          <ChampionshipGauge
            percent={Math.round(forecast.playoffProbability)}
            label={t('dashboard.warroom.myLeagueCard.playoffOdds')}
            accent="#22d3ee"
            size={56}
          />
          <ChampionshipGauge
            percent={Math.round(forecast.championshipProbability)}
            label={t('dashboard.warroom.myLeagueCard.championship')}
            accent="#fbbf24"
            size={56}
          />
        </div>
      ) : null}

      {commissionerNotice ? (
        <p className="mt-3 truncate border-t border-white/[0.06] pt-2 text-[11px] text-white/45">
          📣 {commissionerNotice.description}
        </p>
      ) : null}
    </WarRoomCard>
  )
}
