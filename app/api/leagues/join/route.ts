/**
 * POST /api/leagues/join — Join a league by invite code (and optional password).
 * Body: { code: string, password?: string }
 * Creates a Roster for the user if not already a member.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateLeagueJoin } from '@/lib/league-privacy'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Sign in to join a league' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code.trim() : null
  const password = typeof body.password === 'string' ? body.password : undefined

  if (!code) return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })

  const result = await validateLeagueJoin(code, password)
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const existing = await prisma.roster.findUnique({
    where: { leagueId_platformUserId: { leagueId: result.leagueId, platformUserId: userId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ success: true, leagueId: result.leagueId, alreadyMember: true })
  }

  await prisma.roster.create({
    data: {
      leagueId: result.leagueId,
      platformUserId: userId,
      playerData: { draftPicks: [] },
    },
  })

  return NextResponse.json({ success: true, leagueId: result.leagueId })
}
