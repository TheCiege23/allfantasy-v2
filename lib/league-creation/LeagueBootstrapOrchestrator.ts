/**
 * Runs all sport-specific bootstrap steps after league creation so the league
 * has correct roster, scoring, waiver, settings, and context for its sport.
 */
import type { LeagueSport } from '@prisma/client'
import { attachRosterConfigForLeague } from '@/lib/multi-sport/MultiSportLeagueService'
import { initializeLeagueWithSportDefaults } from '@/lib/sport-defaults/LeagueCreationInitializer'
import { resolveSportConfigForLeague } from '@/lib/multi-sport/SportConfigResolver'
import { bootstrapLeagueScoring } from '@/lib/scoring-defaults/LeagueScoringBootstrapService'
import { bootstrapLeaguePlayerPool } from '@/lib/sport-teams/LeaguePlayerPoolBootstrapService'

export interface BootstrapResult {
  roster: { templateId: string }
  settings: { settingsApplied: boolean; waiverApplied: boolean }
  scoring: { templateId: string; isDefault: boolean }
  playerPool: { playerCount: number; teamCount: number }
}

/**
 * Run full sport-specific bootstrap after league create.
 * Call once after League is created; idempotent where applicable.
 */
export async function runLeagueBootstrap(
  leagueId: string,
  leagueSport: LeagueSport,
  scoringFormat?: string
): Promise<BootstrapResult> {
  const config = resolveSportConfigForLeague(leagueSport)
  const format = scoringFormat ?? config.defaultFormat

  const [rosterResult, settingsResult, scoringResult, poolResult] = await Promise.all([
    attachRosterConfigForLeague(leagueId, leagueSport, format).then((r) => ({ templateId: r.templateId })),
    initializeLeagueWithSportDefaults({ leagueId, sport: leagueSport, mergeIfExisting: false }),
    bootstrapLeagueScoring(leagueId, leagueSport, format).then((r) => ({
      templateId: r.templateId,
      isDefault: r.isDefault,
    })),
    bootstrapLeaguePlayerPool(leagueId, leagueSport).catch(() => ({
      playerCount: 0,
      teamCount: 0,
    } as { playerCount: number; teamCount: number })),
  ])

  return {
    roster: rosterResult,
    settings: settingsResult,
    scoring: scoringResult,
    playerPool: poolResult,
  }
}
