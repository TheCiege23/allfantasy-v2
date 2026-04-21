import { NextRequest, NextResponse } from 'next/server'
import type { LeagueLifecycleState } from '@prisma/client'
import { requireAdmin } from '@/lib/adminAuth'
import { getAdminActorId } from '@/lib/admin/adminActor'
import { runAdminLeagueRecovery, type AdminRecoveryAction } from '@/lib/admin/recovery/adminRecoveryService'

export const dynamic = 'force-dynamic'

function parseAction(body: Record<string, unknown>): AdminRecoveryAction | null {
  const type = typeof body.type === 'string' ? body.type : null
  if (!type) return null

  switch (type) {
    case 'lifecycle_transition': {
      const nextState = body.nextState as LeagueLifecycleState
      if (!nextState) return null
      return {
        type: 'lifecycle_transition',
        nextState,
        force: body.force === true,
      }
    }
    case 'enqueue_waiver_process':
      return { type: 'enqueue_waiver_process' }
    case 'enqueue_scoring_week': {
      const season = Number(body.season)
      const weekOrRound = Number(body.weekOrRound)
      if (!Number.isFinite(season) || !Number.isFinite(weekOrRound)) return null
      return {
        type: 'enqueue_scoring_week',
        season,
        weekOrRound,
        lockScores: body.lockScores === true,
      }
    }
    case 'enqueue_specialty_automation': {
      const season = Number(body.season)
      if (!Number.isFinite(season)) return null
      const weekRaw = body.week
      const week = weekRaw == null || weekRaw === '' ? null : Number(weekRaw)
      return {
        type: 'enqueue_specialty_automation',
        season,
        week: week != null && Number.isFinite(week) ? week : null,
        trigger: typeof body.trigger === 'string' ? body.trigger : undefined,
      }
    }
    case 'stat_correction_sync': {
      const season = Number(body.season)
      const week = Number(body.week)
      if (!Number.isFinite(season) || !Number.isFinite(week)) return null
      return { type: 'stat_correction_sync', season, week }
    }
    case 'draft_pause':
      return body.confirm === true ? { type: 'draft_pause', confirm: true } : null
    default:
      return null
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const adminUserId = getAdminActorId(gate.user)
  const { leagueId } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const action = parseAction(body)
  if (!action) {
    return NextResponse.json({ error: 'Invalid or unsupported action payload' }, { status: 400 })
  }

  const result = await runAdminLeagueRecovery({ leagueId, adminUserId, action })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, detail: result.detail })
}
