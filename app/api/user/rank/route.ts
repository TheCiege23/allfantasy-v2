import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeCompositeProfile, type LeagueRecord } from '@/lib/legacy/overview-scoring'
import { prisma } from '@/lib/prisma'

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

function buildLeagueRecord(league: {
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
}): LeagueRecord | null {
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

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [appUser, profileFlags] = await Promise.all([
      prisma.appUser.findUnique({
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
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          leagueImportDetailPending: true,
          rankCalculatedAt: true,
        },
      }),
    ])

    const rankProcessing = profileFlags?.leagueImportDetailPending === true
    const rankCalculatedAtIso = profileFlags?.rankCalculatedAt?.toISOString() ?? null

    if (!appUser?.legacyUserId) {
      return NextResponse.json({
        imported: false,
        rank: null,
        tier: null,
        tierName: null,
        xpTotal: null,
        xpLevel: null,
        careerStats: null,
        rankProcessing: false,
        rankCalculatedAt: null,
      })
    }

    const rankCache = await prisma.legacyUserRankCache.findUnique({
      where: { legacyUserId: appUser.legacyUserId },
    })

    if (!rankCache) {
      return NextResponse.json({
        imported: true,
        rank: null,
        tier: null,
        tierName: null,
        xpTotal: null,
        xpLevel: null,
        careerStats: null,
        rankProcessing,
        rankCalculatedAt: rankCalculatedAtIso,
        legacyUsername: appUser.legacyUser?.sleeperUsername ?? appUser.displayName ?? appUser.username ?? null,
      })
    }

    const importedLeagueRows = await prisma.league.findMany({
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

    const [aiReport, legacyLeagues] = await Promise.all([
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

    const leagueRecords = legacyLeagues
      .map(buildLeagueRecord)
      .filter((record): record is LeagueRecord => record != null)

    const totalWins = leagueRecords.reduce((sum, league) => sum + league.wins, 0)
    const totalLosses = leagueRecords.reduce((sum, league) => sum + league.losses, 0)
    const totalTies = leagueRecords.reduce((sum, league) => sum + (league.ties ?? 0), 0)
    const totalGames = totalWins + totalLosses + totalTies
    const seasonsPlayedLegacy = new Set(legacyLeagues.map((league) => league.season)).size
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

    const tier = `T${Math.min(6, Math.max(1, rankCache.careerTier))}` as 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6'
    const tierNames = ['Dynasty', 'Champion', 'Playoff Performer', 'All-Pro', 'Veteran', 'Starter'] as const
    const tierName =
      rankCache.careerTier >= 1 && rankCache.careerTier <= 6
        ? tierNames[rankCache.careerTier - 1]
        : rankCache.careerTierName

    const xpTotalNum = Number(rankCache.careerXp)

    const rank = {
      careerTier: rankCache.careerTier,
      careerTierName: rankCache.careerTierName,
      careerLevel: rankCache.careerLevel,
      careerXp: rankCache.careerXp.toString(),
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

    return NextResponse.json({
      imported: true,
      tier,
      tierName,
      xpTotal: xpTotalNum,
      xpLevel: rankCache.careerLevel,
      careerStats,
      rank,
      rankProcessing,
      rankCalculatedAt: rankCalculatedAtIso,
      legacyUsername: appUser.legacyUser?.sleeperUsername ?? appUser.displayName ?? appUser.username ?? null,
      overviewProfile: leagueRecords.length > 0 ? computeCompositeProfile(leagueRecords) : null,
    })
  } catch (error) {
    console.error('[api/user/rank] failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
