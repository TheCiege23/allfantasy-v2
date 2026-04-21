import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getAdminActorId } from '@/lib/admin/adminActor'
import { recordRiskReview } from '@/lib/admin/supportAndRisk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const adminUserId = getAdminActorId(gate.user)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  const signal = typeof body.signal === 'string' ? body.signal.trim() : ''
  const sev = body.severity
  const severity =
    sev === 'low' || sev === 'medium' || sev === 'high' ? sev : ('medium' as const)

  if (!userId || !signal) {
    return NextResponse.json({ error: 'userId and signal required' }, { status: 400 })
  }

  const context =
    body.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? (body.context as Record<string, unknown>)
      : undefined

  await recordRiskReview({
    adminUserId,
    userId,
    signal,
    severity,
    context,
  })

  return NextResponse.json({ ok: true })
}
