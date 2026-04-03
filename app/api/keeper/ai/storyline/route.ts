import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  generateKeeperOffseasonRecap,
  generateKeeperPlayerStoryline,
  generateKeeperTeamArc,
} from '@/lib/keeper/ai/storylineGenerator'
import { requireAfSub } from '@/lib/redraft/ai/requireAfSub'
import { requireCronAuth } from '@/app/api/cron/_auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  void req
  return NextResponse.json({ ok: true, message: 'Keeper storyline cron tick (wire league queue).' })
}

export async function POST(req: NextRequest) {
  const gate = await requireAfSub()
  if (gate instanceof Response) return gate

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    leagueId?: string
    type?: 'recap' | 'player' | 'team'
    year?: number
    rosterId?: string
    playerId?: string
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  const year = body.year ?? new Date().getFullYear()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  if (body.type === 'player' && body.playerId) {
    const s = await generateKeeperPlayerStoryline(body.playerId, leagueId, year)
    return NextResponse.json({ storyline: s })
  }
  if (body.type === 'team' && body.rosterId) {
    const s = await generateKeeperTeamArc(body.rosterId, leagueId, year)
    return NextResponse.json({ storyline: s })
  }

  const s = await generateKeeperOffseasonRecap(leagueId, year)
  return NextResponse.json({ storyline: s })
}
