import type { ADPEntry } from '@/lib/adp-data'
import type { DraftPlayer } from '@/lib/mock-draft-simulator/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getPlayerPoolForLeague, getPlayerPoolForSport } from '@/lib/sport-teams/SportPlayerPoolResolver'
import type { LeagueSport } from '@prisma/client'

export type SportAwareDraftPlayer = DraftPlayer & {
  sport: LeagueSport
  source: 'sports-player-pool'
  age?: number | null
}

export function isFootballDraftSport(sport: string | LeagueSport | null | undefined): boolean {
  return normalizeToSupportedSport(sport) === 'NFL'
}

export async function loadSportAwareDraftPlayerPool(params: {
  sport: string | LeagueSport
  leagueId?: string | null
  limit: number
}): Promise<SportAwareDraftPlayer[]> {
  const sport = normalizeToSupportedSport(params.sport)
  const rows = params.leagueId
    ? await getPlayerPoolForLeague(params.leagueId, sport, { limit: params.limit })
    : await getPlayerPoolForSport(sport, { limit: params.limit })

  return rows
    .map((player, index) => ({
      name: player.full_name,
      position: player.position || 'UTIL',
      team: player.team_abbreviation ?? null,
      adp: index + 1,
      value: Math.max(1, params.limit - index),
      playerId: player.external_source_id ?? player.player_id,
      sport,
      source: 'sports-player-pool' as const,
      age: player.age ?? null,
    }))
    .filter((player) => Boolean(player.name))
}

export function toSyntheticAdpEntries(players: SportAwareDraftPlayer[]): ADPEntry[] {
  return players.map((player) => ({
    name: player.name,
    position: player.position,
    team: player.team ?? null,
    adp: Number(player.adp ?? 999),
    adpFormatted: player.adp != null ? player.adp.toFixed(1) : null,
    adpTrend: null,
    age: player.age ?? null,
    value: player.value ?? null,
    source: 'analytics',
    ffcPlayerId: null,
    timesDrafted: null,
    adpHigh: null,
    adpLow: null,
    adpStdev: null,
    bye: null,
  }))
}
