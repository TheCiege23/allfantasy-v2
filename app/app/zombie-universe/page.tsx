'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skull, ChevronRight } from 'lucide-react'

interface UniverseRow {
  id: string
  name: string
  sport: string
}

export default function ZombieUniverseListPage() {
  const [universes, setUniverses] = useState<UniverseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch('/api/zombie-universe', { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError('Failed to load universes')
          setUniverses([])
          return
        }
        const data = await res.json()
        setUniverses(Array.isArray(data.universes) ? data.universes : [])
      } catch {
        if (active) setError('Request failed')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/30">
          <Skull className="h-7 w-7 text-rose-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Zombie Universe</h1>
          <p className="text-sm text-white/60">
            Standings, movement, and discussion across linked Zombie leagues.
          </p>
        </div>
      </header>

      {loading && (
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-sm text-white/50">Loading…</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <p className="text-sm text-amber-200">{error}</p>
        </div>
      )}

      {!loading && !error && universes.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm text-white/70">You don’t have any Zombie universes yet.</p>
          <p className="mt-2 text-xs text-white/50">Join a Zombie league that’s part of a universe to see it here.</p>
          <Link
            href="/app/discover"
            className="mt-4 inline-block rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-sm text-rose-200 hover:bg-rose-950/50"
          >
            Discover leagues
          </Link>
        </div>
      )}

      {!loading && !error && universes.length > 0 && (
        <ul className="space-y-2">
          {universes.map((u) => (
            <li key={u.id}>
              <Link
                href={`/app/zombie-universe/${encodeURIComponent(u.id)}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/5"
              >
                <div>
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-xs text-white/50">{u.sport}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/40" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
