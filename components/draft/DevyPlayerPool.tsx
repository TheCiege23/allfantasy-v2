'use client'

import { useMemo, useState } from 'react'
import type { DraftPlayerPoolEntry } from '@/lib/workers/draft-worker'
import { PlayerPoolRow } from './PlayerPoolRow'

export function DevyPlayerPool({
  players,
  recommendedPlayerId,
  onPick,
  bannerLabel = 'COLLEGE ONLY',
}: {
  players: DraftPlayerPoolEntry[]
  recommendedPlayerId?: string | null
  onPick?: (playerId: string) => void
  bannerLabel?: string
}) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return players.filter((player) => {
      if (position !== 'ALL' && player.position.toUpperCase() !== position) return false
      if (!search) return true
      const haystack = [
        player.name,
        player.position,
        player.team ?? '',
        player.school ?? '',
        player.conference ?? '',
        player.projectedLandingSpot ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [players, position, query])

  const positions = useMemo(
    () => ['ALL', ...Array.from(new Set(players.map((player) => player.position.toUpperCase()).filter(Boolean))).slice(0, 12)],
    [players]
  )

  return (
    <div className="space-y-3 rounded-2xl border border-violet-400/20 bg-[#081121] p-4">
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-100">
        {bannerLabel}
      </div>
      <div className="space-y-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search college players"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {positions.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setPosition(pill)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                position === pill
                  ? 'bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/40'
                  : 'bg-white/[0.04] text-white/60'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 80).map((player) => (
          <PlayerPoolRow
            key={player.playerId}
            player={player}
            recommended={Boolean(recommendedPlayerId && player.playerId === recommendedPlayerId)}
            onSelect={onPick}
          />
        ))}
      </div>
    </div>
  )
}
