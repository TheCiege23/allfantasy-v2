'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Target, AlertCircle } from 'lucide-react'

interface TeamViewData {
  tournamentId: string
  tournamentName: string
  conferenceName: string
  phase: string
  roundIndex: number
  bracketLabel: string | null
  status: 'active' | 'eliminated'
  eliminatedAtRoundIndex: number | null
  rankInConference: number | null
  wins: number
  losses: number
  pointsFor: number
  advancementStatus: 'advanced' | 'bubble' | 'out' | null
  cutLine: number
  nextMilestone: string
}

export function TournamentTeamView({ leagueId, userId }: { leagueId: string; userId: string }) {
  const [data, setData] = useState<TeamViewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const ctxRes = await fetch(`/api/leagues/${encodeURIComponent(leagueId)}/tournament-context`, { cache: 'no-store' })
        if (!active) return
        const ctx = await ctxRes.json().catch(() => ({}))
        const t = ctx.tournament
        if (!t?.tournamentId) {
          setData(null)
          return
        }
        const [standRes, partRes] = await Promise.all([
          fetch(`/api/tournament/${encodeURIComponent(t.tournamentId)}/standings`, { cache: 'no-store' }),
          fetch(`/api/tournament/${encodeURIComponent(t.tournamentId)}/participant`, { cache: 'no-store' }),
        ])
        if (!active) return
        const standData = standRes.ok ? await standRes.json().catch(() => ({})) : {}
        const standings = standData.standings ?? []
        const myRow = standings.find((r: { userId: string | null }) => r.userId === userId)
        const rankInConference = myRow?.rankInConference ?? null
        const wins = myRow?.wins ?? 0
        const losses = myRow?.losses ?? 0
        const pointsFor = myRow?.pointsFor ?? 0
        const advancementStatus = myRow?.advancementStatus ?? null
        const cutLine = standData.cutLine ?? 32
        let status: 'active' | 'eliminated' = 'active'
        let eliminatedAtRoundIndex: number | null = null
        const partData = partRes.ok ? await partRes.json().catch(() => ({})) : {}
        const me = partData.participant
        let bracketLabel: string | null = t.bracketLabel ?? null
        if (me) {
          status = me.status ?? 'active'
          eliminatedAtRoundIndex = me.eliminatedAtRoundIndex ?? null
          if (me.bracketLabel) bracketLabel = me.bracketLabel
        }
        const nextMilestone =
          status === 'eliminated'
            ? 'You were eliminated.'
            : advancementStatus === 'advanced'
              ? 'You are in an advancement spot. Keep it up.'
              : advancementStatus === 'bubble'
                ? `Bubble: need to hold rank (cut line: top ${cutLine}).`
                : `Need to reach top ${cutLine} in conference to advance.`

        setData({
          tournamentId: t.tournamentId,
          tournamentName: t.tournamentName,
          conferenceName: t.conferenceName,
          phase: t.phase,
          roundIndex: t.roundIndex ?? 0,
          bracketLabel,
          status,
          eliminatedAtRoundIndex,
          rankInConference,
          wins,
          losses,
          pointsFor,
          advancementStatus,
          cutLine,
          nextMilestone,
        })
      } catch {
        if (active) setData(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [leagueId, userId])

  if (loading || !data) return null

  return (
    <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-950/30">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="font-medium text-amber-200">{data.tournamentName}</p>
            <p className="text-sm text-white/60">
              {data.conferenceName}
              {data.bracketLabel ? ` · ${data.bracketLabel}` : ''} · {data.phase}
            </p>
          </div>
        </div>
        <Link
          href={`/app/tournament/${data.tournamentId}`}
          className="text-sm text-amber-400 hover:text-amber-300"
        >
          Tournament hub →
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        {data.rankInConference != null && (
          <span className="text-white/80">
            <Target className="mr-1 inline h-4 w-4" /> Conf rank #{data.rankInConference}
          </span>
        )}
        <span className="text-white/80">Record: {data.wins}-{data.losses}</span>
        <span className="text-white/80">PF: {data.pointsFor.toFixed(0)}</span>
        {data.advancementStatus && (
          <span
            className={
              data.advancementStatus === 'advanced'
                ? 'text-amber-400'
                : data.advancementStatus === 'bubble'
                  ? 'text-yellow-500'
                  : 'text-white/50'
            }
          >
            {data.advancementStatus === 'advanced' && 'Advanced'}
            {data.advancementStatus === 'bubble' && 'Bubble'}
            {data.advancementStatus === 'out' && 'Out'}
          </span>
        )}
        {data.status === 'eliminated' && (
          <span className="inline-flex items-center gap-1 rounded bg-red-950/40 px-2 py-0.5 text-red-300">
            <AlertCircle className="h-3.5 w-3.5" /> Eliminated
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-white/60">{data.nextMilestone}</p>
    </div>
  )
}
