import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { resolveWeeklyWinners } from '@/lib/bestball/contestEngine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const contestId = req.nextUrl.searchParams.get('contestId')?.trim()
  const week = Number(req.nextUrl.searchParams.get('week'))
  if (!contestId || !Number.isFinite(week)) {
    return NextResponse.json({
      ok: true,
      message: 'weekly-winners cron tick — pass contestId & week query params or wire multi-contest sweep.',
    })
  }
  const winners = await resolveWeeklyWinners(contestId, week)
  return NextResponse.json({ winners })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id

  let body: { contestId?: string; week?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.contestId || body.week == null) {
    return NextResponse.json({ error: 'contestId and week required' }, { status: 400 })
  }

  if (!userId && !requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const winners = await resolveWeeklyWinners(body.contestId, body.week)
  return NextResponse.json({ winners })
}
