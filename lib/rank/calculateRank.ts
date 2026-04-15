import { prisma } from '@/lib/prisma'
import { getLevelFromXp } from '@/lib/rank/levels'

/** Imported-career XP weights (Sleeper history on `League` rows). Losses do not subtract XP. */
export const RANK_XP_PER_IMPORT_WIN = 10
export const RANK_XP_PER_PLAYOFF_APPEARANCE = 30
export const RANK_XP_PER_CHAMPIONSHIP = 200
/** Per distinct season represented in imported league rows. */
export const RANK_XP_PER_DISTINCT_SEASON = 10
/** Per league: max(0, leagueSize − 10) × this value. */
export const RANK_XP_LEAGUE_SIZE_MULTIPLIER = 2

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
    /** Hub/sync leagues omit import_*; only ranking snapshots and legacy career rows contribute XP. */
    const leagues = await prisma.league.findMany({
      where: {
        userId,
        OR: [{ leagueVariant: 'legacy_summary' }, { importWins: { not: null } }],
      },
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
      return sum + Math.max(0, teams - 10) * RANK_XP_LEAGUE_SIZE_MULTIPLIER
    }, 0)

    const xpNum =
      careerWins * RANK_XP_PER_IMPORT_WIN +
      careerPlayoffAppearances * RANK_XP_PER_PLAYOFF_APPEARANCE +
      careerChampionships * RANK_XP_PER_CHAMPIONSHIP +
      careerLeaguesPlayed * RANK_XP_PER_DISTINCT_SEASON +
      leagueSizeBonus

    const xpTotal = BigInt(xpNum)
    const levelResult = getLevelFromXp(xpNum)
    const rankTier = levelResult.tier
    const xpLevel = levelResult.level

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
