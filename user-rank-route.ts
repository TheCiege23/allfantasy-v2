// app/api/user/rank/route.ts
// Returns the current user's AllFantasy rank from LegacyUserRankCache.
// If no rank data exists yet, returns null so the UI shows the import flow.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession }          from 'next-auth'
import { authOptions }               from '@/lib/auth'
import { prisma }                    from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the user's legacy ID via AppUser → LegacyUser relation
    const appUser = await prisma.appUser.findUnique({
      where:   { id: session.user.id },
      select:  { legacyUserId: true, username: true },
    })

    if (!appUser?.legacyUserId) {
      // No legacy import yet
      return NextResponse.json({ rank: null, imported: false })
    }

    // Pull rank cache
    const rankCache = await prisma.legacyUserRankCache.findUnique({
      where: { legacyUserId: appUser.legacyUserId },
    })

    if (!rankCache) {
      return NextResponse.json({ rank: null, imported: false })
    }

    // Pull AI report if it exists
    const aiReport = await prisma.legacyAIReport.findFirst({
      where:   { legacyUserId: appUser.legacyUserId },
      orderBy: { createdAt: 'desc' },
    })

    // Compute career stats from import jobs
    const importJobs = await prisma.legacyImportJob.findMany({
      where:   { legacyUserId: appUser.legacyUserId, status: 'completed' },
      select:  { meta: true },
    })

    // Aggregate stats from import meta — adjust field names to match your schema
    let totalWins     = 0
    let totalGames    = 0
    let playoffCount  = 0
    let champCount    = 0
    let seasonCount   = 0

    for (const job of importJobs) {
      const meta = job.meta as Record<string, number> | null
      if (!meta) continue
      totalWins    += meta.wins    ?? 0
      totalGames   += meta.games   ?? 0
      playoffCount += meta.playoffs ?? 0
      champCount   += meta.championships ?? 0
      seasonCount  += meta.seasons ?? 1
    }

    const winRate     = totalGames > 0 ? totalWins / totalGames : 0
    const playoffRate = seasonCount > 0 ? playoffCount / seasonCount : 0

    // Parse AI report fields
    const reportData = aiReport?.reportData as Record<string, unknown> | null
    const aiGrade    = String(reportData?.grade    ?? 'B')
    const aiScore    = Number(reportData?.score    ?? 70)
    const aiInsight  = String(reportData?.insight  ?? 'Import your leagues to generate your AI insight.')

    const rank = {
      careerTier:        rankCache.careerTier,
      careerTierName:    rankCache.careerTierName,
      careerLevel:       rankCache.careerLevel,
      careerXp:          rankCache.careerXp.toString(), // BigInt → string for JSON
      aiReportGrade:     aiGrade,
      aiScore,
      aiInsight,
      winRate,
      playoffRate,
      championshipCount: champCount,
      seasonsPlayed:     seasonCount,
      importedAt:        rankCache.lastCalculatedAt?.toISOString() ?? null,
    }

    return NextResponse.json({ rank, imported: true })
  } catch (err) {
    console.error('[user/rank] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
