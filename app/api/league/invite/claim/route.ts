import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const claimSchema = z.object({
  token: z.string().min(1),
  teamExternalId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = claimSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'token and teamExternalId are required' }, { status: 400 })
  }

  const { token, teamExternalId } = parsed.data

  const invite = await prisma.leagueInvite.findFirst({
    where: { token, isActive: true },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  if (invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  const team = await prisma.leagueTeam.findFirst({
    where: {
      leagueId: invite.leagueId,
      externalId: teamExternalId,
    },
  })

  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }

  if (team.claimedByUserId) {
    return NextResponse.json({ error: 'Team already claimed' }, { status: 409 })
  }

  const existingClaim = await prisma.leagueManagerClaim.findFirst({
    where: {
      leagueId: invite.leagueId,
      afUserId: userId,
    },
  })

  if (existingClaim) {
    return NextResponse.json({ error: 'You already have a team in this league' }, { status: 409 })
  }

  const nextUseCount = invite.useCount + 1

  await prisma.$transaction([
    prisma.leagueTeam.update({
      where: { id: team.id },
      data: {
        claimedByUserId: userId,
        isOrphan: false,
      },
    }),
    prisma.leagueManagerClaim.create({
      data: {
        leagueId: invite.leagueId,
        afUserId: userId,
        teamExternalId,
        isConfirmed: true,
      },
    }),
    prisma.leagueInvite.update({
      where: { id: invite.id },
      data: {
        useCount: { increment: 1 },
        isActive: nextUseCount < invite.maxUses,
      },
    }),
  ])

  return NextResponse.json({ ok: true, leagueId: invite.leagueId })
}
