/**
 * POST /api/leagues/join — Join a league by invite code (and optional password).
 * Body: { code: string, password?: string }
 * Creates a Roster for the user if not already a member.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { validateFantasyInviteCode } from '@/lib/league-invite'
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

  const validation = await validateFantasyInviteCode(code, { password, userId })
  if (!validation.valid) {
    if (validation.error === 'ALREADY_MEMBER' && validation.preview?.leagueId) {
      return NextResponse.json({
        success: true,
        leagueId: validation.preview.leagueId,
        alreadyMember: true,
      })
    }
    const statusByError: Record<string, number> = {
      INVALID_CODE: 404,
      EXPIRED: 410,
      LEAGUE_FULL: 409,
      PASSWORD_REQUIRED: 400,
      INCORRECT_PASSWORD: 400,
      INVITE_DISABLED: 403,
      ALREADY_MEMBER: 409,
    }
    const messageByError: Record<string, string> = {
      INVALID_CODE: 'Invalid invite code',
      EXPIRED: 'Invite expired',
      LEAGUE_FULL: 'League is full',
      PASSWORD_REQUIRED: 'League password is required',
      INCORRECT_PASSWORD: 'Incorrect password',
      INVITE_DISABLED: 'Invite link is disabled',
      ALREADY_MEMBER: 'You are already in this league',
    }
    return NextResponse.json(
      { error: messageByError[validation.error] ?? 'Failed to validate invite' },
      { status: statusByError[validation.error] ?? 400 }
    )
  }
  const result = validation.preview

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
