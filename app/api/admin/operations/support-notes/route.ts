import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getAdminActorId } from '@/lib/admin/adminActor'
import { getAdminAuditLogs } from '@/lib/admin-audit'
import { recordSupportNote } from '@/lib/admin/supportAndRisk'

export const dynamic = 'force-dynamic'

/** GET: support + risk + dispute admin rows */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const limit = Math.min(
    Math.max(parseInt(new URL(req.url).searchParams.get('limit') ?? '80', 10) || 80, 1),
    200,
  )

  try {
    const entries = await getAdminAuditLogs({
      limit,
      actions: ['support_note', 'risk_review', 'dispute_record'],
    })
    return NextResponse.json({ data: entries })
  } catch (e) {
    console.error('[admin/operations/support-notes GET]', e)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const adminUserId = getAdminActorId(gate.user)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const note = typeof body.body === 'string' ? body.body.trim() : ''
  if (!note) {
    return NextResponse.json({ error: 'body required' }, { status: 400 })
  }

  await recordSupportNote({
    adminUserId,
    body: note,
    caseRef: typeof body.caseRef === 'string' ? body.caseRef : null,
    leagueId: typeof body.leagueId === 'string' ? body.leagueId : null,
    userId: typeof body.userId === 'string' ? body.userId : null,
  })

  return NextResponse.json({ ok: true })
}
