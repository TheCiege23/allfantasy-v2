'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ZombieMatchupCard } from '@/app/zombie/components/ZombieMatchupCard'

type M = {
  id: string
  home: { name: string; status: string }
  away: { name: string; status: string }
  homeScore: number | null
  awayScore: number | null
  infectionRisk: 'home' | 'away' | 'none'
}

export default function ZombieMatchupsPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [list, setList] = useState<M[]>([])
  const [week, setWeek] = useState<number>(1)

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { league?: { currentWeek: number } } | null) => {
        if (d?.league?.currentWeek) setWeek(Math.max(1, d.league.currentWeek))
      })
      .catch(() => null)
  }, [leagueId])

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/zombie/matchups?leagueId=${encodeURIComponent(leagueId)}&week=${week}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { matchups?: M[]; week?: number } | null) => {
        if (d?.matchups) setList(d.matchups)
        if (d?.week) setWeek(d.week)
      })
      .catch(() => setList([]))
  }, [leagueId, week])

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
          />
        ))}
        {!list.length ? <p className="text-[13px] text-[var(--zombie-text-dim)]">No matchups loaded yet.</p> : null}
      </div>
    </div>
  )
}
