/**
 * Fetches full Sleeper league data (league, users, rosters, matchups, transactions, draft, player map).
 * Used by import preview and by league creation from import.
 */

import { getAllPlayers } from '@/lib/sleeper-client'
import type { SleeperImportPayload } from '../adapters/sleeper/types'

async function fetchSleeperJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const SLEEPER_BASE = 'https://api.sleeper.app/v1'

export interface SleeperFetchOptions {
  maxMatchupWeeks?: number
  maxTransactionWeeks?: number
  maxPreviousSeasons?: number
}

const DEFAULTS: SleeperFetchOptions = {
  maxMatchupWeeks: 18,
  maxTransactionWeeks: 18,
  maxPreviousSeasons: 10,
}

/**
 * Fetch a full Sleeper league payload suitable for ImportNormalizationPipeline and legacy-style preview.
 */
export async function fetchSleeperLeagueForImport(
  leagueId: string,
  options: SleeperFetchOptions = {}
): Promise<SleeperImportPayload | null> {
  const opts = { ...DEFAULTS, ...options }
  const cleanId = leagueId.trim()
  if (!cleanId) return null

  const league = await fetchSleeperJson<SleeperImportPayload['league']>(
    `${SLEEPER_BASE}/league/${cleanId}`
  )
  if (!league?.league_id) return null

  const [users, rosters, drafts] = await Promise.all([
    fetchSleeperJson<SleeperImportPayload['users']>(`${SLEEPER_BASE}/league/${cleanId}/users`),
    fetchSleeperJson<SleeperImportPayload['rosters']>(`${SLEEPER_BASE}/league/${cleanId}/rosters`),
    fetchSleeperJson<{ draft_id: string; type?: string; status?: string; start_time?: number; slot_to_roster_id?: Record<string, string> }[]>(
      `${SLEEPER_BASE}/league/${cleanId}/drafts`
    ),
  ])

  let transactions: SleeperImportPayload['transactions'] = []
  for (let week = 1; week <= (opts.maxTransactionWeeks ?? 18); week++) {
    const weekTx = await fetchSleeperJson<SleeperImportPayload['transactions']>(
      `${SLEEPER_BASE}/league/${cleanId}/transactions/${week}`
    )
    if (weekTx?.length) transactions = transactions.concat(weekTx)
  }

  let draftPicks: SleeperImportPayload['draftPicks'] = []
  if (drafts?.length) {
    const latest = drafts[0]
    draftPicks = (await fetchSleeperJson<SleeperImportPayload['draftPicks']>(
      `${SLEEPER_BASE}/draft/${latest.draft_id}/picks`
    )) ?? []
  }

  const matchupsByWeek: NonNullable<SleeperImportPayload['matchupsByWeek']> = []
  for (let week = 1; week <= (opts.maxMatchupWeeks ?? 18); week++) {
    const matchups = await fetchSleeperJson<{ roster_id: number; matchup_id: number; points: number }[]>(
      `${SLEEPER_BASE}/league/${cleanId}/matchups/${week}`
    )
    if (matchups?.length) matchupsByWeek.push({ week, matchups })
  }

  let previousSeasons: SleeperImportPayload['previousSeasons'] = []
  let prevId = league.previous_league_id
  while (prevId && previousSeasons.length < (opts.maxPreviousSeasons ?? 10)) {
    const prevLeague = await fetchSleeperJson<SleeperImportPayload['league']>(
      `${SLEEPER_BASE}/league/${prevId}`
    )
    if (!prevLeague) break
    previousSeasons.push({ season: prevLeague.season, league: prevLeague })
    prevId = prevLeague.previous_league_id
  }

  const allPlayerIds = new Set<string>()
  rosters?.forEach((r) => {
    r.players?.forEach((p) => allPlayerIds.add(p))
    r.starters?.forEach((s) => s && s !== '0' && allPlayerIds.add(s))
  })

  const playerMap: Record<string, { name: string; position: string; team: string }> = {}
  try {
    const sleeperPlayers = await getAllPlayers()
    allPlayerIds.forEach((pid) => {
      const sp = sleeperPlayers[pid]
      if (sp) {
        playerMap[pid] = {
          name: (sp as any).full_name || `${(sp as any).first_name ?? ''} ${(sp as any).last_name ?? ''}`.trim(),
          position: (sp as any).position ?? '',
          team: (sp as any).team ?? '',
        }
      }
    })
  } catch {
    draftPicks.forEach((p) => {
      if (p?.player_id && p.metadata) {
        playerMap[p.player_id] = {
          name: `${p.metadata.first_name ?? ''} ${p.metadata.last_name ?? ''}`.trim(),
          position: p.metadata.position ?? '',
          team: p.metadata.team ?? '',
        }
      }
    })
  }

  return {
    league,
    users: users ?? undefined,
    rosters: rosters ?? undefined,
    matchupsByWeek,
    transactions,
    draftPicks,
    playerMap,
    previousSeasons,
  }
}
