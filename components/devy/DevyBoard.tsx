'use client'

/**
 * PROMPT 4: Devy Board — sport-aware filters, year-to-eligibility, projected draft year, risk band, class depth, trend, source confidence, availability/ownership.
 */

import { useState } from 'react'

interface DevyBoardFilters {
  position: string
  draftEligibleYear: string
  riskBand: string
  trend: string
  minConfidence: string
  availability: string
}

const RISK_BANDS = ['ALL', 'low', 'medium', 'high']

const POSITIONS_NFL = ['ALL', 'QB', 'RB', 'WR', 'TE']
const POSITIONS_NBA = ['ALL', 'G', 'F', 'C']
const TRENDS = ['ALL', 'up', 'stable', 'down']
const AVAILABILITY = ['ALL', 'available', 'rostered']

interface DevyBoardProps {
  leagueId: string
  sport: 'NFL' | 'NBA'
  players: Array<{
    id: string
    name: string
    position: string
    school: string
    draftEligibleYear?: number
    projectedDraftRound?: number
    draftProjectionScore?: number
    trend?: string
    riskBand?: 'low' | 'medium' | 'high'
    statusConfidence?: number
    rostered?: boolean
    // NFL-specific
    devyAdp?: number
    recruitingStars?: number
    // NBA-specific
    ppg?: number
    apg?: number
    rpg?: number
    efg?: number
  }>
}

export function DevyBoard({ leagueId, sport, players }: DevyBoardProps) {
  const [filters, setFilters] = useState<DevyBoardFilters>({
    position: 'ALL',
    draftEligibleYear: 'ALL',
    riskBand: 'ALL',
    trend: 'ALL',
    minConfidence: '0',
    availability: 'ALL',
  })

  const positions = sport === 'NFL' ? POSITIONS_NFL : POSITIONS_NBA

  let list = players
  if (filters.position !== 'ALL') {
    list = list.filter((p) => p.position.toUpperCase() === filters.position)
  }
  if (filters.draftEligibleYear !== 'ALL') {
    const y = parseInt(filters.draftEligibleYear, 10)
    list = list.filter((p) => p.draftEligibleYear === y)
  }
  if (filters.trend !== 'ALL') {
    list = list.filter((p) => (p.trend ?? 'stable').toLowerCase() === filters.trend)
  }
  if (filters.minConfidence !== '0') {
    const min = parseInt(filters.minConfidence, 10)
    list = list.filter((p) => (p.statusConfidence ?? 0) >= min)
  }
  if (filters.riskBand !== 'ALL') {
    list = list.filter((p) => (p.riskBand ?? 'medium') === filters.riskBand)
  }
  if (filters.availability === 'rostered') list = list.filter((p) => p.rostered)
  if (filters.availability === 'available') list = list.filter((p) => !p.rostered)

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-base font-semibold text-white">Devy Board</h3>
      <div className="flex flex-wrap gap-2">
        <select
          value={filters.position}
          onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          {positions.map((pos) => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
        <select
          value={filters.draftEligibleYear}
          onChange={(e) => setFilters((f) => ({ ...f, draftEligibleYear: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          <option value="ALL">Any year</option>
          {Array.from(new Set(players.map((p) => p.draftEligibleYear).filter(Boolean))).sort().map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          value={filters.trend}
          onChange={(e) => setFilters((f) => ({ ...f, trend: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          {TRENDS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.minConfidence}
          onChange={(e) => setFilters((f) => ({ ...f, minConfidence: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          <option value="0">Any confidence</option>
          <option value="50">50%+</option>
          <option value="70">70%+</option>
          <option value="90">90%+</option>
        </select>
        <select
          value={filters.riskBand}
          onChange={(e) => setFilters((f) => ({ ...f, riskBand: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          {RISK_BANDS.map((r) => (
            <option key={r} value={r}>{r === 'ALL' ? 'Any risk' : r + ' risk'}</option>
          ))}
        </select>
        <select
          value={filters.availability}
          onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value }))}
          className="rounded border border-white/20 bg-white/5 px-2 py-1 text-sm text-white"
        >
          {AVAILABILITY.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-white/50">
              <th className="pb-2 pr-3 font-medium">Player</th>
              <th className="pb-2 pr-3 font-medium">Pos</th>
              <th className="pb-2 pr-3 font-medium">School</th>
              <th className="pb-2 pr-3 font-medium">Eligible</th>
              {sport === 'NFL' && <>
                <th className="pb-2 pr-3 font-medium">Rd</th>
                <th className="pb-2 pr-3 font-medium">ADP</th>
                <th className="pb-2 pr-3 font-medium">Stars</th>
              </>}
              {sport === 'NBA' && <>
                <th className="pb-2 pr-3 font-medium">PPG</th>
                <th className="pb-2 pr-3 font-medium">APG</th>
                <th className="pb-2 pr-3 font-medium">RPG</th>
                <th className="pb-2 pr-3 font-medium">EFG%</th>
                <th className="pb-2 pr-3 font-medium">Mk Rd</th>
              </>}
              <th className="pb-2 pr-3 font-medium">Conf</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 50).map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 pr-3 font-medium text-white">{p.name}</td>
                <td className="py-2 pr-3 text-white/70">{p.position}</td>
                <td className="py-2 pr-3 text-white/50">{p.school}</td>
                <td className="py-2 pr-3 text-white/50">{p.draftEligibleYear ?? '—'}</td>
                {sport === 'NFL' && <>
                  <td className="py-2 pr-3 text-white/70">{p.projectedDraftRound != null ? `Rd ${p.projectedDraftRound}` : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.devyAdp != null ? p.devyAdp.toFixed(1) : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.recruitingStars != null ? '★'.repeat(Math.min(p.recruitingStars, 5)) : '—'}</td>
                </>}
                {sport === 'NBA' && <>
                  <td className="py-2 pr-3 text-white/70">{p.ppg != null ? p.ppg.toFixed(1) : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.apg != null ? p.apg.toFixed(1) : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.rpg != null ? p.rpg.toFixed(1) : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.efg != null ? (p.efg * 100).toFixed(1) + '%' : '—'}</td>
                  <td className="py-2 pr-3 text-white/70">{p.projectedDraftRound != null ? `Rd ${p.projectedDraftRound}` : '—'}</td>
                </>}
                <td className="py-2 pr-3 text-white/50">{p.statusConfidence != null ? `${p.statusConfidence}%` : '—'}</td>
                <td className="py-2">
                  {p.rostered
                    ? <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-200">Rostered</span>
                    : <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-xs text-green-300">Avail</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > 50 && <p className="text-xs text-white/50">Showing 50 of {list.length}</p>}
    </div>
  )
}
