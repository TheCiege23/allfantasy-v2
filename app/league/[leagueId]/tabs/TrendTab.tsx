'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UserLeague } from '@/app/dashboard/types'

export type TrendTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
}

type TrendPill = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

const PILLS: TrendPill[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

type TrendEntry = { player_id?: string; count?: number }

function sleeperSportParam(sport: string): string {
  const u = sport.toUpperCase()
  if (u === 'NBA') return 'nba'
  return 'nfl'
}

function playerThumb(playerId: string, sport: string): string {
  const s = sport.toUpperCase()
  if (s === 'NFL' || s === 'NCAAF') {
    return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
  }
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
}

export function TrendTab({ league, onPlayerClick }: TrendTabProps) {
  const sportParam = useMemo(() => sleeperSportParam(league.sport), [league.sport])
  const [up, setUp] = useState<TrendEntry[]>([])
  const [down, setDown] = useState<TrendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filterUp, setFilterUp] = useState<TrendPill>('ALL')
  const [filterDown, setFilterDown] = useState<TrendPill>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/league/trend?type=add&sport=${sportParam}`, { cache: 'no-store' }),
        fetch(`/api/league/trend?type=drop&sport=${sportParam}`, { cache: 'no-store' }),
      ])
      if (!a.ok || !b.ok) {
        setErr('Could not load trending players.')
        setUp([])
        setDown([])
        return
      }
      const addJson: unknown = await a.json()
      const dropJson: unknown = await b.json()
      setUp(Array.isArray(addJson) ? (addJson as TrendEntry[]) : [])
      setDown(Array.isArray(dropJson) ? (dropJson as TrendEntry[]) : [])
    } catch {
      setErr('Could not load trending players.')
      setUp([])
      setDown([])
    } finally {
      setLoading(false)
    }
  }, [sportParam])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="grid min-h-0 flex-1 gap-4 p-5 md:grid-cols-2">
      <TrendColumn
        title="Trending up"
        entries={up}
        league={league}
        loading={loading}
        error={err}
        filter={filterUp}
        onFilterChange={setFilterUp}
        onPlayerClick={onPlayerClick}
        sign="add"
      />
      <TrendColumn
        title="Trending down"
        entries={down}
        league={league}
        loading={loading}
        error={err}
        filter={filterDown}
        onFilterChange={setFilterDown}
        onPlayerClick={onPlayerClick}
        sign="drop"
      />
    </div>
  )
}

function TrendColumn({
  title,
  entries,
  league,
  loading,
  error,
  filter,
  onFilterChange,
  onPlayerClick,
  sign,
}: {
  title: string
  entries: TrendEntry[]
  league: UserLeague
  loading: boolean
  error: string | null
  filter: TrendPill
  onFilterChange: (p: TrendPill) => void
  onPlayerClick: (id: string) => void
  sign: 'add' | 'drop'
}) {
  const rows = entries.filter((e) => e.player_id)
  return (
    <section className="flex min-h-[280px] flex-col rounded-2xl border border-white/[0.07] bg-[#0c0c1e]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3">
        <h2 className="text-[14px] font-bold text-white">{title}</h2>
        <div className="flex flex-wrap gap-1">
          {PILLS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange(p)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                filter === p ? 'bg-white/15 text-white' : 'text-white/40'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="px-2 py-6 text-center text-sm text-white/40">Loading…</p>
        ) : error ? (
          <p className="px-2 py-6 text-center text-sm text-amber-300/90">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-white/40">No trending data.</p>
        ) : (
          <ul className="space-y-1">
            {rows.map((e, i) => {
              const id = e.player_id ?? ''
              const delta = typeof e.count === 'number' ? e.count : 0
              return (
                <li key={id || i}>
                  <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] text-white/50">
                      {i + 1}
                    </span>
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/10">
                      <img src={playerThumb(id, league.sport)} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">Player {id.slice(-4)}</p>
                      <p className="text-[10px] text-white/40">— · —</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-bold ${
                          sign === 'add' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {sign === 'add' ? '+' : '-'}
                        {delta}
                      </span>
                      <span className="text-[9px] text-white/40">Rostered —%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPlayerClick(id)}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/70 ${
                        sign === 'add'
                          ? 'bg-white/10 hover:bg-cyan-500/30'
                          : 'bg-white/10 hover:bg-red-500/20'
                      }`}
                      aria-label={sign === 'add' ? 'Add player' : 'Drop player'}
                    >
                      {sign === 'add' ? '+' : '−'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
