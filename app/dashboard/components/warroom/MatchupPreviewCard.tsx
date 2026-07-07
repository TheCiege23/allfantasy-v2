'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { UserLeague } from '../../types'
import { WarRoomCard } from './WarRoomCard'
import { useReducedMotion } from './useWarRoomMotion'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'

type MatchupRow = {
  teamAId?: string
  teamBId?: string
  teamAName: string
  teamBName: string
  scoreA: number
  scoreB: number
  projA: number
  projB: number
  winProbA: number
}

/**
 * Fetches this league's current matchups and renders the row that belongs to the user, if resolvable.
 * `fallback` (default null) renders when no matchup row is resolvable — lets a caller (e.g. Team Focus's
 * TeamThisWeek) show an honest empty state for an in-season league that has no matchup data yet, instead
 * of this card silently disappearing. Existing callers that omit it keep the prior null behavior.
 */
export function MatchupPreviewCard({
  league,
  userId,
  fallback = null,
}: {
  league: UserLeague
  userId: string | null
  fallback?: ReactNode
}) {
  const { t, tInterpolate } = useLanguage()
  const [myExternalId, setMyExternalId] = useState<string | null>(null)
  const [rows, setRows] = useState<MatchupRow[] | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/league/detail?leagueId=${encodeURIComponent(league.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { teams?: Array<{ externalId: string; claimedByUserId: string | null }> } | null) => {
        if (cancelled || !data?.teams || !userId) return
        const mine = data.teams.find((t) => t.claimedByUserId === userId)
        if (mine) setMyExternalId(mine.externalId)
      })
      .catch(() => {})

    void fetch(`/api/leagues/${encodeURIComponent(league.id)}/matchups`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { matchups?: MatchupRow[] } | null) => {
        if (cancelled || !data?.matchups?.length) return
        setRows(data.matchups)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [league.id, userId])

  const mine = useMemo(() => {
    if (!rows?.length) return null
    if (myExternalId) {
      const found = rows.find((m) => m.teamAId === myExternalId || m.teamBId === myExternalId)
      if (found) return found
    }
    return rows[0] ?? null
  }, [rows, myExternalId])

  if (!mine) return <>{fallback}</>

  const iAmA = myExternalId ? mine.teamAId === myExternalId : true
  const myName = iAmA ? mine.teamAName : mine.teamBName
  const oppName = iAmA ? mine.teamBName : mine.teamAName
  const myScore = iAmA ? mine.scoreA : mine.scoreB
  const oppScore = iAmA ? mine.scoreB : mine.scoreA
  const myProj = iAmA ? mine.projA : mine.projB
  const oppProj = iAmA ? mine.projB : mine.projA
  const myWinProb = Math.round((iAmA ? mine.winProbA : 1 - mine.winProbA) * 100)
  const Trend = myWinProb >= 50 ? TrendingUp : TrendingDown
  // Phase 3.2 — projected margin (current status, not momentum: win-prob has no stored history).
  const projMargin = Math.round((myProj - oppProj) * 10) / 10

  return (
    <WarRoomCard className="warroom-fade-in-stagger p-4" accentBorder="rgba(34,211,238,0.18)">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/70">{league.name}</p>
        <Trend className={`h-3.5 w-3.5 ${myWinProb >= 50 ? 'text-emerald-300' : 'text-white/40'}`} aria-hidden />
      </div>
      <div className="flex items-center justify-between text-[13px] font-semibold text-white">
        <span className="truncate">{myName}</span>
        <span className="tabular-nums">{myScore.toFixed(1)}</span>
      </div>
      <p className="text-[10px] text-white/35">
        {tInterpolate('dashboard.warroom.matchup.proj', { value: myProj.toFixed(1) })}
      </p>
      <div className="mt-1.5 flex items-center justify-between text-[13px] text-white/70">
        <span className="truncate">{oppName}</span>
        <span className="tabular-nums">{oppScore.toFixed(1)}</span>
      </div>
      <p className="text-[10px] text-white/35">
        {tInterpolate('dashboard.warroom.matchup.proj', { value: oppProj.toFixed(1) })}
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
          <span className="flex items-center gap-1.5">
            {t('dashboard.warroom.matchup.winProbability')}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                projMargin >= 0 ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
              }`}
            >
              {tInterpolate('dashboard.warroom.matchup.projMargin', {
                margin: `${projMargin >= 0 ? '+' : ''}${projMargin.toFixed(1)}`,
              })}
            </span>
          </span>
          <span className="font-semibold text-white/70">{myWinProb}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ width: `${myWinProb}%`, transition: reduced ? 'none' : 'width 400ms ease-out' }}
          />
        </div>
      </div>
    </WarRoomCard>
  )
}
