/**
 * Keeps derived stores in sync when commissioners edit canonical `League` columns from the settings UI:
 * - `League.settings.playoff_structure` / `playoffSettings` ← playoff columns (bracket resolver reads JSON)
 * - `LeagueWaiverSettings` ← waiver columns (waiver engine prefers this row when present)
 */
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { upsertLeagueWaiverSettings } from '@/lib/waiver-wire/settings-service'
import { parseWaiverEngineConfig } from '@/lib/waiver-wire/waiver-engine-config'

/**
 * After `League` row changes, mirror playoff + waiver fields into JSON + waiver settings row.
 */
export async function syncCommissionerDerivedLeagueState(leagueId: string): Promise<void> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      settings: true,
      playoffStartWeek: true,
      playoffTeams: true,
      playoffWeeksPerRound: true,
      playoffSeedingRule: true,
      playoffLowerBracket: true,
      waiverType: true,
      waiverBudget: true,
      waiverMinBid: true,
      waiverClearAfterGames: true,
      waiverHours: true,
      customDailyWaivers: true,
      waiverProcessTime: true,
      waiverSchedule: true,
    },
  })
  if (!league) return

  const prev = (league.settings as Record<string, unknown> | null) ?? {}

  const existingStructure =
    prev.playoff_structure != null && typeof prev.playoff_structure === 'object' && !Array.isArray(prev.playoff_structure)
      ? ({ ...(prev.playoff_structure as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>)

  if (league.playoffTeams != null) existingStructure.playoff_team_count = league.playoffTeams
  if (league.playoffStartWeek != null) existingStructure.playoff_start_week = league.playoffStartWeek
  if (league.playoffWeeksPerRound != null) {
    existingStructure.matchup_length = league.playoffWeeksPerRound
    existingStructure.playoff_weeks_per_round = league.playoffWeeksPerRound
  }
  if (league.playoffSeedingRule != null) {
    existingStructure.seeding_rules = league.playoffSeedingRule
  }
  const lb = String(league.playoffLowerBracket ?? '').toLowerCase()
  if (lb) {
    existingStructure.toilet_bowl_enabled = lb === 'toilet'
    existingStructure.consolation_bracket_enabled = lb === 'consolation' || lb === 'consolation_bracket'
    existingStructure.lower_bracket_type = league.playoffLowerBracket
  }

  const prevPs =
    prev.playoffSettings != null && typeof prev.playoffSettings === 'object' && !Array.isArray(prev.playoffSettings)
      ? (prev.playoffSettings as Record<string, unknown>)
      : {}

  const playoffSettings = {
    ...prevPs,
    playoffStartWeek: league.playoffStartWeek,
    playoffTeams: league.playoffTeams,
    playoffWeeksPerRound: league.playoffWeeksPerRound,
    playoffSeedingRule: league.playoffSeedingRule,
    playoffLowerBracket: league.playoffLowerBracket,
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: {
      settings: {
        ...prev,
        playoff_structure: existingStructure,
        playoffSettings,
      } as Prisma.InputJsonValue,
    },
  })

  const existingRow = await prisma.leagueWaiverSettings.findUnique({ where: { leagueId } })
  const engine = parseWaiverEngineConfig(existingRow?.waiverEngineConfig ?? null)
  const nextEngine: Record<string, unknown> = { ...engine }
  let engineTouched = false
  if (typeof league.waiverMinBid === 'number') {
    nextEngine.faab_min_bid = league.waiverMinBid
    engineTouched = true
  }
  if (typeof league.waiverHours === 'number') {
    nextEngine.minimum_waiver_time_hours = league.waiverHours
    engineTouched = true
  }
  if (league.customDailyWaivers != null) {
    nextEngine.custom_daily_waivers = league.customDailyWaivers
    engineTouched = true
  }

  await upsertLeagueWaiverSettings(leagueId, {
    waiverType: league.waiverType ?? undefined,
    faabBudget: league.waiverBudget ?? undefined,
    processingTimeUtc: league.waiverProcessTime ?? undefined,
    processingDays: league.waiverSchedule ?? undefined,
    waiverEngineConfig: engineTouched ? nextEngine : undefined,
  })
}
