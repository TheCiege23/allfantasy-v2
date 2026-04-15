import type { LeagueTeamSlot } from '@/app/dashboard/types'
import type { UserLeague } from '@/app/dashboard/types'

/** Optional season snapshot for post-season ordering (champion + stored ranks). */
export type LeagueSeasonSnapshot = {
  championTeamId: string | null
  teamRecords: unknown
  status?: string | null
}

function isPreDraftLeague(league: UserLeague): boolean {
  const s = String(league.status ?? '').toLowerCase()
  if (!s) return true
  if (s.includes('in_season') || s === 'in season' || s === 'complete' || s === 'postseason') {
    return false
  }
  return s.includes('draft') || s.includes('pre') || s === 'scheduled'
}

function isPostSeason(league: UserLeague, snapshot: LeagueSeasonSnapshot | null): boolean {
  const s = String(league.status ?? '').toLowerCase()
  if (s === 'complete' || s.includes('complete') || s === 'offseason' || s === 'off_season') return true
  const phase = String(
    (league.settings as Record<string, unknown> | undefined)?.dynastySeasonPhase ?? '',
  ).toLowerCase()
  if (phase === 'offseason' || phase === 'complete') return true
  const snapStatus = String(snapshot?.status ?? '').toLowerCase()
  if (snapStatus === 'complete') return true
  return false
}

function recordTiebreaker(a: LeagueTeamSlot, b: LeagueTeamSlot): number {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (a.losses !== b.losses) return a.losses - b.losses
  if (b.ties !== a.ties) return b.ties - a.ties
  return b.pointsFor - a.pointsFor
}

function finishPlacement(team: LeagueTeamSlot, snapshot: LeagueSeasonSnapshot | null): number {
  if (snapshot?.championTeamId && snapshot.championTeamId === team.id) return 1
  const raw = snapshot?.teamRecords
  if (raw && Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const tid = o.teamId ?? o.team_id
      if (tid != null && String(tid) === team.id) {
        const r = o.rank ?? o.placement ?? o.finish
        if (typeof r === 'number' && Number.isFinite(r)) return r
      }
    }
  }
  const cr = team.currentRank
  return cr != null && Number.isFinite(cr) ? cr : 999
}

/**
 * Pre-draft: draft order. In-season: wins/losses/ties then PF. Post-season: final placement (champion first).
 */
export function sortTeamsForManagerListing(
  teams: LeagueTeamSlot[],
  league: UserLeague,
  snapshot: LeagueSeasonSnapshot | null,
): LeagueTeamSlot[] {
  const copy = [...teams]
  if (isPreDraftLeague(league)) {
    return copy.sort((a, b) => {
      const ap = a.draftPosition
      const bp = b.draftPosition
      if (ap != null && bp != null) return ap - bp
      if (ap != null) return -1
      if (bp != null) return 1
      return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: 'base' })
    })
  }
  if (isPostSeason(league, snapshot)) {
    return copy.sort((a, b) => {
      const fa = finishPlacement(a, snapshot)
      const fb = finishPlacement(b, snapshot)
      if (fa !== fb) return fa - fb
      return recordTiebreaker(a, b)
    })
  }
  return copy.sort(recordTiebreaker)
}
