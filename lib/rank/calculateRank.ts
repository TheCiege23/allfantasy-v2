import { prisma } from '@/lib/prisma'
import { getLevelFromXp } from '@/lib/rank/levels'

/** Returned `xpTotal` is the numeric XP total (same value persisted as BigInt on `user_profiles`). */
export type CalculateRankResult = {
  rankTier: string
  xpTotal: number
  xpLevel: number
  careerWins: number
  careerLosses: number
  careerChampionships: number
  careerPlayoffAppearances: number
  careerSeasonsPlayed: number
  careerLeaguesPlayed: number
}

/**
 * XP from imported `League` rows; level/tier from `getLevelFromXp`.
 * DB columns: `careerSeasonsPlayed` = league row count, `careerLeaguesPlayed` = distinct seasons.
 */
export async function calculateAndSaveRank(userId: string): Promise<CalculateRankResult | null> {
  try {
    const leagues = await prisma.league.findMany({
      where: { userId },
      select: {
        importWins: true,
        importLosses: true,
        importTies: true,
        importMadePlayoffs: true,
        importWonChampionship: true,
        importFinalStanding: true,
        importPointsFor: true,
        season: true,
        platform: true,
        leagueSize: true,
      },
    })

    if (!leagues.length) return null

    const careerWins = leagues.reduce((s, l) => s + (l.importWins ?? 0), 0)
    const careerLosses = leagues.reduce((s, l) => s + (l.importLosses ?? 0), 0)
    const careerChampionships = leagues.filter((l) => l.importWonChampionship === true).length
    const careerPlayoffAppearances = leagues.filter((l) => l.importMadePlayoffs === true).length
    const careerSeasonsPlayed = leagues.length
    const careerLeaguesPlayed = new Set(leagues.map((l) => l.season)).size

    const leagueSizeBonus = leagues.reduce((sum, l) => {
      const teams = l.leagueSize ?? 12
      return sum + Math.max(0, teams - 10) * 2
    }, 0)

    const xpNum =
      careerWins * 10 +
      careerPlayoffAppearances * 30 +
      careerChampionships * 200 +
      careerLeaguesPlayed * 10 +
      leagueSizeBonus

    const xpTotal = BigInt(xpNum)
    const levelResult = getLevelFromXp(xpNum)
    const rankTier = levelResult.tier
    const xpLevel = levelResult.level

    try {
      await prisma.userProfile.upsert({
        where: { userId },
        update: {
          rankTier,
          xpTotal,
          xpLevel,
          careerWins,
          careerLosses,
          careerChampionships,
          careerPlayoffAppearances,
          careerSeasonsPlayed,
          careerLeaguesPlayed,
          rankCalculatedAt: new Date(),
        },
        create: {
          userId,
          rankTier,
          xpTotal,
          xpLevel,
          careerWins,
          careerLosses,
          careerChampionships,
          careerPlayoffAppearances,
          careerSeasonsPlayed,
          careerLeaguesPlayed,
          rankCalculatedAt: new Date(),
        },
      })
    } catch (inner: unknown) {
      console.error('[calculateAndSaveRank] upsert failed (missing rank columns?):', inner)
      try {
        await prisma.userProfile.upsert({
          where: { userId },
          update: {
            legacyCareerLevel: xpLevel,
            legacyCareerXp: xpTotal,
            legacyRankUpdatedAt: new Date(),
          },
          create: {
            userId,
            legacyCareerLevel: xpLevel,
            legacyCareerXp: xpTotal,
            legacyRankUpdatedAt: new Date(),
          },
        })
      } catch (fallbackErr: unknown) {
        console.error('[calculateAndSaveRank] legacy fallback upsert failed:', fallbackErr)
        return null
      }
    }

    return {
      rankTier,
      xpTotal: xpNum,
      xpLevel,
      careerWins,
      careerLosses,
      careerChampionships,
      careerPlayoffAppearances,
      careerSeasonsPlayed,
      careerLeaguesPlayed,
    }
  } catch (err: unknown) {
    console.error('[calculateAndSaveRank] error:', err)
    return null
  }
}
