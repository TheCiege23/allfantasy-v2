'use client'

import { useEffect, useState } from 'react'

export type SlimPlayer = { id: string; name: string; position: string; team: string; espn_id?: string }
export type PlayerMap = Record<string, SlimPlayer>

let cachedPlayers: PlayerMap | null = null
let fetchPromise: Promise<PlayerMap> | null = null

export function useSleeperPlayers() {
  const [players, setPlayers] = useState<PlayerMap>(cachedPlayers ?? {})
  const [loading, setLoading] = useState(!cachedPlayers)

  useEffect(() => {
    if (cachedPlayers) {
      setPlayers(cachedPlayers)
      setLoading(false)
      return
    }
    if (!fetchPromise) {
      fetchPromise = fetch('/api/sleeper/players')
        .then((r) => r.json() as Promise<PlayerMap>)
        .then((data) => {
          cachedPlayers = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
          return cachedPlayers
        })
        .catch(() => {
          cachedPlayers = {}
          return {}
        })
    }
    void fetchPromise.then((data) => {
      setPlayers(data)
      setLoading(false)
    })
  }, [])

  return { players, loading }
}

export function resolvePlayerName(
  playerId: string,
  players: PlayerMap,
): { name: string; position: string; team: string } {
  const p = players[playerId]
  if (p) return { name: p.name, position: p.position, team: p.team }
  return { name: `Player ${playerId.slice(-4)}`, position: '', team: '' }
}

/** Normalize Sleeper position for filter pills (DEF vs DST). */
export function normalizeTrendPosition(pos: string): string {
  const u = pos.toUpperCase()
  if (u === 'DST') return 'DEF'
  return pos
}
