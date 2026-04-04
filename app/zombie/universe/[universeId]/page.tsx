'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ZombieEventFeed } from '@/app/zombie/components/ZombieEventFeed'

export default function ZombieUniverseHubPage() {
  const { universeId } = useParams<{ universeId: string }>()
  const [data, setData] = useState<{
    universe: { name: string; sport: string; leagues: { leagueId: string; name: string | null }[] }
    counts: { survivorCount: number; zombieCount: number; whispererCount: number; leagueCount: number }
    animations: Array<{
      id: string
      animationType: string
      week: number
      metadata: unknown
      createdAt: string
      leagueId: string
    }>
    announcements: Array<{
      id: string
      type: string
      title: string
      content: string
      week: number | null
      createdAt: string
    }>
    topByPpw: Array<{ displayName: string; leagueName: string; currentSeasonPPW: number }>
  } | null>(null)

  useEffect(() => {
    if (!universeId) return
    fetch(`/api/zombie/universe-hub?universeId=${encodeURIComponent(universeId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
  }, [universeId])

  if (!data?.universe) {
    return <p className="text-[13px] text-[var(--zombie-text-dim)]">Loading universe…</p>
  }

  const u = data.universe

  return (
    <div className="min-h-screen bg-[var(--zombie-bg)] px-4 py-6 text-[var(--zombie-text-mid)]">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[var(--zombie-red)]">{u.name}</h1>
        <p className="mt-1 text-[13px] text-[var(--zombie-text-mid)]">
          {u.sport} · {data.counts.leagueCount} leagues
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-[12px]">
          <span>🧍 {data.counts.survivorCount} Survivors</span>
          <span>🧟 {data.counts.zombieCount} Zombies</span>
          <span>🎭 {data.counts.whispererCount} Whisperers</span>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-[12px] font-bold uppercase text-[var(--zombie-text-dim)]">Top survivors (PPW)</h2>
        <div className="overflow-x-auto rounded-xl border border-[var(--zombie-border)]">
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase text-[var(--zombie-text-dim)]">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Name</th>
                <th className="p-2">League</th>
                <th className="p-2">PPW</th>
              </tr>
            </thead>
            <tbody>
              {data.topByPpw.map((r, i) => (
                <tr key={`${r.displayName}-${i}`} className="border-t border-white/[0.06]">
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2 text-white">{r.displayName}</td>
                  <td className="p-2">{r.leagueName}</td>
                  <td className="p-2">{r.currentSeasonPPW.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-[12px] font-bold uppercase text-[var(--zombie-text-dim)]">Notable events</h2>
        <ZombieEventFeed
          animations={data.animations.map((a) => ({
            id: a.id,
            animationType: a.animationType,
            week: a.week,
            metadata: a.metadata,
            createdAt: a.createdAt,
          }))}
          announcements={data.announcements}
          maxItems={8}
        />
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-bold uppercase text-[var(--zombie-text-dim)]">Leagues</h2>
        <ul className="space-y-2">
          {u.leagues.map((l) => (
            <li key={l.leagueId}>
              <Link href={`/zombie/${l.leagueId}`} className="text-sky-400 hover:text-sky-300">
                {l.name ?? l.leagueId}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
