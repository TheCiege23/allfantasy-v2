'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { DraftPlayerRow } from '../types'

const POS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

type Props = {
  draftedIds: Set<string>
  onDraft: (p: DraftPlayerRow) => void
  onQueue: (p: DraftPlayerRow) => void
  canDraft: boolean
}

export function PlayerPool({ draftedIds, onDraft, onQueue, canDraft }: Props) {
  const [players, setPlayers] = useState<DraftPlayerRow[]>([])
  const [pos, setPos] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [hideDrafted, setHideDrafted] = useState(true)
  const [watchOnly, setWatchOnly] = useState(false)
  const [rookiesOnly, setRookiesOnly] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim().toLowerCase()), 200)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetch('/api/draft/players?sport=NFL')
      .then((r) => r.json())
      .then((j: { players?: DraftPlayerRow[] }) => {
        if (!cancelled) setPlayers(j.players ?? [])
      })
      .catch(() => {
        if (!cancelled) setPlayers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (hideDrafted && draftedIds.has(p.id)) return false
      if (pos !== 'ALL' && p.position !== pos) return false
      if (debounced && !p.name.toLowerCase().includes(debounced)) return false
      if (watchOnly) return false
      if (rookiesOnly) return false
      return true
    })
  }, [players, draftedIds, pos, debounced, hideDrafted, watchOnly, rookiesOnly])

  const toggleWatch = useCallback(() => {
    setWatchOnly((w) => !w)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1117]">
      <div className="shrink-0 border-b border-white/[0.06] p-2">
        <div className="flex flex-wrap gap-1">
          {POS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPos(p)}
              className={cn(
                'rounded px-2 py-0.5 text-[10px] font-semibold',
                pos === p ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/[0.04] text-white/45',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="mt-2 w-full rounded border border-white/[0.08] bg-black/30 px-2 py-1 text-[11px] text-white"
        />
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/50">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={hideDrafted} onChange={(e) => setHideDrafted(e.target.checked)} />
            Hide drafted
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={watchOnly} onChange={toggleWatch} />
            Watchlist only
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={rookiesOnly} onChange={(e) => setRookiesOnly(e.target.checked)} />
            Rookies only
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <table className="w-full text-left text-[10px]">
          <thead className="sticky top-0 bg-[#0d1117] text-white/40">
            <tr>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">Player</th>
              <th className="px-2 py-1">Pos</th>
              <th className="px-2 py-1">ADP</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((p, idx) => (
              <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-1 text-white/35">{idx + 1}</td>
                <td className="max-w-[140px] truncate px-2 py-1 font-medium text-white/90">{p.name}</td>
                <td className="px-2 py-1 text-white/55">{p.position}</td>
                <td className="px-2 py-1 text-white/45">{p.adp}</td>
                <td className="whitespace-nowrap px-2 py-1">
                  <button
                    type="button"
                    onClick={() => onQueue(p)}
                    className="mr-1 text-cyan-400/90 hover:underline"
                  >
                    +Q
                  </button>
                  <button
                    type="button"
                    disabled={!canDraft || draftedIds.has(p.id)}
                    onClick={() => onDraft(p)}
                    className={cn(
                      'rounded px-2 py-0.5 font-bold',
                      canDraft && !draftedIds.has(p.id)
                        ? 'bg-cyan-500 text-black'
                        : 'cursor-not-allowed bg-white/10 text-white/30',
                    )}
                  >
                    DRAFT
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
