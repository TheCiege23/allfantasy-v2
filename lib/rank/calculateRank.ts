import { prisma } from '@/lib/prisma'

export type CalculateRankResult = {
  rankTier: string
  xpTotal: bigint
  xpLevel: number
  careerWins: number
  careerLosses: number
  careerChampionships: number
  careerPlayoffAppearances: number
  careerSeasonsPlayed: number
  careerLeaguesPlayed: number
}

/**
 * Computes T1–T6 tier + XP from imported `League` rows (Sleeper import stats) and persists to `user_profiles`.
 * Safe to call after Phase-1 league list import; does not require legacy DB rows.
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
        importPointsAgainst: true,
        season: true,
      },
    })

    if (!leagues.length) return null

    const careerWins = leagues.reduce((s, l) => s + (l.importWins ?? 0), 0)
    const careerLosses = leagues.reduce((s, l) => s + (l.importLosses ?? 0), 0)
    const careerChampionships = leagues.filter((l) => l.importWonChampionship === true).length
    const careerPlayoffAppearances = leagues.filter((l) => l.importMadePlayoffs === true).length
    /** Total league-season rows (e.g. 489 across years). */
    const careerLeaguesPlayed = leagues.length
    /** Distinct calendar seasons with at least one league (e.g. 29). */
    const careerSeasonsPlayed = new Set(leagues.map((l) => l.season)).size

    const xpTotal = BigInt(
      careerWins * 10 +
        careerChampionships * 100 +
        careerPlayoffAppearances * 25 +
        careerSeasonsPlayed * 5,
    )
    const xpLevel = Math.floor(Number(xpTotal) / 100) + 1

    // Tier uses distinct seasons for “career breadth” (T4 All-Pro ≈ 5+ seasons, heavy volume).
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
      xpTotal,
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
