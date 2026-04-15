import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import {
  AutoSubLineupEngineResultSchema,
  runAutoSubLineupEngine,
  type AutoSubLineupEngineInput,
} from '@/lib/auto-sub-lineup-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as
    | { user?: { id?: string } }
    | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AutoSubLineupEngineInput & { leagueId?: string }
  try {
    body = (await req.json()) as AutoSubLineupEngineInput & { leagueId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.leagueId) {
    try {
      await assertLeagueMember(body.leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!Array.isArray(body.starters) || body.starters.length === 0) {
    return NextResponse.json({ error: 'starters must be a non-empty array' }, { status: 400 })
  }
  if (!Array.isArray(body.bench)) {
    return NextResponse.json({ error: 'bench must be an array' }, { status: 400 })
  }

  try {
    const { leagueId: _leagueId, ...engineInput } = body
    const raw = runAutoSubLineupEngine(engineInput)
    const result = AutoSubLineupEngineResultSchema.parse(raw)
    return NextResponse.json({
      ok: true,
      injuryInactiveOnly: true,
      autoSubsExecuted: result.autoSubsExecuted,
      blockedAutoSubs: result.blockedAutoSubs,
      notifications: result.notifications,
    })
  } catch (error) {
    console.error('[lineup/auto-sub]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run auto-sub lineup engine' },
      { status: 500 }
    )
  }
}
