/**
 * Commissioner settings: get and update league general, roster, and settings.
 * Used by commissioner panel and Settings tab. Commissioner = League.userId.
 */

import { prisma } from "@/lib/prisma"
import type { LeagueSettingsPatch, LeagueConfigurationView } from "./types"
import { SUPPORTED_SPORTS } from "@/lib/sport-scope"
import type { LeagueSport } from "@prisma/client"

const ALLOWED_TOP_LEVEL = [
  "name",
  "scoring",
  "status",
  "avatarUrl",
  "rosterSize",
  "leagueSize",
  "starters",
  "sport",
  "season",
] as const
const SETTINGS_KEYS = [
  "description",
  "lineupLockRule",
  "publicDashboard",
  "rankedVisibility",
  "orphanSeeking",
  "orphanDifficulty",
  "leagueChatThreadId",
  "tradeReviewType",
  "vetoThreshold",
] as const

export async function getLeagueConfiguration(leagueId: string): Promise<LeagueConfigurationView | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      leagueSize: true,
      rosterSize: true,
      starters: true,
      settings: true,
    },
  })
  if (!league) return null
  const settings = (league.settings as Record<string, unknown>) || {}
  return {
    id: league.id,
    name: league.name,
    description: (settings.description as string) ?? null,
    sport: league.sport,
    season: league.season,
    leagueSize: league.leagueSize,
    rosterSize: league.rosterSize,
    starters: league.starters,
    settings,
  }
}

export async function updateLeagueSettings(
  leagueId: string,
  patch: LeagueSettingsPatch
): Promise<LeagueConfigurationView | null> {
  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED_TOP_LEVEL) {
    const v = patch[key as keyof LeagueSettingsPatch]
    if (v !== undefined) updates[key] = v
  }
  const settingsUpdates: Record<string, unknown> = {}
  for (const key of SETTINGS_KEYS) {
    const v = patch[key as keyof LeagueSettingsPatch]
    if (v !== undefined) settingsUpdates[key] = v
  }
  if (Object.keys(settingsUpdates).length > 0) {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { settings: true },
    })
    const current = (league?.settings as Record<string, unknown>) || {}
    updates.settings = { ...current, ...settingsUpdates }
  }
  if (Object.keys(updates).length === 0) return getLeagueConfiguration(leagueId)
  await prisma.league.update({
    where: { id: leagueId },
    data: updates,
  })
  return getLeagueConfiguration(leagueId)
}
