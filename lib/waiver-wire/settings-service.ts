import { prisma } from "@/lib/prisma"
import { DEFAULT_SPORT } from "@/lib/sport-scope"
import { getWaiverDefaults } from "@/lib/sport-defaults/SportDefaultsRegistry"
import { toSportType } from "@/lib/sport-defaults/sport-type-utils"
import type { LeagueWaiverSettingsInput } from "./types"

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
      select: { id: true, sport: true, leagueVariant: true },
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
  return {
    leagueId,
    waiverType: defaults.waiver_type ?? "standard",
    processingDayOfWeek: Array.isArray(defaults.processing_days) && defaults.processing_days.length > 0 ? defaults.processing_days[0] : null,
    processingTimeUtc: defaults.processing_time_utc ?? null,
    claimLimitPerPeriod: defaults.max_claims_per_period ?? null,
    faabBudget: defaults.FAAB_budget_default ?? null,
    faabResetDate: null,
    tiebreakRule: (defaults.claim_priority_behavior as string) ?? null,
    lockType: (defaults.game_lock_behavior as string) ?? null,
    instantFaAfterClear: defaults.free_agent_unlock_behavior === "instant",
  }
}

export async function upsertLeagueWaiverSettings(
  leagueId: string,
  input: LeagueWaiverSettingsInput
) {
  const data = {
    waiverType: input.waiverType ?? "standard",
    processingDayOfWeek: input.processingDayOfWeek ?? null,
    processingTimeUtc: input.processingTimeUtc ?? null,
    claimLimitPerPeriod: input.claimLimitPerPeriod ?? null,
    faabBudget: input.faabBudget ?? null,
    faabResetDate: input.faabResetDate ? new Date(input.faabResetDate) : null,
    tiebreakRule: input.tiebreakRule ?? null,
    lockType: input.lockType ?? null,
    instantFaAfterClear: input.instantFaAfterClear ?? true,
  }
  const row = await (prisma as any).leagueWaiverSettings.upsert({
    where: { leagueId },
    create: { leagueId, ...data },
    update: data,
  })
  return row
}
