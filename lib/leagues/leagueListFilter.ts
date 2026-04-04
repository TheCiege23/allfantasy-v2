/**
 * Client + API safety filter: hide ranking/profile-import artifacts and invalid rows
 * after Prisma `where` clauses (see /api/league/list).
 */

export type LeagueFilterRecord = {
  name?: string | null
  leagueVariant?: string | null
  league_variant?: string | null
  leagueSize?: number | null
  teamCount?: number | null
  totalTeams?: number | null
  status?: string | null
}

export const EXCLUDED_VARIANTS = new Set([
  "ranking",
  "rankings",
  "rank_only",
  "legacy_summary",
  "profile_import",
  "career_import",
])

export const EXCLUDED_STATUSES = new Set([
  "ranking_only",
  "artifact",
  "profile_import",
  "career_data",
])

export function isRealLeague(record: LeagueFilterRecord): boolean {
  const name = record.name?.trim()
  if (!name) return false

  const teamCount =
    record.leagueSize ??
    record.teamCount ??
    record.totalTeams ??
    0
  if (teamCount <= 0) return false

  const variant = (record.leagueVariant ?? record.league_variant ?? "").toLowerCase().trim()
  if (variant && EXCLUDED_VARIANTS.has(variant)) return false

  const status = (record.status ?? "").toLowerCase().trim()
  if (status && EXCLUDED_STATUSES.has(status)) return false

  return true
}
