import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeCompositeProfile, type LeagueRecord } from '@/lib/legacy/overview-scoring'
import { calculateAndSaveRank } from '@/lib/rank/calculateRank'
import { getLevelFromXp } from '@/lib/rank/levels'
import { prisma } from '@/lib/prisma'

function logFullError(context: string, err: unknown) {
  const payload =
    err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err
  console.error(context, '[api/user/rank] FULL ERROR:', JSON.stringify(payload, null, 2))
}

/** `NextResponse.json` cannot serialize BigInt — normalize Prisma bigint fields. */
function jsonSafeXp(n: bigint | number | null | undefined): number {
  if (n == null) return 0
  return typeof n === 'bigint' ? Number(n) : Number.isFinite(n) ? n : 0
}

function tierNullResponse() {
  return NextResponse.json({
    tier: null,
    level: null,
    levelName: null,
    tierGroup: null,
    color: null,
    bgColor: null,
    xpIntoLevel: null,
    xpForLevel: null,
    progressPct: null,
    nextLevelName: null,
    careerWins: null,
    careerLosses: null,
    careerChampionships: null,
    careerPlayoffAppearances: null,
    careerSeasonsPlayed: null,
    careerLeaguesPlayed: null,
    stats: null,
    careerStats: null,
    imported: false,
    rank: null,
    tierName: null,
    xpTotal: null,
    xpLevel: null,
    rankProcessing: false,
    rankCalculatedAt: null,
    legacyUsername: null,
    overviewProfile: null,
  })
}

/** Full 25-level payload for `/api/user/rank` (STEP 3). */
function userRankLevelPayloadFromProfile(p: ProfileRankDenormResult) {
  const xp = jsonSafeXp(p.xpTotal)
  const lv = getLevelFromXp(xp)
  return {
    tier: lv.tier,
    level: p.xpLevel ?? lv.level,
    levelName: lv.name,
    tierGroup: lv.tierGroup,
    color: lv.color,
    bgColor: lv.bgColor,
    xpTotal: xp,
    xpIntoLevel: lv.xpIntoLevel,
    xpForLevel: lv.xpForLevel,
    progressPct: lv.progressPct,
    nextLevelName: lv.nextLevel?.name ?? null,
    careerWins: p.careerWins,
    careerLosses: p.careerLosses,
    careerChampionships: p.careerChampionships,
    careerPlayoffAppearances: p.careerPlayoffAppearances,
    careerSeasonsPlayed: p.careerSeasonsPlayed,
    careerLeaguesPlayed: p.careerLeaguesPlayed,
    rankCalculatedAt: p.rankCalculatedAt?.toISOString() ?? null,
  }
}

function clampScore(value: unknown, fallback = 70) {
  const score = Number(value)
  if (!Number.isFinite(score)) return fallback
  return Math.max(0, Math.min(100, Math.round(score)))
}

function scoreToLetterGrade(score: number) {
  if (score >= 97) return 'A+'
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  if (score >= 67) return 'D+'
  if (score >= 63) return 'D'
  if (score >= 60) return 'D-'
  return 'F'
}

function firstInsightValue(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const candidates = Object.values(row)
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
    if (Array.isArray(candidate)) {
      const firstText = candidate.find((entry) => typeof entry === 'string' && entry.trim())
      if (typeof firstText === 'string') return firstText.trim()
    }
  }
  return null
}

type LegacyLeagueRowForRank = {
  season: number
  leagueType: string | null
  scoringType: string | null
  specialtyFormat: string | null
  isSF: boolean
  isTEP: boolean
  teamCount: number | null
  playoffTeams: number | null
  rosters: Array<{
    wins: number
    losses: number
    ties: number
    isChampion: boolean
    finalStanding: number | null
    playoffSeed: number | null
  }>
}

function buildLeagueRecord(league: LegacyLeagueRowForRank): LeagueRecord | null {
  const roster = league.rosters[0]
  if (!roster) return null

  const madePlayoffs =
    roster.isChampion ||
    roster.playoffSeed != null ||
    (league.playoffTeams != null && roster.finalStanding != null && roster.finalStanding <= league.playoffTeams)

  return {
    league_id: `${league.season}-${league.leagueType ?? 'league'}-${league.scoringType ?? 'default'}`,
    type: league.leagueType ?? 'redraft',
    scoring: league.scoringType ?? 'standard',
    specialty_format: league.specialtyFormat ?? undefined,
    is_sf: league.isSF,
    is_tep: league.isTEP,
    team_count: league.teamCount ?? 12,
    wins: roster.wins,
    losses: roster.losses,
    ties: roster.ties,
    is_champion: roster.isChampion,
    made_playoffs: madePlayoffs,
  }
}

export type UserRankCareerStats = {
  seasonsPlayed: number
  totalWins: number
  totalLosses: number
  championships: number
  playoffAppearances: number
  leaguesPlayed: number
}

/** Map DB denorm to API stats: DB `career_leagues_played` = distinct seasons → `seasonsPlayed`; DB `career_seasons_played` = row count → `leaguesPlayed`. */
function careerStatsFromProfileDenorm(denorm: ProfileRankDenormResult): UserRankCareerStats {
  return {
    seasonsPlayed: denorm.careerLeaguesPlayed ?? 0,
    totalWins: denorm.careerWins ?? 0,
    totalLosses: denorm.careerLosses ?? 0,
    championships: denorm.careerChampionships ?? 0,
    playoffAppearances: denorm.careerPlayoffAppearances ?? 0,
    leaguesPlayed: denorm.careerSeasonsPlayed ?? 0,
  }
}

export const dynamic = 'force-dynamic'

async function loadProfileRankFlags(userId: string): Promise<{
  rankProcessing: boolean
  rankCalculatedAtIso: string | null
}> {
  try {
    const profileFlags = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        leagueImportDetailPending: true,
        rankCalculatedAt: true,
      },
    })
    return {
      rankProcessing: profileFlags?.leagueImportDetailPending === true,
      rankCalculatedAtIso: profileFlags?.rankCalculatedAt?.toISOString() ?? null,
    }
  } catch (err: unknown) {
    console.error('[api/user/rank] userProfile flags query failed (missing columns?):', err)
    return { rankProcessing: false, rankCalculatedAtIso: null }
  }
}

const RANK_DENORM_SELECT_FULL = {
  rankTier: true,
  xpTotal: true,
  xpLevel: true,
  legacyCareerTier: true,
  legacyCareerTierName: true,
  legacyCareerLevel: true,
  legacyCareerXp: true,
  careerWins: true,
  careerLosses: true,
  careerChampionships: true,
  careerPlayoffAppearances: true,
  careerSeasonsPlayed: true,
  careerLeaguesPlayed: true,
  rankCalculatedAt: true,
} as const

const RANK_DENORM_SELECT_MIN = {
  rankTier: true,
  xpTotal: true,
  xpLevel: true,
  legacyCareerTier: true,
  legacyCareerTierName: true,
  legacyCareerLevel: true,
  legacyCareerXp: true,
  careerWins: true,
  careerLosses: true,
  careerChampionships: true,
  careerPlayoffAppearances: true,
  careerSeasonsPlayed: true,
  careerLeaguesPlayed: true,
  rankCalculatedAt: true,
} as const

/** Shape aligned with rank denorm selects + raw SQL fallback. */
export type ProfileRankDenormResult = {
  rankTier: string | null
  xpTotal: bigint | null
  xpLevel: number | null
  legacyCareerTier: number | null
  legacyCareerTierName: string | null
  legacyCareerLevel: number | null
  legacyCareerXp: bigint | null
  careerWins: number | null
  careerLosses: number | null
  careerChampionships: number | null
  careerPlayoffAppearances: number | null
  careerSeasonsPlayed: number | null
  careerLeaguesPlayed: number | null
  rankCalculatedAt: Date | null
}

/** Map raw SQL row (snake_case DB columns) to denorm shape. */
function mapRawUserProfileRankRow(row: Record<string, unknown>): ProfileRankDenormResult {
  return {
    rankTier: (row.rank_tier as string | null | undefined) ?? null,
    xpTotal: row.xp_total != null ? BigInt(String(row.xp_total)) : null,
    xpLevel: (row.xp_level as number | null | undefined) ?? null,
    legacyCareerTier: (row.legacy_career_tier as number | null | undefined) ?? null,
    legacyCareerTierName: (row.legacy_career_tier_name as string | null | undefined) ?? null,
    legacyCareerLevel: (row.legacy_career_level as number | null | undefined) ?? null,
    legacyCareerXp:
      row.legacy_career_xp != null ? BigInt(String(row.legacy_career_xp)) : null,
    careerWins: (row.career_wins as number | null | undefined) ?? null,
    careerLosses: (row.career_losses as number | null | undefined) ?? null,
    careerChampionships: (row.career_championships as number | null | undefined) ?? null,
    careerPlayoffAppearances: (row.career_playoff_appearances as number | null | undefined) ?? null,
    careerSeasonsPlayed: (row.career_seasons_played as number | null | undefined) ?? null,
    careerLeaguesPlayed: (row.career_leagues_played as number | null | undefined) ?? null,
    rankCalculatedAt: row.rank_calculated_at
      ? new Date(String(row.rank_calculated_at))
      : null,
  }
}

/** Denormalized rank on user_profiles — full Prisma select, then minimal, then $queryRaw, then safe columns only. */
async function loadProfileRankDenorm(userId: string): Promise<ProfileRankDenormResult | null> {
  try {
    return await prisma.userProfile.findUnique({
      where: { userId },
      select: RANK_DENORM_SELECT_FULL,
    })
  } catch (err: unknown) {
    logFullError(
      '[api/user/rank] userProfile denorm (full) failed — fields rank_tier/xp_total/… may be missing in DB',
      err,
    )
    try {
      return await prisma.userProfile.findUnique({
        where: { userId },
        select: RANK_DENORM_SELECT_MIN,
      })
    } catch (err2: unknown) {
      logFullError('[api/user/rank] userProfile denorm (minimal) failed', err2)
      try {
        const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
          SELECT "rank_tier", "xp_total", "xp_level",
                 "legacy_career_tier", "legacy_career_tier_name", "legacy_career_level", "legacy_career_xp",
                 "career_wins", "career_losses", "career_championships", "career_playoff_appearances",
                 "career_seasons_played", "career_leagues_played", "rank_calculated_at"
          FROM user_profiles WHERE "userId" = ${userId} LIMIT 1
        `
        const row = rows[0]
        if (!row) return null
        return mapRawUserProfileRankRow(row)
      } catch (err3: unknown) {
        logFullError('[api/user/rank] userProfile $queryRaw rank columns failed', err3)
        try {
          await prisma.userProfile.findUnique({
            where: { userId },
            select: { userId: true, displayName: true, createdAt: true },
          })
          console.warn(
            '[rank] user_profiles row readable with safe columns only (userId, displayName, createdAt) — rank fields failed',
          )
        } catch (err4: unknown) {
          logFullError('[api/user/rank] userProfile safe select failed', err4)
        }
        return null
      }
    }
  }
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const url = new URL(request.url)
    const forceRecalculate = url.searchParams.get('recalculate') === 'true'

    let rankCalculatedAtProbe: Date | null = null
    let rankCalculatedProbeOk = false
    try {
      const probe = await prisma.userProfile.findUnique({
        where: { userId },
        select: { rankCalculatedAt: true },
      })
      rankCalculatedAtProbe = probe?.rankCalculatedAt ?? null
      rankCalculatedProbeOk = true
    } catch (probeErr: unknown) {
      logFullError('[api/user/rank] rankCalculatedAt probe (missing columns?)', probeErr)
    }

    const shouldRunCalculate =
      forceRecalculate || (rankCalculatedProbeOk && rankCalculatedAtProbe === null)
    if (shouldRunCalculate) {
      try {
        await calculateAndSaveRank(userId)
      } catch (recalcErr: unknown) {
        logFullError('[api/user/rank] calculateAndSaveRank (recalculate or rankCalculatedAt null)', recalcErr)
      }
    }

    let denormCatchup = await loadProfileRankDenorm(userId)
    if (!denormCatchup?.rankTier?.trim()) {
      try {
        await calculateAndSaveRank(userId)
      } catch (recalcErr: unknown) {
        logFullError('[api/user/rank] calculateAndSaveRank (catch-up when rank_tier still empty)', recalcErr)
      }
      denormCatchup = await loadProfileRankDenorm(userId)
    }

    let appUser:
      | {
          id: string
          legacyUserId: string | null
          username: string
          displayName: string | null
          legacyUser: { sleeperUsername: string } | null
        }
      | null = null
    try {
      appUser = await prisma.appUser.findUnique({
        where: { id: userId },
        select: {
          id: true,
          legacyUserId: true,
          username: true,
          displayName: true,
          legacyUser: {
            select: {
              sleeperUsername: true,
            },
          },
        },
      })
    } catch (e: unknown) {
      logFullError('[api/user/rank] appUser query failed; retrying without legacyUser join', e)
      appUser = await prisma.appUser
        .findUnique({
          where: { id: userId },
          select: {
            id: true,
            legacyUserId: true,
            username: true,
            displayName: true,
          },
        })
        .then((u) => (u ? { ...u, legacyUser: null } : null))
        .catch(() => null)
    }

    const [profileFlags] = await Promise.all([loadProfileRankFlags(userId)])

    const { rankProcessing, rankCalculatedAtIso } = profileFlags

    if (!appUser) {
      return tierNullResponse()
    }

    if (!appUser.legacyUserId) {
      const denormEarly = denormCatchup
      const tierLabelEarly = denormEarly?.rankTier?.trim()
      if (tierLabelEarly) {
        const legacyUsernameEarly =
          appUser.legacyUser?.sleeperUsername ?? appUser.displayName ?? appUser.username ?? null
        const xpNum =
          denormEarly?.xpTotal != null
            ? jsonSafeXp(denormEarly.xpTotal)
            : jsonSafeXp(
                denormEarly && 'legacyCareerXp' in denormEarly ? denormEarly.legacyCareerXp : null,
              )
        const lv = getLevelFromXp(xpNum)
        const careerStats = careerStatsFromProfileDenorm(denormEarly!)
        const rank = {
          careerTier: lv.tierGroup,
          careerTierName: lv.name,
          careerLevel: denormEarly?.xpLevel ?? lv.level,
          careerXp: String(
            jsonSafeXp(denormEarly?.legacyCareerXp ?? denormEarly?.xpTotal),
          ),
          aiReportGrade: 'B',
          aiScore: 70,
          aiInsight: 'Import your leagues to generate your AI insight.',
          winRate: 0,
          playoffRate: 0,
          championshipCount: careerStats.championships,
          seasonsPlayed: careerStats.seasonsPlayed,
          totalWins: careerStats.totalWins,
          totalLosses: careerStats.totalLosses,
          totalTies: 0,
          playoffAppearances: careerStats.playoffAppearances,
          importedAt: denormEarly?.rankCalculatedAt?.toISOString() ?? null,
        }
        const levelPayload = userRankLevelPayloadFromProfile(denormEarly!)
        return NextResponse.json({
          imported: true,
          ...levelPayload,
          tierName: lv.name,
          xpLevel: levelPayload.level,
          careerStats,
          stats: careerStats,
          rank,
          rankProcessing,
          rankCalculatedAt: levelPayload.rankCalculatedAt ?? rankCalculatedAtIso,
          legacyUsername: legacyUsernameEarly,
          overviewProfile: null,
        })
      }
      let hasLeagues = false
      try {
        hasLeagues = (await prisma.league.count({ where: { userId } })) > 0
      } catch (cntErr: unknown) {
        logFullError('[api/user/rank] league count (imported hint) failed', cntErr)
      }
      const legacyUsernameNoLegacy =
        appUser.legacyUser?.sleeperUsername ?? appUser.displayName ?? appUser.username ?? null
      return NextResponse.json({
        imported: hasLeagues,
        rank: null,
        tier: null,
        level: null,
        levelName: null,
        tierGroup: null,
        color: null,
        bgColor: null,
        xpTotal: null,
        xpLevel: null,
        xpIntoLevel: null,
        xpForLevel: null,
        progressPct: null,
        nextLevelName: null,
        careerWins: null,
        careerLosses: null,
        careerChampionships: null,
        careerPlayoffAppearances: null,
        careerSeasonsPlayed: null,
        careerLeaguesPlayed: null,
        tierName: null,
        careerStats: null,
        stats: null,
        rankProcessing: false,
        rankCalculatedAt: null,
        legacyUsername: legacyUsernameNoLegacy,
        overviewProfile: null,
      })
    }

    const legacyUsername =
      appUser.legacyUser?.sleeperUsername ?? appUser.displayName ?? appUser.username ?? null

    let rankCache: Awaited<ReturnType<typeof prisma.legacyUserRankCache.findUnique>> = null
    try {
      rankCache = await prisma.legacyUserRankCache.findUnique({
        where: { legacyUserId: appUser.legacyUserId },
      })
    } catch (cacheErr: unknown) {
      logFullError('[api/user/rank] legacyUserRankCache query failed', cacheErr)
      rankCache = null
    }

    if (!rankCache) {
      const denorm = denormCatchup
      const tierLabel = denorm?.rankTier?.trim()
      if (tierLabel) {
        const xpNum =
          denorm?.xpTotal != null
            ? jsonSafeXp(denorm.xpTotal)
            : jsonSafeXp(denorm && 'legacyCareerXp' in denorm ? denorm.legacyCareerXp : null)
        const lv = getLevelFromXp(xpNum)
        const careerStats = careerStatsFromProfileDenorm(denorm!)
        const rank = {
          careerTier: lv.tierGroup,
          careerTierName: lv.name,
          careerLevel: denorm?.xpLevel ?? lv.level,
          careerXp: String(jsonSafeXp(denorm?.legacyCareerXp ?? denorm?.xpTotal)),
          aiReportGrade: 'B',
          aiScore: 70,
          aiInsight: 'Import your leagues to generate your AI insight.',
          winRate: 0,
          playoffRate: 0,
          championshipCount: careerStats.championships,
          seasonsPlayed: careerStats.seasonsPlayed,
          totalWins: careerStats.totalWins,
          totalLosses: careerStats.totalLosses,
          totalTies: 0,
          playoffAppearances: careerStats.playoffAppearances,
          importedAt: denorm?.rankCalculatedAt?.toISOString() ?? null,
        }
        const levelPayload = userRankLevelPayloadFromProfile(denorm!)
        return NextResponse.json({
          imported: true,
          ...levelPayload,
          tierName: lv.name,
          xpLevel: levelPayload.level,
          careerStats,
          stats: careerStats,
          rank,
          rankProcessing,
          rankCalculatedAt: levelPayload.rankCalculatedAt ?? rankCalculatedAtIso,
          legacyUsername,
          overviewProfile: null,
        })
      }

      return NextResponse.json({
        imported: true,
        rank: null,
        tier: null,
        level: null,
        levelName: null,
        tierGroup: null,
        color: null,
        bgColor: null,
        xpTotal: null,
        xpLevel: null,
        xpIntoLevel: null,
        xpForLevel: null,
        progressPct: null,
        nextLevelName: null,
        careerWins: null,
        careerLosses: null,
        careerChampionships: null,
        careerPlayoffAppearances: null,
        careerSeasonsPlayed: null,
        careerLeaguesPlayed: null,
        tierName: null,
        careerStats: null,
        stats: null,
        rankProcessing,
        rankCalculatedAt: rankCalculatedAtIso,
        legacyUsername,
      })
    }

    let importedLeagueRows: Array<{
      season: number
      importWins: number | null
      importLosses: number | null
      importTies: number | null
      importMadePlayoffs: boolean | null
      importWonChampionship: boolean | null
    }> = []

    try {
      importedLeagueRows = await prisma.league.findMany({
        where: {
          userId,
          platform: 'sleeper',
          importWins: { not: null },
        },
        select: {
          season: true,
          importWins: true,
          importLosses: true,
          importTies: true,
          importMadePlayoffs: true,
          importWonChampionship: true,
        },
      })
    } catch (err: unknown) {
      console.error('[api/user/rank] imported League rows query failed (import_* columns on leagues?):', err)
      importedLeagueRows = []
    }

    let aiReport: {
      rating: number | null
      title: string | null
      summary: string | null
      insights: unknown
      shareText: string | null
    } | null = null

    let legacyLeagues: LegacyLeagueRowForRank[] = []

    try {
      const [ai, legs] = await Promise.all([
        prisma.legacyAIReport.findFirst({
          where: { userId: appUser.legacyUserId },
          orderBy: { createdAt: 'desc' },
          select: {
            rating: true,
            title: true,
            summary: true,
            insights: true,
            shareText: true,
          },
        }),
        prisma.legacyLeague.findMany({
          where: { userId: appUser.legacyUserId },
          orderBy: [{ season: 'desc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            season: true,
            leagueType: true,
            scoringType: true,
            specialtyFormat: true,
            isSF: true,
            isTEP: true,
            teamCount: true,
            playoffTeams: true,
            rosters: {
              where: { isOwner: true },
              take: 1,
              select: {
                wins: true,
                losses: true,
                ties: true,
                isChampion: true,
                finalStanding: true,
                playoffSeed: true,
              },
            },
          },
        }),
      ])
      aiReport = ai
      legacyLeagues = legs
    } catch (err: unknown) {
      console.error('[api/user/rank] legacy AI report / legacy leagues query failed:', err)
    }

    const leagueRecords =
      legacyLeagues
        ?.map(buildLeagueRecord)
        .filter((record): record is LeagueRecord => record != null) ?? []

    const totalWins = leagueRecords.reduce((sum, league) => sum + league.wins, 0)
    const totalLosses = leagueRecords.reduce((sum, league) => sum + league.losses, 0)
    const totalTies = leagueRecords.reduce((sum, league) => sum + (league.ties ?? 0), 0)
    const totalGames = totalWins + totalLosses + totalTies
    const seasonsPlayedLegacy = new Set((legacyLeagues ?? []).map((league) => league.season)).size
    const championshipCount = leagueRecords.filter((league) => league.is_champion).length
    const playoffCount = leagueRecords.filter((league) => league.made_playoffs).length
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0
    const playoffRate = leagueRecords.length > 0 ? (playoffCount / leagueRecords.length) * 100 : 0
    const aiScore = clampScore(aiReport?.rating, 70)
    const aiInsight =
      aiReport?.summary?.trim() ||
      firstInsightValue(aiReport?.insights) ||
      aiReport?.title?.trim() ||
      aiReport?.shareText?.trim() ||
      'Import your leagues to generate your AI insight.'

    let careerStats: UserRankCareerStats
    if (importedLeagueRows.length > 0) {
      const seasonsPlayed = new Set(importedLeagueRows.map((r) => r.season)).size
      careerStats = {
        seasonsPlayed,
        totalWins: importedLeagueRows.reduce((s, r) => s + (r.importWins ?? 0), 0),
        totalLosses: importedLeagueRows.reduce((s, r) => s + (r.importLosses ?? 0), 0),
        championships: importedLeagueRows.filter((r) => r.importWonChampionship === true).length,
        playoffAppearances: importedLeagueRows.filter((r) => r.importMadePlayoffs === true).length,
        leaguesPlayed: importedLeagueRows.length,
      }
    } else {
      careerStats = {
        seasonsPlayed: seasonsPlayedLegacy,
        totalWins,
        totalLosses,
        championships: championshipCount,
        playoffAppearances: playoffCount,
        leaguesPlayed: leagueRecords.length,
      }
    }

    const careerXpBig = rankCache.careerXp ?? 0n
    const xpTotalNum = Number(careerXpBig)
    const lv = getLevelFromXp(xpTotalNum)
    const d = denormCatchup
    const tier = lv.tier
    const tierName = lv.name

    const rank = {
      careerTier: lv.tierGroup,
      careerTierName: lv.name,
      careerLevel: rankCache.careerLevel ?? lv.level,
      careerXp: String(jsonSafeXp(careerXpBig)),
      aiReportGrade: scoreToLetterGrade(aiScore),
      aiScore,
      aiInsight,
      winRate: Math.round(winRate * 10) / 10,
      playoffRate: Math.round(playoffRate * 10) / 10,
      championshipCount,
      seasonsPlayed: careerStats.seasonsPlayed,
      totalWins: careerStats.totalWins,
      totalLosses: careerStats.totalLosses,
      totalTies,
      playoffAppearances: careerStats.playoffAppearances,
      importedAt: rankCache.lastCalculatedAt?.toISOString() ?? null,
    }

    let overviewProfile: ReturnType<typeof computeCompositeProfile> | null = null
    if (leagueRecords.length > 0) {
      try {
        overviewProfile = computeCompositeProfile(leagueRecords)
      } catch (err: unknown) {
        console.error('[api/user/rank] computeCompositeProfile failed:', err)
        overviewProfile = null
      }
    }

    const levelPayload = {
      tier,
      level: rankCache.careerLevel ?? lv.level,
      levelName: lv.name,
      tierGroup: lv.tierGroup,
      color: lv.color,
      bgColor: lv.bgColor,
      xpTotal: xpTotalNum,
      xpIntoLevel: lv.xpIntoLevel,
      xpForLevel: lv.xpForLevel,
      progressPct: lv.progressPct,
      nextLevelName: lv.nextLevel?.name ?? null,
      careerWins: d?.careerWins ?? careerStats.totalWins,
      careerLosses: d?.careerLosses ?? careerStats.totalLosses,
      careerChampionships: d?.careerChampionships ?? careerStats.championships,
      careerPlayoffAppearances: d?.careerPlayoffAppearances ?? careerStats.playoffAppearances,
      careerSeasonsPlayed: d?.careerSeasonsPlayed ?? careerStats.leaguesPlayed,
      careerLeaguesPlayed: d?.careerLeaguesPlayed ?? careerStats.seasonsPlayed,
      rankCalculatedAt: d?.rankCalculatedAt?.toISOString() ?? rankCalculatedAtIso,
    }

    return NextResponse.json({
      imported: true,
      ...levelPayload,
      tierName,
      xpLevel: levelPayload.level,
      careerStats,
      stats: careerStats,
      rank,
      rankProcessing,
      rankCalculatedAt: levelPayload.rankCalculatedAt,
      legacyUsername,
      overviewProfile,
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('[rank]', err.message, err.stack)
    } else {
      console.error('[rank]', err)
    }
    return tierNullResponse()
  }
}
