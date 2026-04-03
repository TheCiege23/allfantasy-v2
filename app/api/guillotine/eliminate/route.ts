import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runEliminationCheck } from '@/lib/guillotine/eliminationEngine'
import { requireCommissionerRole } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const seasonId = req.nextUrl.searchParams.get('seasonId')?.trim()
  const sp = Number(req.nextUrl.searchParams.get('scoringPeriod'))
  if (!seasonId || !Number.isFinite(sp)) {
    return NextResponse.json({
      ok: true,
      message: 'Guillotine eliminate cron — pass seasonId & scoringPeriod as query params per league.',
    })
  }
  const out = await runEliminationCheck(seasonId, sp)
  return NextResponse.json(out)
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

  const out = await runEliminationCheck(body.seasonId, body.scoringPeriod)
  return NextResponse.json(out)
}
