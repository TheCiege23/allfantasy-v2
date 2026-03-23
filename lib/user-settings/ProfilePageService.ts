import { getSettingsProfile } from "./SettingsQueryService"
import type { UserProfileForSettings } from "./types"
import { prisma } from "@/lib/prisma"
import { getUnifiedCareerProfile } from "@/lib/career-prestige/UnifiedCareerQueryService"
import { getFranchiseProfileByManager } from "@/lib/gm-economy/GMProfileQueryService"

export interface ProfileHighlightsDto {
  gmPrestigeScore: number | null
  gmTierLabel: string | null
  reputationTier: string | null
  reputationScore: number | null
  legacyScore: number | null
  contextLeagueName: string | null
}

/**
 * Profile page service: returns full editable profile for the current user.
 * Used by /profile (own profile) to render and edit.
 */
export async function getProfilePageData(
  userId: string
): Promise<UserProfileForSettings | null> {
  return getSettingsProfile(userId)
}

async function resolveProfileLeagueContext(userId: string): Promise<{
  leagueId: string
  leagueName: string | null
  sport: string | null
} | null> {
  // Primary lookup: league rosters where this user is the manager platform id.
  const rosterContext = await prisma.roster.findFirst({
    where: { platformUserId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      leagueId: true,
      league: { select: { name: true, sport: true } },
    },
  })
  if (rosterContext?.leagueId) {
    return {
      leagueId: rosterContext.leagueId,
      leagueName: rosterContext.league?.name ?? null,
      sport: rosterContext.league?.sport ?? null,
    }
  }

  // Fallback: latest league owned by the user.
  const ownedLeague = await prisma.league.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, sport: true },
  })
  if (!ownedLeague) return null
  return {
    leagueId: ownedLeague.id,
    leagueName: ownedLeague.name ?? null,
    sport: ownedLeague.sport ?? null,
  }
}

export async function getProfileHighlights(
  userId: string
): Promise<ProfileHighlightsDto> {
  const [gmProfile, leagueContext] = await Promise.all([
    getFranchiseProfileByManager(userId),
    resolveProfileLeagueContext(userId),
  ])

  const careerProfile = leagueContext
    ? await getUnifiedCareerProfile(userId, {
        leagueId: leagueContext.leagueId,
        sport: leagueContext.sport,
      })
    : null

  return {
    gmPrestigeScore: gmProfile?.gmPrestigeScore ?? null,
    gmTierLabel: gmProfile?.tierLabel ?? null,
    reputationTier: careerProfile?.reputation?.tier ?? null,
    reputationScore: careerProfile?.reputation?.overallScore ?? null,
    legacyScore: careerProfile?.legacy?.overallLegacyScore ?? null,
    contextLeagueName: leagueContext?.leagueName ?? null,
  }
}
