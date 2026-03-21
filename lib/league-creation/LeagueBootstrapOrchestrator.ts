/**
 * Runs all sport-specific bootstrap steps after league creation so the league
 * has correct roster, scoring, waiver, settings, and context for its sport.
 */
import type { LeagueSport } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { bootstrapLeagueRoster } from '@/lib/roster-defaults/LeagueRosterBootstrapService'
import { initializeLeagueWithSportDefaults } from '@/lib/sport-defaults/LeagueCreationInitializer'
import { resolveSportConfigForLeague } from '@/lib/multi-sport/SportConfigResolver'
import { bootstrapLeagueScoring } from '@/lib/scoring-defaults/LeagueScoringBootstrapService'
import { bootstrapLeaguePlayerPool } from '@/lib/sport-teams/LeaguePlayerPoolBootstrapService'
import { bootstrapLeagueDraftConfig } from '@/lib/draft-defaults/LeagueDraftBootstrapService'
import { bootstrapLeagueWaiverSettings } from '@/lib/waiver-defaults/LeagueWaiverBootstrapService'
import { bootstrapLeaguePlayoffConfig } from '@/lib/playoff-defaults/LeaguePlayoffBootstrapService'
import { bootstrapLeagueScheduleConfig } from '@/lib/schedule-defaults/LeagueScheduleBootstrapService'

export interface BootstrapResult {
  roster: { templateId: string }
  settings: { settingsApplied: boolean; waiverApplied: boolean }
  scoring: { templateId: string; isDefault: boolean }
  playerPool: { playerCount: number; teamCount: number }
  draft: { draftConfigApplied: boolean }
  waiver: { waiverSettingsApplied: boolean }
  playoff: { playoffConfigApplied: boolean }
  schedule: { scheduleConfigApplied: boolean }
}

/**
 * Run full sport-specific bootstrap after league create.
 * Call once after League is created; idempotent where applicable.
 * When League.settings has roster_format_type or scoring_format_type (e.g. dynasty), those are used for roster/scoring.
 */
export async function runLeagueBootstrap(
  leagueId: string,
  leagueSport: LeagueSport,
  scoringFormat?: string
): Promise<BootstrapResult> {
  const config = resolveSportConfigForLeague(leagueSport)
  const settings = await prisma.league
    .findUnique({ where: { id: leagueId }, select: { settings: true } })
    .then((l) => (l?.settings as Record<string, unknown>) ?? {})
  const rosterFormat =
    (settings.roster_format_type as string) ?? (settings.roster_format as string) ?? scoringFormat ?? config.defaultFormat
  const scoringFormatResolved =
    (settings.scoring_format_type as string) ?? (settings.scoring_format as string) ?? scoringFormat ?? config.defaultFormat
  const isIdp =
    leagueSport === 'NFL' &&
    (rosterFormat === 'IDP' || rosterFormat === 'idp' || scoringFormatResolved === 'IDP' || scoringFormatResolved === 'idp')

  const rosterResult = await bootstrapLeagueRoster(leagueId, leagueSport, rosterFormat).then((r) => ({
    templateId: r.templateId,
  }))

  // Apply/merge full sport defaults first so downstream boosters only backfill true gaps.
  const settingsResult = await initializeLeagueWithSportDefaults({
    leagueId,
    sport: leagueSport,
    mergeIfExisting: true,
  })

  const scoringResult = await bootstrapLeagueScoring(leagueId, leagueSport, scoringFormatResolved).then(
    (r) => ({
      templateId: r.templateId,
      isDefault: r.isDefault,
    })
  )

  const poolResult = await bootstrapLeaguePlayerPool(leagueId, leagueSport).catch(
    () =>
      ({
        playerCount: 0,
        teamCount: 0,
      }) as { playerCount: number; teamCount: number }
  )

  // Keep settings writes sequential to avoid read-modify-write races.
  const draftResult = await bootstrapLeagueDraftConfig(leagueId).catch(() => ({
    leagueId,
    draftConfigApplied: false,
    sport: String(leagueSport),
    variant: null,
  }))
  const playoffResult = await bootstrapLeaguePlayoffConfig(leagueId).catch(() => ({
    leagueId,
    playoffConfigApplied: false,
    sport: String(leagueSport),
    variant: null,
  }))
  const scheduleResult = await bootstrapLeagueScheduleConfig(leagueId).catch(() => ({
    leagueId,
    scheduleConfigApplied: false,
    sport: String(leagueSport),
    variant: null,
  }))

  const waiverResult = await bootstrapLeagueWaiverSettings(leagueId).catch(() => ({
    leagueId,
    waiverSettingsApplied: false,
    sport: String(leagueSport),
    variant: null,
  }))

  if (isIdp) {
    try {
      const { upsertIdpLeagueConfig } = await import('@/lib/idp')
      await upsertIdpLeagueConfig(leagueId, {})
    } catch {
      // non-fatal; league still works with in-memory IDP defaults
    }
  }

  return {
    roster: rosterResult,
    settings: settingsResult,
    scoring: scoringResult,
    playerPool: poolResult,
    draft: { draftConfigApplied: draftResult.draftConfigApplied },
    waiver: { waiverSettingsApplied: waiverResult.waiverSettingsApplied },
    playoff: { playoffConfigApplied: playoffResult.playoffConfigApplied },
    schedule: { scheduleConfigApplied: scheduleResult.scheduleConfigApplied },
  }
}
