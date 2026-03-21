import { prisma } from "@/lib/prisma"
import { DEFAULT_SPORT } from "@/lib/sport-scope"
import { getWaiverDefaults } from "@/lib/sport-defaults/SportDefaultsRegistry"
import { toSportType } from "@/lib/sport-defaults/sport-type-utils"
import type { LeagueWaiverSettingsInput } from "./types"

function toIntOrNull(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function readLeagueSettingsWaiverOverrides(settings: unknown): {
  waiverType?: string
  processingDayOfWeek?: number | null
  processingTimeUtc?: string | null
  claimLimitPerPeriod?: number | null
  faabBudget?: number | null
  tiebreakRule?: string | null
  lockType?: string | null
  instantFaAfterClear?: boolean
} {
  const src = (settings ?? {}) as Record<string, unknown>
  const processingDaysRaw = src.waiver_processing_days
  const processingDays = Array.isArray(processingDaysRaw)
    ? processingDaysRaw.map((v) => toIntOrNull(v)).filter((v): v is number => v != null)
    : []
  const unlockBehavior = typeof src.waiver_free_agent_unlock_behavior === "string"
    ? src.waiver_free_agent_unlock_behavior.trim().toLowerCase()
    : null
  return {
    waiverType:
      typeof src.waiver_type === "string" && src.waiver_type.trim()
        ? src.waiver_type.trim()
        : typeof src.waiver_mode === "string" && src.waiver_mode.trim()
          ? src.waiver_mode.trim()
          : undefined,
    processingDayOfWeek: processingDays.length > 0 ? processingDays[0] : undefined,
    processingTimeUtc:
      typeof src.waiver_processing_time_utc === "string" && src.waiver_processing_time_utc.trim()
        ? src.waiver_processing_time_utc.trim()
        : undefined,
    claimLimitPerPeriod: src.waiver_max_claims_per_period === undefined
      ? undefined
      : toIntOrNull(src.waiver_max_claims_per_period),
    faabBudget: src.faab_budget === undefined ? undefined : toIntOrNull(src.faab_budget),
    tiebreakRule:
      typeof src.waiver_claim_priority_behavior === "string" && src.waiver_claim_priority_behavior.trim()
        ? src.waiver_claim_priority_behavior.trim()
        : undefined,
    lockType:
      typeof src.waiver_game_lock_behavior === "string" && src.waiver_game_lock_behavior.trim()
        ? src.waiver_game_lock_behavior.trim()
        : undefined,
    instantFaAfterClear:
      unlockBehavior === "instant"
        ? true
        : unlockBehavior != null
          ? false
          : undefined,
  }
}

export async function getLeagueWaiverSettings(leagueId: string) {
  const row = await (prisma as any).leagueWaiverSettings.findUnique({
    where: { leagueId },
  })
  return row
}

/** Effective waiver settings for UI/API: DB row or sport/variant defaults. Never null. */
export async function getEffectiveLeagueWaiverSettings(leagueId: string): Promise<{
  leagueId: string
  waiverType: string
  processingDayOfWeek: number | null
  processingTimeUtc: string | null
  claimLimitPerPeriod: number | null
  faabBudget: number | null
  faabResetDate: Date | null
  tiebreakRule: string | null
  lockType: string | null
  instantFaAfterClear: boolean
}> {
  const [league, row] = await Promise.all([
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { id: true, sport: true, leagueVariant: true, settings: true },
    }),
    (prisma as any).leagueWaiverSettings.findUnique({ where: { leagueId } }),
  ])
  if (row) {
    return {
      leagueId,
      waiverType: row.waiverType ?? "standard",
      processingDayOfWeek: row.processingDayOfWeek ?? null,
      processingTimeUtc: row.processingTimeUtc ?? null,
      claimLimitPerPeriod: row.claimLimitPerPeriod ?? null,
      faabBudget: row.faabBudget ?? null,
      faabResetDate: row.faabResetDate ?? null,
      tiebreakRule: row.tiebreakRule ?? null,
      lockType: row.lockType ?? null,
      instantFaAfterClear: row.instantFaAfterClear ?? true,
    }
  }
  const sport = (league?.sport as string) || DEFAULT_SPORT
  const variant = league?.leagueVariant ?? null
  const defaults = getWaiverDefaults(toSportType(sport) as any, variant ?? undefined)
  const overrides = readLeagueSettingsWaiverOverrides(league?.settings)
  const resolvedWaiverType = overrides.waiverType ?? defaults.waiver_type ?? "standard"
  const resolvedTiebreakRule =
    overrides.tiebreakRule ?? (defaults.claim_priority_behavior as string) ?? null
  const resolvedLockType = overrides.lockType ?? (defaults.game_lock_behavior as string) ?? null
  const resolvedInstantFa =
    overrides.instantFaAfterClear ??
    (defaults.free_agent_unlock_behavior === "instant")
  return {
    leagueId,
    waiverType: resolvedWaiverType,
    processingDayOfWeek:
      overrides.processingDayOfWeek ??
      (Array.isArray(defaults.processing_days) && defaults.processing_days.length > 0 ? defaults.processing_days[0] : null),
    processingTimeUtc: overrides.processingTimeUtc ?? defaults.processing_time_utc ?? null,
    claimLimitPerPeriod: overrides.claimLimitPerPeriod ?? defaults.max_claims_per_period ?? null,
    faabBudget: overrides.faabBudget ?? defaults.FAAB_budget_default ?? null,
    faabResetDate: null,
    tiebreakRule: resolvedTiebreakRule,
    lockType: resolvedLockType,
    instantFaAfterClear: resolvedInstantFa,
  }
}

export async function upsertLeagueWaiverSettings(
  leagueId: string,
  input: LeagueWaiverSettingsInput
) {
  const [league, existing] = await Promise.all([
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { sport: true, leagueVariant: true },
    }),
    (prisma as any).leagueWaiverSettings.findUnique({
      where: { leagueId },
    }),
  ])
  const sport = (league?.sport as string) || DEFAULT_SPORT
  const variant = league?.leagueVariant ?? null
  const defaults = getWaiverDefaults(toSportType(sport) as any, variant ?? undefined)
  const fallbackWaiverType = existing?.waiverType ?? defaults.waiver_type ?? "standard"
  const fallbackProcessingDay =
    existing?.processingDayOfWeek ??
    (Array.isArray(defaults.processing_days) && defaults.processing_days.length > 0 ? defaults.processing_days[0] : null)
  const fallbackProcessingTime = existing?.processingTimeUtc ?? defaults.processing_time_utc ?? null
  const fallbackClaimLimit = existing?.claimLimitPerPeriod ?? defaults.max_claims_per_period ?? null
  const fallbackFaabBudget = existing?.faabBudget ?? defaults.FAAB_budget_default ?? null
  const fallbackTiebreak = existing?.tiebreakRule ?? (defaults.claim_priority_behavior as string) ?? null
  const fallbackLockType = existing?.lockType ?? (defaults.game_lock_behavior as string) ?? null
  const fallbackInstantFa =
    existing?.instantFaAfterClear ??
    (defaults.free_agent_unlock_behavior === "instant")

  const data = {
    waiverType: input.waiverType ?? fallbackWaiverType,
    processingDayOfWeek:
      input.processingDayOfWeek === undefined ? fallbackProcessingDay : input.processingDayOfWeek,
    processingTimeUtc:
      input.processingTimeUtc === undefined ? fallbackProcessingTime : input.processingTimeUtc,
    claimLimitPerPeriod:
      input.claimLimitPerPeriod === undefined ? fallbackClaimLimit : input.claimLimitPerPeriod,
    faabBudget:
      input.faabBudget === undefined ? fallbackFaabBudget : input.faabBudget,
    faabResetDate:
      input.faabResetDate === undefined
        ? (existing?.faabResetDate ?? null)
        : input.faabResetDate
          ? new Date(input.faabResetDate)
          : null,
    tiebreakRule:
      input.tiebreakRule === undefined ? fallbackTiebreak : input.tiebreakRule,
    lockType:
      input.lockType === undefined ? fallbackLockType : input.lockType,
    instantFaAfterClear:
      input.instantFaAfterClear === undefined ? fallbackInstantFa : input.instantFaAfterClear,
  }
  const row = await (prisma as any).leagueWaiverSettings.upsert({
    where: { leagueId },
    create: { leagueId, ...data },
    update: data,
  })
  return row
}
