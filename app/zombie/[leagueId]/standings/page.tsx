'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ZombieStandingsRow } from '@/app/zombie/components/ZombieStandingsRow'

type Row = {
  rosterId: string
  status: string
  wins: number
  losses: number
  pointsFor: number
  fantasyTeamName: string | null
  displayName: string | null
}

export default function ZombieStandingsPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    if (!leagueId) return
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { league?: { teams: Row[] } } | null) => setRows(d?.league?.teams ?? []))
      .catch(() => setRows([]))
  }, [leagueId])

  const sorted = [...rows].sort((a, b) => {
    const rank = (s: string) => {
      const x = s.toLowerCase()
      if (x.includes('survivor') || x.includes('revived')) return 0
      if (x.includes('whisperer')) return 1
      if (x.includes('zombie')) return 2
      return 3
    }
    const dr = rank(a.status) - rank(b.status)
    if (dr !== 0) return dr
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.pointsFor - a.pointsFor
  })

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-white">Standings</h1>
      <div className="overflow-x-auto rounded-xl border border-[var(--zombie-border)]">
        <table className="w-full min-w-[320px] border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--zombie-text-dim)]">
              <th className="p-2">#</th>
              <th className="p-2">St</th>
              <th className="p-2">Team</th>
              <th className="p-2">W-L</th>
              <th className="hidden p-2 sm:table-cell">PPW</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => (
              <ZombieStandingsRow
                key={t.rosterId}
                rank={i + 1}
                name={t.fantasyTeamName || t.displayName || t.rosterId}
                status={t.status}
                wl={`${t.wins}-${t.losses}`}
                ppw={
                  t.wins + t.losses > 0 ? (t.pointsFor / (t.wins + t.losses)).toFixed(2) : (t.pointsFor ?? 0).toFixed(2)
                }
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
