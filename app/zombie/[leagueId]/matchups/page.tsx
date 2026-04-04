'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRedraftStream } from '@/lib/hooks/useRedraftStream'
import { ZombieMatchupCard } from '@/app/zombie/components/ZombieMatchupCard'

type M = {
  id: string
  home: { name: string; status: string }
  away: { name: string; status: string }
  homeScore: number | null
  awayScore: number | null
  infectionRisk: 'home' | 'away' | 'none'
  riskLevel?: 'low' | 'medium' | 'high' | 'critical' | 'na'
  margin?: number
  mySide?: 'home' | 'away' | null
  status?: string
}

export default function ZombieMatchupsPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [list, setList] = useState<M[]>([])
  const [week, setWeek] = useState<number>(1)
  const [rules, setRules] = useState<{ bashingThreshold: number; maulingThreshold: number } | null>(null)
  const [resolution, setResolution] = useState<{ status: string; resolvedAt: string | null } | null>(null)
  const [redraftSeasonId, setRedraftSeasonId] = useState<string | null>(null)
  const lastAnimId = useRef<string | null>(null)

  const { zombieAnimations } = useRedraftStream(redraftSeasonId)

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { league?: { currentWeek: number } } | null) => {
        if (d?.league?.currentWeek) setWeek(Math.max(1, d.league.currentWeek))
      })
      .catch(() => null)
  }, [leagueId])

  const loadMatchups = useCallback(() => {
    if (!leagueId) return
    fetch(`/api/zombie/matchups?leagueId=${encodeURIComponent(leagueId)}&week=${week}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: {
          matchups?: M[]
          week?: number
          redraftSeasonId?: string
          rules?: { bashingThreshold: number; maulingThreshold: number }
          resolution?: { status: string; resolvedAt: string | null } | null
        } | null) => {
          if (d?.matchups) setList(d.matchups)
          if (d?.week) setWeek(d.week)
          if (d?.rules) setRules(d.rules)
          if (d?.resolution !== undefined) setResolution(d.resolution)
          if (d?.redraftSeasonId) setRedraftSeasonId(d.redraftSeasonId)
        },
      )
      .catch(() => setList([]))
  }, [leagueId, week])

  useEffect(() => {
    loadMatchups()
  }, [loadMatchups])

  useEffect(() => {
    if (!leagueId) return
    const t = setInterval(loadMatchups, 30_000)
    return () => clearInterval(t)
  }, [leagueId, loadMatchups])

  useEffect(() => {
    const last = zombieAnimations[zombieAnimations.length - 1] as
      | { type?: string; leagueId?: string; id?: string }
      | undefined
    if (!last || last.type !== 'zombie_event_animation') return
    if (last.leagueId && last.leagueId !== leagueId) return
    if (last.id && lastAnimId.current === last.id) return
    if (last.id) lastAnimId.current = last.id
    loadMatchups()
  }, [zombieAnimations, leagueId, loadMatchups])

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-white">Matchups · Week {week}</h1>
      <div className="flex flex-col gap-3">
        {list.map((m) => (
          <ZombieMatchupCard
            key={m.id}
            homeName={m.home.name}
            awayName={m.away.name}
            homeStatus={m.home.status}
            awayStatus={m.away.status}
            homeScore={m.homeScore}
            awayScore={m.awayScore}
            infectionRisk={m.infectionRisk}
            riskLevel={m.riskLevel ?? 'na'}
            margin={m.margin ?? 0}
            mySide={m.mySide ?? null}
            matchStatus={m.status}
            rules={rules ?? undefined}
            resolutionComplete={resolution?.status === 'complete' && !!resolution?.resolvedAt}
          />
        ))}
        {!list.length ? <p className="text-[13px] text-[var(--zombie-text-dim)]">No matchups loaded yet.</p> : null}
      </div>
    </div>
  )
}
