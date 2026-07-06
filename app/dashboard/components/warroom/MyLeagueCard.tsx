'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Crown, ShieldCheck } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { ChampionshipGauge } from './ChampionshipGauge'
import { useActivityFeed } from '@/hooks/useActivityFeed'

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

/** Mirrors lib/league-health/league-health-engine.ts's OverallStatus. */
type HealthStatus = 'excellent' | 'healthy' | 'watch' | 'at_risk' | 'critical' | 'unknown'

function healthTone(status: HealthStatus): { color: string; label: string } {
  switch (status) {
    case 'excellent':
      return { color: '#34d399', label: 'Excellent' }
    case 'healthy':
      return { color: '#34d399', label: 'Healthy' }
    case 'watch':
      return { color: '#fbbf24', label: 'Watch' }
    case 'at_risk':
      return { color: '#f87171', label: 'At Risk' }
    case 'critical':
      return { color: '#f87171', label: 'Critical' }
    default:
      return { color: 'rgba(255,255,255,0.35)', label: 'Unknown' }
  }
}

export function MyLeagueCard({ league, userId }: { league: UserLeague; userId: string | null }) {
  const [myTeam, setMyTeam] = useState<MyTeamSummary | null>(null)
  const [forecastRows, setForecastRows] = useState<ForecastRow[] | null>(null)
  const [matchupRows, setMatchupRows] = useState<MatchupRow[] | null>(null)
  const [health, setHealth] = useState<{ status: HealthStatus } | null>(null)
  const { items: activityItems } = useActivityFeed({ limit: 20, leagueId: league.id })

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

    void fetch(`/api/leagues/${encodeURIComponent(league.id)}/matchups`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { matchups?: MatchupRow[] } | null) => {
        if (cancelled || !data?.matchups?.length) return
        setMatchupRows(data.matchups)
      })
      .catch(() => {})

    void fetch('/api/league-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: league.id,
        sport: league.sport,
        leagueType: league.leagueType ?? league.format ?? 'redraft',
        numTeams: league.teamCount ?? 12,
        currentWeek: league.currentWeek ?? 1,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { overallStatus?: string } } | null) => {
        if (cancelled || !data?.data?.overallStatus) return
        const raw = data.data.overallStatus.toLowerCase()
        const known: HealthStatus[] = ['excellent', 'healthy', 'watch', 'at_risk', 'critical']
        const status: HealthStatus = (known as string[]).includes(raw) ? (raw as HealthStatus) : 'unknown'
        setHealth({ status })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [league.id, league.season, league.currentWeek, league.sport, league.leagueType, league.format, league.teamCount, userId])

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
      lastResult: hasResult ? { won: myScore > oppScore, score: `${myScore.toFixed(1)}-${oppScore.toFixed(1)}` } : null,
    }
  }, [matchupRows, myTeam])

  const record = myTeam ? `${myTeam.wins}-${myTeam.losses}${myTeam.ties ? `-${myTeam.ties}` : ''}` : null
  const tone = health ? healthTone(health.status) : null

  return (
    <WarRoomCard className="warroom-fade-in-stagger relative overflow-hidden p-4" accentBorder="rgba(255,255,255,0.08)">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06]">
          {league.logoUrl || league.avatarUrl ? (
            <Image
              src={league.logoUrl || league.avatarUrl || ''}
              alt=""
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
          <p className="mt-0.5 text-[11px] text-white/40">
            {record ? `${record} · Rank #${myTeam?.currentRank ?? '—'}` : league.sport}
          </p>
        </div>
        {tone ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ color: tone.color, background: `${tone.color}1a` }}
          >
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
            {tone.label}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <p className="text-white/35">Next Opponent</p>
          <p className="mt-0.5 truncate font-semibold text-white/85">{matchupInfo?.opponentName ?? '—'}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
          <p className="text-white/35">Last Result</p>
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
          <ChampionshipGauge percent={Math.round(forecast.playoffProbability)} label="Playoff Odds" accent="#22d3ee" size={56} />
          <ChampionshipGauge percent={Math.round(forecast.championshipProbability)} label="Championship" accent="#fbbf24" size={56} />
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
