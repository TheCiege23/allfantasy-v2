'use client'

import { useEffect, useState } from 'react'

export type SlimPlayer = {
  id: string
  name: string
  position: string
  team: string
  espn_id?: string
  nba_id?: string
}
export type PlayerMap = Record<string, SlimPlayer>

/** Sleeper exposes full player maps for NFL and NBA only. */
export function sleeperPlayersQuerySport(leagueSport?: string): 'nfl' | 'nba' {
  if (leagueSport?.toUpperCase() === 'NBA') return 'nba'
  return 'nfl'
}

const CACHE_KEY_PREFIX = 'sleeper-players-'

const cachedBySport: Record<string, PlayerMap> = {}
const fetchPromises: Record<string, Promise<PlayerMap>> = {}

function loadPlayers(sport: 'nfl' | 'nba'): Promise<PlayerMap> {
  const key = `${CACHE_KEY_PREFIX}${sport}`
  if (cachedBySport[key]) {
    return Promise.resolve(cachedBySport[key]!)
  }
  if (!fetchPromises[key]) {
    fetchPromises[key] = fetch(`/api/sleeper/players?sport=${sport}`)
      .then((r) => r.json() as Promise<PlayerMap>)
      .then((data) => {
        const map = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
        cachedBySport[key] = map
        return map
      })
      .catch(() => {
        cachedBySport[key] = {}
        return {}
      })
  }
  return fetchPromises[key]!
}

/**
 * Loads Sleeper's global player map for the given league sport (NFL vs NBA).
 * Other sports return the NFL request (often empty for non-NFL contexts) — use RI + ESPN in PlayerImage.
 */
export function useSleeperPlayers(sport?: string) {
  const q = sleeperPlayersQuerySport(sport)
  const cacheKey = `${CACHE_KEY_PREFIX}${q}`
  const [players, setPlayers] = useState<PlayerMap>(() => cachedBySport[cacheKey] ?? {})
  const [loading, setLoading] = useState(!cachedBySport[cacheKey])

  useEffect(() => {
    const key = `${CACHE_KEY_PREFIX}${q}`
    if (cachedBySport[key]) {
      setPlayers(cachedBySport[key]!)
      setLoading(false)
      return
    }
    setPlayers({})
    setLoading(true)
    void loadPlayers(q).then((data) => {
      setPlayers(data)
      setLoading(false)
    })
  }, [q])

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
