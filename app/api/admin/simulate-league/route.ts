import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveAdminEmail } from '@/lib/auth/admin'
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
  const commissionerMode = typeof body.commissionerMode === 'string'
    ? (body.commissionerMode as 'spectator' | 'participating')
    : 'spectator'

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 })
  }

  try {
    const report = await simulateLeague(leagueId, userId, commissionerMode)
    return NextResponse.json({ ok: true, report })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Simulation failed' },
      { status: 500 },
    )
  }
}
