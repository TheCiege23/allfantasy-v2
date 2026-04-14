import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSupportedSport, SUPPORTED_SPORTS } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = req.nextUrl.searchParams.get('sport') ?? 'ALL'
  const sportParam = raw === 'ALL' || raw === '' ? null : raw.toUpperCase()

  if (sportParam && !isSupportedSport(sportParam)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }

  try {
    const sportWhereNews =
      sportParam != null
        ? { sport: sportParam }
        : { sport: { in: [...SUPPORTED_SPORTS] as unknown as string[] } }

    const sportWherePlayers =
      sportParam != null
        ? { sport: sportParam as (typeof SUPPORTED_SPORTS)[number] }
        : { sport: { in: [...SUPPORTED_SPORTS] } }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const injuryReportWhere =
      sportParam != null
        ? { sport: sportParam }
        : { sport: { in: [...SUPPORTED_SPORTS] as unknown as string[] } }

    const digestCacheKeys =
      sportParam != null
        ? [`grok_injury_digest:${sportParam}`]
        : SUPPORTED_SPORTS.map((s) => `grok_injury_digest:${s}`)

    const [newsRows, playerRows, injuryReportRows, digestRows] = await Promise.all([
      prisma.sportsNews.findMany({
        where: {
          ...sportWhereNews,
          OR: [
            { category: { contains: 'injury', mode: 'insensitive' } },
            { title: { contains: 'injury', mode: 'insensitive' } },
            { title: { contains: 'questionable', mode: 'insensitive' } },
            { title: { contains: 'doubtful', mode: 'insensitive' } },
          ],
          publishedAt: { gte: since },
        },
        orderBy: { publishedAt: 'desc' },
        take: 15,
      }),
      prisma.sportsPlayerRecord.findMany({
        where: {
          ...sportWherePlayers,
          injuryStatus: { not: null },
        },
        orderBy: { lastUpdated: 'desc' },
        take: 25,
      }),
      prisma.injuryReportRecord.findMany({
        where: {
          ...injuryReportWhere,
          reportDate: { gte: since },
        },
        orderBy: { reportDate: 'desc' },
        take: 40,
      }),
      prisma.sportsDataCache.findMany({
        where: {
          cacheKey: { in: digestCacheKeys },
          expiresAt: { gt: new Date() },
        },
      }),
    ])

    const articles = newsRows.map((a) => ({
      id: a.id,
      sport: a.sport,
      title: a.title,
      source: a.source,
      sourceUrl: a.sourceUrl,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      playerName: a.playerName,
    }))

    const playerInjuries = playerRows
      .filter((p) => p.injuryStatus && p.injuryStatus.length > 0)
      .slice(0, 20)
      .map((p) => ({
        id: p.id,
        source: 'sports_player_record' as const,
        sport: p.sport,
        name: p.name,
        team: p.team,
        position: p.position,
        injuryStatus: p.injuryStatus,
        injuryNotes: p.injuryNotes,
        lastUpdated: p.lastUpdated.toISOString(),
      }))

    const grokInjuryDigests = digestRows
      .map((row) => {
        const d = row.data as {
          summary?: string
          bullets?: string[]
          sport?: string
          generatedAt?: string
        }
        const keySport = row.cacheKey.replace(/^grok_injury_digest:/, '')
        return {
          sport: (d.sport ?? keySport) as string,
          summary: d.summary ?? '',
          bullets: Array.isArray(d.bullets) ? d.bullets : [],
          generatedAt: d.generatedAt ?? row.createdAt.toISOString(),
        }
      })
      .filter((x) => x.summary.length > 0 || x.bullets.length > 0)

    const injuryReports = injuryReportRows.map((r) => ({
      id: r.id,
      source: 'injury_report' as const,
      sport: r.sport,
      playerId: r.playerId,
      name: r.playerName,
      team: r.team,
      status: r.status,
      bodyPart: r.bodyPart,
      notes: r.notes,
      practice: r.practice,
      gameStatus: r.gameStatus,
      reportDate: r.reportDate.toISOString(),
    }))

    return NextResponse.json({
      articles,
      playerInjuries,
      injuryReports,
      grokInjuryDigests,
      fetchedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[dashboard/ai-tools/injury-brief]', e)
    return NextResponse.json({ error: 'Failed to load injury brief' }, { status: 500 })
  }
}
