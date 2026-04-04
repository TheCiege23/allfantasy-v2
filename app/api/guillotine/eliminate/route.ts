import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runEliminationCheck } from '@/lib/guillotine/eliminationEngine'
import { requireCommissionerRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Vercel cron calls GET with no query string — sweep active guillotine seasons using each linked RedraftSeason.currentWeek.
 */
async function sweepActiveGuillotineSeasons() {
  const seasons = await prisma.guillotineSeason.findMany({
    where: {
      status: { notIn: ['setup', 'complete'] },
      redraftSeasonId: { not: null },
    },
    include: { redraftSeason: true },
  })

  const results: {
    seasonId: string
    scoringPeriod: number
    skipped?: boolean
    eliminated?: number
    error?: string
  }[] = []

  for (const g of seasons) {
    const rs = g.redraftSeason
    if (!rs) continue
    const scoringPeriod = Math.max(1, rs.currentWeek || g.currentScoringPeriod || 1)
    try {
      const out = await runEliminationCheck(g.id, scoringPeriod, { skipIfAlreadyProcessed: true })
      results.push({
        seasonId: g.id,
        scoringPeriod,
        skipped: out.skipped,
        eliminated: out.eliminated.length,
      })
    } catch (e) {
      results.push({
        seasonId: g.id,
        scoringPeriod,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { ok: true as const, swept: seasons.length, results }
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const sp = Number(req.nextUrl.searchParams.get('scoringPeriod'))
  if (seasonId && Number.isFinite(sp)) {
    const out = await runEliminationCheck(seasonId, sp, { skipIfAlreadyProcessed: true })
    return NextResponse.json({ ok: true, seasonId, scoringPeriod: sp, ...out })
  }
  return NextResponse.json(await sweepActiveGuillotineSeasons())
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { seasonId?: string; scoringPeriod?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.seasonId || body.scoringPeriod == null) {
    return NextResponse.json({ error: 'seasonId and scoringPeriod required' }, { status: 400 })
  }

  const g = await prisma.guillotineSeason.findFirst({ where: { id: body.seasonId } })
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireCommissionerRole(g.leagueId, userId)
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const out = await runEliminationCheck(body.seasonId, body.scoringPeriod, {
    skipIfAlreadyProcessed: false,
  })
  return NextResponse.json(out)
}
