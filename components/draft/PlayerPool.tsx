'use client'

import { useMemo, useState } from 'react'
import type { DraftPlayerPoolEntry } from '@/lib/workers/draft-worker'
import { PlayerPoolRow } from './PlayerPoolRow'

export function PlayerPool({
  players,
  recommendedPlayerId,
  onPick,
}: {
  players: DraftPlayerPoolEntry[]
  recommendedPlayerId?: string | null
  onPick?: (playerId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')

  const filtered = useMemo(() => {
    return players.filter((player) => {
      if (position !== 'ALL' && player.position.toUpperCase() !== position) return false
      if (!query.trim()) return true
      const haystack = `${player.name} ${player.position} ${player.team ?? ''}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
  }, [players, query, position])

  const positions = useMemo(() => {
    return ['ALL', ...Array.from(new Set(players.map((player) => player.position.toUpperCase()).filter(Boolean))).slice(0, 9)]
  }, [players])

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[#081121] p-4">
      <div className="space-y-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search players"
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
                  ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40'
                  : 'bg-white/[0.04] text-white/60'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 60).map((player) => (
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
