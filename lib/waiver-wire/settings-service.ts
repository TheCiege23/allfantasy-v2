import { prisma } from "@/lib/prisma"
import type { LeagueWaiverSettingsInput } from "./types"

export async function getLeagueWaiverSettings(leagueId: string) {
  const row = await (prisma as any).leagueWaiverSettings.findUnique({
    where: { leagueId },
  })
  return row
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
