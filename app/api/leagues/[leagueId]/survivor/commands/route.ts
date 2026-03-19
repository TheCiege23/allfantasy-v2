/**
 * POST: Process Survivor official commands via the shared command service.
 * Body: { command: string, councilId?: string, challengeId?: string, week?: number, source?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { processSurvivorOfficialCommand } from '@/lib/survivor/SurvivorOfficialCommandService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rawCommand = typeof body.command === 'string' ? body.command.trim() : ''
  if (!rawCommand) return NextResponse.json({ error: 'command is required' }, { status: 400 })

  const result = await processSurvivorOfficialCommand({
    leagueId,
    userId,
    command: rawCommand,
    councilId: typeof body.councilId === 'string' ? body.councilId : null,
    challengeId: typeof body.challengeId === 'string' ? body.challengeId : null,
    source: typeof body.source === 'string' ? body.source : null,
    week: typeof body.week === 'number' || typeof body.week === 'string' ? Number(body.week) : null,
  })

  if (!result.handled) {
    return NextResponse.json({ error: 'Unknown Survivor command' }, { status: 400 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'Command failed' }, { status: result.status ?? 400 })
  }

  return NextResponse.json({
    ok: true,
    intent: result.intent,
    message: result.message,
  })
}
