/**
 * Applies sport-specific default league settings when a league is created.
 * Writes to League.settings (JSON) and optionally LeagueWaiverSettings.
 * Commissioner overrides are preserved by merging on top of initial settings.
 */
import { prisma } from '@/lib/prisma'
import { buildInitialLeagueSettings } from './LeagueDefaultSettingsService'
import { getWaiverDefaults } from './SportDefaultsRegistry'
import type { SportType } from './types'
import { toSportType } from './sport-type-utils'

export interface InitializeLeagueOptions {
  leagueId: string
  sport: SportType | string
  /** If true, only set settings when current settings are empty or null */
  mergeIfExisting?: boolean
}

/**
 * Initialize a league with sport-specific default settings.
 * - Merges initial settings into League.settings (so commissioner overrides can coexist).
 * - Creates or updates LeagueWaiverSettings from waiver defaults (waiver_type, FAAB_budget, processing_days).
 */
export async function initializeLeagueWithSportDefaults(
  options: InitializeLeagueOptions
): Promise<{ settingsApplied: boolean; waiverApplied: boolean }> {
  const { leagueId, sport, mergeIfExisting = true } = options
  const sportType = toSportType(typeof sport === 'string' ? sport : sport)

  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, settings: true },
  })
  if (!league) {
    return { settingsApplied: false, waiverApplied: false }
  }

  const initialSettings = buildInitialLeagueSettings(sportType)
  let settingsApplied = false
  const existingSettings = (league.settings as Record<string, unknown>) ?? {}
  const hasExisting = Object.keys(existingSettings).length > 0
  const shouldSetSettings = !hasExisting || (mergeIfExisting === false && !hasExisting)
  if (!hasExisting) {
    await (prisma as any).league.update({
      where: { id: leagueId },
      data: { settings: { ...initialSettings } },
    })
    settingsApplied = true
  } else if (mergeIfExisting) {
    const merged = { ...initialSettings, ...existingSettings }
    await (prisma as any).league.update({
      where: { id: leagueId },
      data: { settings: merged },
    })
    settingsApplied = true
  }

  const waiverDef = getWaiverDefaults(sportType)
  let waiverApplied = false
  try {
    const existing = await (prisma as any).leagueWaiverSettings.findUnique({
      where: { leagueId },
    })
    if (!existing) {
      await (prisma as any).leagueWaiverSettings.create({
        data: {
          leagueId,
          waiverType: waiverDef.waiver_type,
          faabBudget: waiverDef.FAAB_budget_default,
          processingDayOfWeek: waiverDef.processing_days?.[0] ?? null,
        },
      })
      waiverApplied = true
    }
  } catch {
    // non-fatal
  }

  return { settingsApplied, waiverApplied }
}
