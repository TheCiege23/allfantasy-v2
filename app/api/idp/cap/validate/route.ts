import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { validateCapCompliance } from '@/lib/idp/capEngine'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { leagueId?: string; rosterId?: string; proposedSalary?: number; season?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const leagueId = body.leagueId?.trim()
  const rosterId = body.rosterId?.trim()
  const proposedSalary = body.proposedSalary
  if (!leagueId || !rosterId || proposedSalary == null || !Number.isFinite(proposedSalary)) {
    return NextResponse.json({ error: 'leagueId, rosterId, proposedSalary required' }, { status: 400 })
  }

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) return NextResponse.json({ error: 'Forbidden' }, { status: gate.status })

  const cfg = await prisma.iDPCapConfig.findUnique({ where: { leagueId } })
  const season = body.season ?? cfg?.season ?? new Date().getFullYear()

  try {
    const result = await validateCapCompliance(leagueId, rosterId, proposedSalary, season)
    return NextResponse.json({ season, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed'
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
