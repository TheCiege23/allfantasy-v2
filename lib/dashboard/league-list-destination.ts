import type { UserLeague } from '@/app/dashboard/types'

/**
 * Minimal row shape from `/api/league/list` (native, imported, or tournament hub).
 * Uses `navigationLeagueId` / `unifiedLeagueId` when the row `id` is a platform surrogate.
 */
export type LeagueListNavInput = {
  id: string
  settings?: Record<string, unknown> | null
  navigationLeagueId?: string | null
  unifiedLeagueId?: string | null
  leagueVariant?: string | null
  league_variant?: string | null
}

/** Reads `settings.tournamentId` whether stored as string or legacy numeric JSON. */
function readTournamentIdFromSettings(settings: Record<string, unknown>): string | null {
  const raw = settings.tournamentId
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw))
  return null
}

/**
 * If league JSON marks this row as a tournament hub or feeder league, return `/tournament/[id]`.
 * Keeps My Leagues, `/league/[id]` redirect, and `create-missing-league` (`league_type: 'tournament'`) in sync.
 */
export function resolveTournamentDestinationFromLeagueSettings(
  settings: Record<string, unknown>,
): string | null {
  const tournamentId = readTournamentIdFromSettings(settings)
  if (!tournamentId) return null
  const lt = String(settings.league_type ?? '').trim().toLowerCase()
  if (lt === 'tournament' || lt === 'tournament_hub') {
    return `/tournament/${tournamentId}`
  }
  return null
}

function pickCanonicalLeagueListId(row: LeagueListNavInput): string {
  const a = typeof row.navigationLeagueId === 'string' ? row.navigationLeagueId.trim() : ''
  const b = typeof row.unifiedLeagueId === 'string' ? row.unifiedLeagueId.trim() : ''
  const c = typeof row.id === 'string' ? row.id.trim() : ''
  return a || b || c
}

/**
 * Single source of truth for “open this league row” from dashboard list payloads:
 * tournament hubs → `/tournament/[id]`; everything else → `/league/[canonicalId]`.
 * Works for AllFantasy-created leagues, imports (Sleeper/Yahoo/etc.), and tournament shells.
 */
export function resolveLeagueHomeHrefFromListRow(row: LeagueListNavInput): string {
  const settings =
    row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? (row.settings as Record<string, unknown>)
      : {}

  const fromSettings = resolveTournamentDestinationFromLeagueSettings(settings)
  if (fromSettings) return fromSettings

  const tidFromSettings = readTournamentIdFromSettings(settings)
  const variant = String(row.leagueVariant ?? row.league_variant ?? '')
    .trim()
    .toLowerCase()
  // Hub rows from `/api/league/list` always include `settings.tournamentId`; never guess `/tournament/[id]` from row id alone.
  if (variant === 'tournament_hub' && tidFromSettings) {
    return `/tournament/${tidFromSettings}`
  }

  const leagueId = pickCanonicalLeagueListId(row) || row.id
  return `/league/${leagueId}`
}

/**
 * Canonical destination for a row in My Leagues (must match `LeagueSidebarCard` / list APIs).
 */
export function getLeagueListDestinationHref(league: UserLeague | LeagueListNavInput): string {
  return resolveLeagueHomeHrefFromListRow(league)
}
