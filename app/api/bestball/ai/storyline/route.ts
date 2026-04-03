import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireCronAuth } from '@/app/api/cron/_auth'
import {
  generateBestBallWeeklyRecap,
  generateDraftStorylines,
} from '@/lib/bestball/ai/storylineGenerator'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  void req
  return NextResponse.json({ ok: true, message: 'Best ball storyline cron tick (wire league queue).' })
}

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    leagueId?: string
    contestId?: string | null
    week?: number
    sport?: string
    type?: 'weekly_recap' | 'draft'
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  if (body.type === 'draft') {
    const lines = await generateDraftStorylines(leagueId, body.contestId ?? null, body.sport ?? 'NFL')
    return NextResponse.json({ storylines: lines })
  }

  const week = body.week ?? 1
  const recap = await generateBestBallWeeklyRecap(leagueId, body.contestId ?? null, week)
  return NextResponse.json({ recap })
}
