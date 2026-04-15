'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { ProjectionRow } from '@/components/sports/ProjectionCard'
import { useProjectionsList } from '@/hooks/useProjections'

type SportFilter = 'NFL' | 'NBA' | 'MLB' | 'NHL'
const SPORTS: SportFilter[] = ['NFL', 'NBA', 'MLB', 'NHL']
const POSITIONS: Record<SportFilter, string[]> = {
  NFL: ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
  NBA: ['All', 'PG', 'SG', 'SF', 'PF', 'C'],
  MLB: ['All', 'SP', 'RP', 'C', '1B', '2B', 'SS', '3B', 'OF', 'DH'],
  NHL: ['All', 'C', 'LW', 'RW', 'D', 'G'],
}

export function ProjectionsClient() {
  const [sport, setSport] = useState<SportFilter>('NFL')
  const [position, setPosition] = useState('All')
  const [search, setSearch] = useState('')

  const posFilter = position === 'All' ? undefined : position
  const { data, loading } = useProjectionsList(sport, { position: posFilter, limit: 100 })

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(
      (p) =>
        p.playerName.toLowerCase().includes(q) ||
        (p.team ?? '').toLowerCase().includes(q) ||
        (p.position ?? '').toLowerCase().includes(q)
    )
  }, [data, search])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080c18] via-[#0a0e1a] to-[#0f0f1a]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#080c18]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-white/40 hover:text-white/60">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-black text-white">Player Projections</h1>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Sport */}
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03]">
            {SPORTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSport(s); setPosition('All') }}
                className={`px-3 py-1.5 text-[11px] font-semibold transition ${
                  sport === s ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Position */}
          <div className="flex flex-wrap gap-1">
            {POSITIONS[sport].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(p)}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${
                  position === p ? 'bg-purple-500/15 text-purple-300' : 'text-white/30 hover:text-white/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search player..."
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-1.5 pl-8 pr-3 text-[12px] text-white placeholder:text-white/25 focus:border-cyan-500/30 focus:outline-none"
            />
          </div>
        </div>

        {/* Column header */}
        <div className="mb-2 flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-wide text-white/20">
          <span className="flex-1">Player</span>
          <span className="w-14 text-right">Proj</span>
          <span className="w-14 text-right">Delta</span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-white/40">No projection data available.</p>
            <p className="mt-1 text-xs text-white/20">Projections are populated by the import-projections cron and player analytics engine.</p>
          </div>
        ) : (
          <div className="space-y-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            {filtered.map((p, i) => (
              <Link
                key={`${p.playerName}-${i}`}
                href={`/player/${encodeURIComponent(p.playerName.toLowerCase().replace(/\s+/g, '-'))}`}
                className="block rounded-lg px-1 py-0.5 transition hover:bg-white/[0.04]"
              >
                <ProjectionRow
                  playerName={p.playerName}
                  position={p.position}
                  team={p.team}
                  projected={p.projectedPoints}
                  delta={p.delta}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
