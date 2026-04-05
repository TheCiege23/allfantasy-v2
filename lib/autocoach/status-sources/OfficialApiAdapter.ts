import 'server-only'

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { apiChain } from '@/lib/workers/api-chain'

import type { OfficialStatusRow } from './types'

function inferCurrentWeek(): number {
  const day = new Date().getUTCDate()
  return Math.max(1, Math.min(18, Math.ceil(day / 7)))
}

/**
 * Injury/status rows via existing api-chain providers (same path as injury-importer).
 */
export async function fetchOfficialStatuses(sport: string): Promise<OfficialStatusRow[]> {
  const normalized = normalizeToSupportedSport(sport)
  try {
    const response = await apiChain.fetch({
      sport: normalized,
      dataType: 'injuries',
      query: { week: inferCurrentWeek(), season: String(new Date().getFullYear()) },
    })

    if (!Array.isArray(response.data) || response.data.length === 0) {
      return []
    }

    const rows: OfficialStatusRow[] = []
    for (const injury of response.data as any[]) {
      const playerId = String(injury.playerId ?? injury.externalId ?? '').trim()
      if (!playerId) continue
      const playerName = String(injury.playerName ?? injury.player ?? 'Unknown')
      const teamRaw = injury.team ?? injury.teamAbbrev ?? ''
      const teamAbbrev = normalizeTeamAbbrev(String(teamRaw)) ?? (String(teamRaw).trim() || null)
      const status = String(injury.status ?? injury.gameStatus ?? '').trim() || 'unknown'
      rows.push({
        playerId,
        playerName,
        sport: normalized,
        status,
        teamAbbrev,
        gameDate: injury.reportDate ? new Date(String(injury.reportDate)) : null,
      })
    }
    return rows
  } catch (e) {
    console.warn('[OfficialApiAdapter] fetch failed:', e)
    return []
  }
}
