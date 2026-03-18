'use client'

import { useEffect, useState, useMemo } from 'react'
import { Skull, Search, Filter } from 'lucide-react'
import type { ZombieUniverseStandingsRow, ZombieMovementProjection } from './types'

export interface ZombieUniverseStandingsClientProps {
  universeId: string
  season?: number
}

export function ZombieUniverseStandingsClient({ universeId, season }: ZombieUniverseStandingsClientProps) {
  const [standings, setStandings] = useState<ZombieUniverseStandingsRow[]>([])
  const [movement, setMovement] = useState<ZombieMovementProjection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const url = new URL(`/api/zombie-universe/${encodeURIComponent(universeId)}/standings`, window.location.origin)
        if (season != null) url.searchParams.set('season', String(season))
        const res = await fetch(url.toString(), { cache: 'no-store' })
        if (!active) return
        if (!res.ok) {
          setError('Failed to load standings')
          return
        }
        const data = await res.json()
        setStandings(Array.isArray(data.standings) ? data.standings : [])
        setMovement(Array.isArray(data.movementProjections) ? data.movementProjections : [])
      } catch {
        if (active) setError('Request failed')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [universeId, season])

  const movementByRoster = useMemo(() => {
    const m = new Map<string, ZombieMovementProjection>()
    for (const p of movement) m.set(p.rosterId, p)
    return m
  }, [movement])

  const filtered = useMemo(() => {
    let list = standings
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.rosterId.toLowerCase().includes(q) ||
          r.levelName.toLowerCase().includes(q)
      )
    }
    if (filterLevel) list = list.filter((r) => r.levelId === filterLevel || r.levelName === filterLevel)
    if (filterStatus) list = list.filter((r) => r.status === filterStatus)
    return list
  }, [standings, search, filterLevel, filterStatus])

  const levels = useMemo(() => {
    const set = new Set(standings.map((r) => r.levelName))
    return [...set].sort()
  }, [standings])
  const statuses = useMemo(() => {
    const set = new Set(standings.map((r) => r.status))
    return [...set].sort()
  }, [standings])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm text-white/60">Loading standings…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <p className="text-sm text-amber-200">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
        </div>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          <option value="">All levels</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 font-medium text-white/80">Level</th>
              <th className="p-3 font-medium text-white/80">Team</th>
              <th className="p-3 font-medium text-white/80">Status</th>
              <th className="p-3 font-medium text-white/80 text-right">Points</th>
              <th className="p-3 font-medium text-white/80 text-right">Winnings</th>
              <th className="p-3 font-medium text-white/80 text-right">Serums</th>
              <th className="p-3 font-medium text-white/80 text-right">Weapons</th>
              <th className="p-3 font-medium text-white/80">Week killed</th>
              <th className="p-3 font-medium text-white/80">Projected level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const proj = movementByRoster.get(r.rosterId)
              return (
                <tr key={`${r.leagueId}-${r.rosterId}`} className="border-b border-white/5">
                  <td className="p-3 text-white/90">{r.levelName}</td>
                  <td className="p-3 text-white/90">{r.rosterId}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        r.status === 'Whisperer'
                          ? 'bg-amber-500/20 text-amber-200'
                          : r.status === 'Zombie'
                            ? 'bg-rose-500/20 text-rose-200'
                            : 'bg-emerald-500/20 text-emerald-200'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-white/80">{r.totalPoints.toFixed(1)}</td>
                  <td className="p-3 text-right tabular-nums text-white/80">{r.winnings.toFixed(1)}</td>
                  <td className="p-3 text-right tabular-nums text-white/80">{r.serums}</td>
                  <td className="p-3 text-right tabular-nums text-white/80">{r.weapons}</td>
                  <td className="p-3 text-white/70">{r.weekKilled ?? '—'}</td>
                  <td className="p-3 text-white/70">{proj?.projectedLevelId ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-white/50">No rows match your filters.</p>
      )}
    </div>
  )
}
