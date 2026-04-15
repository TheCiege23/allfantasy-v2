import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveAdminEmail } from '@/lib/auth/admin'
import { assertLeagueCommissioner } from '@/lib/league/league-access'
import { simulateLeague } from '@/lib/simulation/leagueSimulator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string }
  } | null
  const userId = session?.user?.id
  const email = session?.user?.email

  if (!userId || !resolveAdminEmail(email ?? null)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : ''
  const commissionerModeInput = body.commissionerMode

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  const leagueAccess = await assertLeagueCommissioner(leagueId, userId)
  if (!leagueAccess.ok) {
    const status = leagueAccess.status === 404 ? 404 : 403
    const error =
      leagueAccess.status === 404 ? 'League not found' : 'Commissioner access required'
    return NextResponse.json({ error }, { status })
  }

  if (
    commissionerModeInput != null &&
    commissionerModeInput !== 'spectator' &&
    commissionerModeInput !== 'participating'
  ) {
    return NextResponse.json({ error: 'Invalid commissionerMode' }, { status: 400 })
  }

  const commissionerMode: 'spectator' | 'participating' =
    commissionerModeInput === 'participating' ? 'participating' : 'spectator'

  try {
    const report = await simulateLeague(leagueId, userId, commissionerMode)
    return NextResponse.json({ ok: true, report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Simulation failed'
    const status = message === 'League not found' ? 404 : 500
    return NextResponse.json(
      { error: message },
      { status },
    )
  }
}
