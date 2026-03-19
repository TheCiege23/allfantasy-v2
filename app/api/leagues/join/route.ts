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

  const joinResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.roster.findUnique({
      where: { leagueId_platformUserId: { leagueId: result.leagueId, platformUserId: userId } },
      select: { id: true },
    })
    if (existing) {
      return { success: true as const, leagueId: result.leagueId, alreadyMember: true as const }
    }

    const [league, rosterCount, draftSession, profile] = await Promise.all([
      tx.league.findUnique({
        where: { id: result.leagueId },
        select: {
          id: true,
          name: true,
          platform: true,
          leagueSize: true,
          leagueVariant: true,
        },
      }),
      tx.roster.count({
        where: { leagueId: result.leagueId },
      }),
      tx.draftSession.findUnique({
        where: { leagueId: result.leagueId },
        select: { status: true },
      }),
      tx.userProfile.findFirst({
        where: { userId },
        select: { displayName: true, sleeperUsername: true },
      }),
    ])

    if (!league) {
      return { success: false as const, status: 404, error: 'League not found' }
    }

    if (league.leagueSize != null && rosterCount >= league.leagueSize) {
      return { success: false as const, status: 409, error: 'League is full' }
    }

    if (league.leagueVariant === 'survivor' && draftSession?.status && draftSession.status !== 'pre_draft') {
      return {
        success: false as const,
        status: 409,
        error: 'Survivor leagues lock new joins after the draft starts.',
      }
    }

    const roster = await tx.roster.create({
      data: {
        leagueId: result.leagueId,
        platformUserId: userId,
        playerData: { draftPicks: [] },
      },
      select: { id: true },
    })

    if (league.platform === 'manual') {
      const manualTeamCount = await tx.leagueTeam.count({
        where: { leagueId: result.leagueId },
      })
      if (league.leagueSize == null || manualTeamCount < league.leagueSize) {
        const displayName = profile?.displayName?.trim() || profile?.sleeperUsername?.trim() || 'Manager'
        const teamBaseName = league.name?.trim() || 'League'
        await tx.leagueTeam.create({
          data: {
            leagueId: result.leagueId,
            externalId: roster.id,
            ownerName: displayName,
            teamName: `${displayName}'s ${teamBaseName} Team`,
          },
        }).catch(() => null)
      }
    }

    return { success: true as const, leagueId: result.leagueId, alreadyMember: false as const }
  })

  if (!joinResult.success) {
    return NextResponse.json({ error: joinResult.error }, { status: joinResult.status })
  }

  return NextResponse.json(joinResult)
}
