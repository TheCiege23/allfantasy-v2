import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { getLatestNews } from '@/lib/data/news'
import { getInjuryReport } from '@/lib/data/players'
import { buildChimmySportDataDigest } from '@/lib/chimmy/chimmy-sport-data-digest'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function maxIsoDate(values: Array<string | null | undefined>): string | null {
  let max = 0
  for (const value of values) {
    if (!value) continue
    const stamp = new Date(value).getTime()
    if (Number.isFinite(stamp) && stamp > max) max = stamp
  }
  return max > 0 ? new Date(max).toISOString() : null
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, name: true },
  })

  const sport = normalizeToSupportedSport(league?.sport ?? 'NFL')

  try {
    const [newsRows, injuryRows, chimmyDigest] = await Promise.all([
      getLatestNews(sport, 4),
      getInjuryReport(sport),
      buildChimmySportDataDigest({ sport, includeNewsApi: false }),
    ])

    const headlines = newsRows.slice(0, 4).map((row) => ({
      id: row.id,
      title: row.headline,
      playerName: row.playerName ?? null,
      team: row.team ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      source: row.source,
    }))

    const injuries = injuryRows.slice(0, 6).map((row) => ({
      playerName: row.playerName,
      team: row.team ?? null,
      status: row.status ?? null,
      note: row.notes ?? null,
      reportedAt: row.reportDate?.toISOString() ?? null,
      source: null,
    }))

    const updatedAt = maxIsoDate([
      ...headlines.map((item) => item.publishedAt),
      ...injuries.map((item) => item.reportedAt),
    ])

    return NextResponse.json({
      ok: true,
      leagueName: league?.name ?? null,
      sport,
      headlines,
      injuries,
      sportsFeed: {
        available: headlines.length > 0 || injuries.length > 0,
        updatedAt,
        sourceKeys: chimmyDigest.sources,
        digest: chimmyDigest.text || null,
      },
    })
  } catch (error) {
    console.error('[draft/assistant-context GET]', error)
    return NextResponse.json({
      ok: true,
      leagueName: league?.name ?? null,
      sport,
      headlines: [],
      injuries: [],
      sportsFeed: {
        available: false,
        updatedAt: null,
        sourceKeys: [],
        digest: null,
      },
    })
  }
}
