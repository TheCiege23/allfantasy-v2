import type { LeagueSport } from '@prisma/client'
import { tryGetSportConfig } from '@/lib/sportConfig'
import { getMaxTeamsForSport } from '@/lib/league-creation-wizard/sport-team-limits'

const PRACTICAL_CAP_BY_SPORT: Partial<Record<LeagueSport, number>> = {
  MLB: 16,
  NBA: 16,
  NHL: 14,
}

/**
 * Suggested team count ≈ regular-season scoring weeks before playoffs (sport config).
 * Capped for very long seasons so roster math stays practical; still editable by commissioner.
 */
export function getZombieSuggestedTeamCount(sport: LeagueSport): {
  suggested: number
  regularSeasonWeeks: number
  capped: boolean
  capNote: string | null
} {
  const cfg = tryGetSportConfig(sport)
  if (!cfg) {
    return {
      suggested: 12,
      regularSeasonWeeks: 14,
      capped: false,
      capNote: null,
    }
  }
  const playoffStart = typeof cfg.defaultPlayoffStartWeek === 'number' ? cfg.defaultPlayoffStartWeek : null
  const seasonWeeks = cfg.defaultSeasonWeeks
  const rs =
    playoffStart != null && playoffStart > 1
      ? Math.max(4, playoffStart - 1)
      : Math.max(4, Math.min(seasonWeeks, 24))

  const maxTeams = getMaxTeamsForSport(sport)
  const practicalCap = PRACTICAL_CAP_BY_SPORT[sport] ?? Math.min(maxTeams, 20)
  const capped = rs > practicalCap
  const suggested = capped ? practicalCap : Math.min(rs, maxTeams)

  return {
    suggested,
    regularSeasonWeeks: rs,
    capped,
    capNote: capped
      ? `Capped at ${practicalCap} teams for a practical draft and schedule; you can raise it up to ${maxTeams} if your league prefers.`
      : null,
  }
}
