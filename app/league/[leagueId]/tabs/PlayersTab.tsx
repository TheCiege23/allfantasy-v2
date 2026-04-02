'use client'

import { useCallback, useMemo, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { UserLeague } from '@/app/dashboard/types'

export type PlayersTabProps = {
  league: UserLeague
  onPlayerClick: (playerId: string) => void
}

type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | 'MORE'

const POSITIONS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'MORE']

/** Stub pool for layout — replace with API / getAllPlayers later. */
const STUB_PLAYERS: Array<{ id: string; name: string; pos: string; rostered?: boolean }> = [
  { id: '4046', name: 'Patrick Mahomes', pos: 'QB', rostered: true },
  { id: '4984', name: 'Josh Allen', pos: 'QB', rostered: false },
  { id: '9509', name: 'Bijan Robinson', pos: 'RB', rostered: true },
  { id: '6786', name: 'CeeDee Lamb', pos: 'WR', rostered: false },
  { id: '8130', name: 'Travis Kelce', pos: 'TE', rostered: true },
]

export function PlayersTab({ league, onPlayerClick }: PlayersTabProps) {
  const [pos, setPos] = useState<PosFilter>('ALL')
  const [projection, setProjection] = useState(true)
  const [freeAgents, setFreeAgents] = useState(false)
  const [watchlist, setWatchlist] = useState(false)
  const [rookies, setRookies] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let rows = STUB_PLAYERS
    if (pos !== 'ALL' && pos !== 'MORE') {
      rows = rows.filter((p) => p.pos === pos)
    }
    if (freeAgents) {
      rows = rows.filter((p) => !p.rostered)
    }
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.id.includes(q))
    }
    if (rookies) {
      rows = rows.filter(() => false)
    }
    if (watchlist) {
      rows = rows.filter(() => false)
    }
    return rows
  }, [pos, query, freeAgents, watchlist, rookies])

  const thumb = useCallback(
    (playerId: string) => {
      const s = league.sport.toUpperCase()
      if (s === 'NFL' || s === 'NCAAF') {
        return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
      }
      return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    },
    [league.sport],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 space-y-2 border-b border-white/[0.07] bg-[#07071a] px-5 pb-3 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPos(p)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                pos === p
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
            <button
              type="button"
              onClick={() => setProjection(true)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                projection ? 'bg-white/15 text-white' : 'text-white/45'
              }`}
            >
              Projection
            </button>
            <button
              type="button"
              onClick={() => setProjection(false)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold ${
                !projection ? 'bg-white/15 text-white' : 'text-white/45'
              }`}
            >
              Stats
            </button>
          </div>
          <span className="text-[11px] text-white/45">2026 ▼</span>
          <span className="text-[11px] text-white/45">Week 1 ▼</span>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-white/50">
            <input
              type="checkbox"
              checked={freeAgents}
              onChange={(e) => setFreeAgents(e.target.checked)}
              className="rounded border-white/20"
            />
            Free agents
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-white/50">
            <input
              type="checkbox"
              checked={watchlist}
              onChange={(e) => setWatchlist(e.target.checked)}
              className="rounded border-white/20"
            />
            Watchlist
          </label>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-white/50">
            <input
              type="checkbox"
              checked={rookies}
              onChange={(e) => setRookies(e.target.checked)}
              className="rounded border-white/20"
            />
            Rookies
          </label>
          <button
            type="button"
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/50"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find player"
            className="w-full max-w-xs rounded-xl border border-white/[0.08] bg-[#0c0c1e] px-3 py-2 text-xs text-white placeholder:text-white/35"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto px-5 pb-6">
        <div className="min-w-[720px]">
          <div className="sticky top-0 z-[1] flex border-b border-white/[0.07] bg-[#07071a] py-2 text-[9px] font-semibold uppercase tracking-wide text-white/35">
            <div className="w-8 shrink-0" />
            <div className="w-[200px] shrink-0">Player</div>
            <div className="w-16 shrink-0 text-right">PTS</div>
            <div className="w-28 shrink-0 text-right">RUSH</div>
            <div className="w-36 shrink-0 text-right">REC</div>
            <div className="min-w-0 flex-1 text-right">PASS</div>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPlayerClick(p.id)}
                className="flex w-full items-center gap-2 py-2 text-left transition hover:bg-white/[0.03]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/60">
                  +
                </span>
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/10">
                  <img src={thumb(p.id)} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="w-[200px] shrink-0">
                  <p className="text-xs font-semibold text-white">{p.name}</p>
                  <p className="text-[10px] text-white/40">
                    {p.pos} · {league.sport}
                    {p.rostered ? (
                      <span className="ml-2 rounded border border-white/15 bg-white/5 px-1 text-[9px] text-white/50">
                        ROSTERED
                      </span>
                    ) : (
                      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" title="Free agent" />
                    )}
                  </p>
                </div>
                <div className="w-16 shrink-0 text-right text-[11px] text-white/60">—</div>
                <div className="w-28 shrink-0 text-right text-[10px] text-white/45">— · — · —</div>
                <div className="w-36 shrink-0 text-right text-[10px] text-white/45">— · — · —</div>
                <div className="min-w-0 flex-1 text-right text-[10px] text-white/45">— · — · —</div>
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">No players match filters.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
