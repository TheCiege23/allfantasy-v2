'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Plus } from 'lucide-react'

interface TournamentItem {
  id: string
  name: string
  sport: string
  season: number
  status: string
  createdAt: string
  leagueCount: number
}

export default function TournamentListPage() {
  const [tournaments, setTournaments] = useState<TournamentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch('/api/tournament', { cache: 'no-store' })
        if (!active) return
        const data = await res.json().catch(() => ({}))
        setTournaments(data.tournaments ?? [])
      } catch {
        if (active) setTournaments([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-950/20">
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Tournaments</h1>
            <p className="text-sm text-white/60">Multi-league elimination events</p>
          </div>
        </div>
        <Link
          href="/app/tournament/create"
          className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-600/30 px-4 py-2.5 font-medium text-white hover:bg-amber-600/50"
        >
          <Plus className="h-5 w-5" /> Create tournament
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
          Loading…
        </div>
      ) : tournaments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-white/70">You haven’t created any tournaments yet.</p>
          <Link
            href="/app/tournament/create"
            className="mt-4 inline-block rounded-xl border border-amber-500/40 bg-amber-600/30 px-4 py-2.5 font-medium text-white hover:bg-amber-600/50"
          >
            Create tournament
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/app/tournament/${t.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-white">{t.name}</h2>
                    <p className="text-sm text-white/50">
                      {t.sport} · {t.season} · {t.leagueCount} leagues · {t.status}
                    </p>
                  </div>
                  <span className="text-white/40">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
