import { prisma } from '@/lib/prisma'

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
 * Computes T1–T6 tier + XP from imported `League` rows and persists to `user_profiles`.
 * Variable names match DB columns: `careerSeasonsPlayed` = league row count, `careerLeaguesPlayed` = distinct seasons.
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
      },
    })

    if (!leagues.length) return null

    const careerWins = leagues.reduce((s, l) => s + (l.importWins ?? 0), 0)
    const careerLosses = leagues.reduce((s, l) => s + (l.importLosses ?? 0), 0)
    const careerChampionships = leagues.filter((l) => l.importWonChampionship === true).length
    const careerPlayoffAppearances = leagues.filter((l) => l.importMadePlayoffs === true).length
    const careerSeasonsPlayed = leagues.length
    const careerLeaguesPlayed = new Set(leagues.map((l) => l.season)).size

    const xpNum =
      careerWins * 10 +
      careerChampionships * 100 +
      careerPlayoffAppearances * 25 +
      careerSeasonsPlayed * 5
    const xpTotal = BigInt(xpNum)
    const xpLevel = Math.floor(xpNum / 100) + 1

    let rankTier = 'T6'
    if (careerChampionships >= 3) rankTier = 'T1'
    else if (careerChampionships >= 1) rankTier = 'T2'
    else if (careerPlayoffAppearances >= 3) rankTier = 'T3'
    else if (careerSeasonsPlayed >= 5) rankTier = 'T4'
    else if (careerSeasonsPlayed >= 2) rankTier = 'T5'

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
