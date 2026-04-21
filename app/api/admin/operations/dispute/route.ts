import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getAdminActorId } from '@/lib/admin/adminActor'
import { recordDisputeRecord } from '@/lib/admin/supportAndRisk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const adminUserId = getAdminActorId(gate.user)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const disputeKey = typeof body.disputeKey === 'string' ? body.disputeKey.trim() : ''
  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!disputeKey || !status) {
    return NextResponse.json({ error: 'disputeKey and status required' }, { status: 400 })
  }

  await recordDisputeRecord({
    adminUserId,
    disputeKey,
    status,
    leagueId: typeof body.leagueId === 'string' ? body.leagueId : null,
    userId: typeof body.userId === 'string' ? body.userId : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
  })

  return NextResponse.json({ ok: true })
}
