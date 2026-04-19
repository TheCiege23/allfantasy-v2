import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { resolvePlayerInjuryNewsBatch } from '@/lib/news-injury-aggregation/resolveBatch'

/**
 * GET /api/injury-news/context?sport=NFL&players=Name1,Name2
 * Shared injury + news aggregation for debugging and lightweight clients.
 */
export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sport = normalizeToSupportedSport(searchParams.get('sport') ?? 'NFL')
  const raw = searchParams.get('players') ?? ''
  const names = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24)

  if (names.length === 0) {
    return NextResponse.json({ ok: false, error: 'Missing players query (comma-separated names)' }, { status: 400 })
  }

  const skipNews = searchParams.get('skipNewsContext') === '1'
  const map = await resolvePlayerInjuryNewsBatch({
    prisma,
    sport,
    players: names.map((playerName) => ({ playerName })),
    skipNewsContext: skipNews,
  })

  const players = names.map((n) => {
    const layer = map.get(n.toLowerCase()) ?? null
    return { playerName: n, layer }
  })

  return NextResponse.json({
    ok: true,
    sport,
    fetchedAt: new Date().toISOString(),
    players,
  })
}
