'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/i18n/LanguageProviderClient'
import type { DraftPlayerRow } from '../types'

const SPORT_POS_FILTERS: Record<string, string[]> = {
  NFL: ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
  NBA: ['ALL', 'PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'],
  MLB: ['ALL', 'C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'SP', 'RP', 'P'],
  NHL: ['ALL', 'C', 'LW', 'RW', 'W', 'D', 'G', 'UTIL'],
  NCAAF: ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'],
  NCAAB: ['ALL', 'G', 'F', 'C', 'PG', 'SG', 'SF', 'PF', 'UTIL'],
  SOCCER: ['ALL', 'GK', 'DEF', 'MID', 'FWD', 'UTIL'],
}

/**
 * Map Sleeper / RI status strings to a short uppercase chip + tone.
 * Returns null when the player is healthy / has no flag.
 */
function injuryChip(status: string | null | undefined): { label: string; tone: 'out' | 'doubt' | 'quest' | 'probable' } | null {
  if (!status) return null
  const s = status.trim().toLowerCase()
  if (s === 'active' || s === 'healthy' || s === 'available') return null
  if (s.startsWith('o') || s === 'ir' || s === 'pup' || s === 'sus' || s === 'suspended') {
    return { label: s === 'ir' ? 'IR' : s === 'pup' ? 'PUP' : s.startsWith('s') ? 'SUS' : 'OUT', tone: 'out' }
  }
  if (s.startsWith('d')) return { label: 'D', tone: 'doubt' }
  if (s.startsWith('q')) return { label: 'Q', tone: 'quest' }
  if (s.startsWith('p')) return { label: 'P', tone: 'probable' }
  return { label: status.slice(0, 3).toUpperCase(), tone: 'quest' }
}

type Props = {
  sport: string
  draftedIds: Set<string>
  onDraft: (p: DraftPlayerRow) => void
  onQueue: (p: DraftPlayerRow) => void
  canDraft: boolean
  /** When provided, the player name renders as a button that opens the player detail modal. */
  onPlayerClick?: (playerId: string) => void
}

export function PlayerPool({ sport, draftedIds, onDraft, onQueue, canDraft, onPlayerClick }: Props) {
  const { t } = useLanguage()
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
    fetch(`/api/draft/players?sport=${encodeURIComponent(String(sport || 'NFL').toUpperCase())}`)
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
  }, [sport])

  const posOptions = useMemo(() => {
    const normalizedSport = String(sport || 'NFL').toUpperCase()
    const defaults = SPORT_POS_FILTERS[normalizedSport] ?? ['ALL']
    const seen = new Set(defaults)
    const extras = players
      .map((p) => String(p.position ?? '').trim().toUpperCase())
      .filter((p) => p.length > 0 && !seen.has(p))
      .sort((a, b) => a.localeCompare(b))
    return [...defaults, ...extras]
  }, [players, sport])

  useEffect(() => {
    if (!posOptions.includes(pos)) {
      setPos('ALL')
    }
  }, [pos, posOptions])

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
          {posOptions.map((p) => (
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
            {t('draftRoom.playerPool.hideDrafted')}
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={watchOnly} onChange={toggleWatch} />
            Watchlist only
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={rookiesOnly} onChange={(e) => setRookiesOnly(e.target.checked)} />
            {t('draftRoom.playerPool.rookiesOnly')}
          </label>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <table className="w-full text-left text-[10px]">
          <thead className="sticky top-0 bg-[#0d1117] text-white/40">
            <tr>
              <th className="px-2 py-1">#</th>
              <th className="px-2 py-1">{t('draftRoom.playerPool.colPlayer')}</th>
              <th className="px-2 py-1">{t('draftRoom.playerPool.colPos')}</th>
              <th className="px-2 py-1">{t('draftRoom.playerPool.colAdp')}</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((p, idx) => (
              <tr key={p.id} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
                <td className="px-2 py-1 text-white/35">{idx + 1}</td>
                <td className="max-w-[160px] px-2 py-1 font-medium text-white/90">
                  <div className="flex items-center gap-1.5">
                    {onPlayerClick ? (
                      <button
                        type="button"
                        onClick={() => onPlayerClick(p.id)}
                        className="min-w-0 truncate text-left hover:text-cyan-300 hover:underline"
                        data-testid={`draft-player-row-${p.id}`}
                      >
                        {p.name}
                      </button>
                    ) : (
                      <span className="min-w-0 truncate">{p.name}</span>
                    )}
                    {(() => {
                      const chip = injuryChip(p.status)
                      if (!chip) return null
                      const toneClass =
                        chip.tone === 'out'
                          ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/40'
                          : chip.tone === 'doubt'
                            ? 'bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/35'
                            : chip.tone === 'quest'
                              ? 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35'
                              : 'bg-white/[0.06] text-white/55 ring-1 ring-white/15'
                      return (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0 text-[8px] font-bold uppercase tracking-wide ${toneClass}`}
                          title={p.status ?? ''}
                          data-testid={`draft-player-injury-${p.id}`}
                        >
                          {chip.label}
                        </span>
                      )
                    })()}
                  </div>
                </td>
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
                    {t('draftRoom.playerPool.draft')}
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
