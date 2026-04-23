import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertCommissioner } from '@/lib/commissioner/permissions'

export const dynamic = 'force-dynamic'

/**
 * POST: Create AI rosters for all empty draft slots in a league.
 * Automatically fills any missing team slots with AI-managed rosters.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await params

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [league, existingTeams] = await Promise.all([
      prisma.league.findUnique({
        where: { id: leagueId },
        select: { leagueSize: true },
      }),
      prisma.leagueTeam.findMany({
        where: { leagueId },
        select: { id: true },
      }),
    ])

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const teamCount = league.leagueSize ?? 12
    const emptySlotCount = teamCount - existingTeams.length

    if (emptySlotCount <= 0) {
      return NextResponse.json({
        ok: true,
        message: 'All slots are already filled',
        teamsCreated: 0,
      })
    }

    // Create rosters and teams for empty slots
    const teamsCreated: string[] = []
    for (let i = 0; i < emptySlotCount; i++) {
      const slotNum = existingTeams.length + i + 1
      const aiName = `AI Team ${slotNum}`
      const orphanId = `orphan-ai-${randomUUID()}`

      // Create roster
      const roster = await prisma.roster.create({
        data: {
          leagueId,
          platformUserId: orphanId,
          playerData: { draftPicks: [] },
        },
      })

      // Create league team linked to roster
      await prisma.leagueTeam.create({
        data: {
          leagueId,
          externalId: roster.id,
          ownerName: aiName,
          teamName: aiName,
          platformUserId: orphanId,
          isCommissioner: false,
          role: 'member',
        },
      })

      teamsCreated.push(roster.id)
    }

    // Get all teams for randomization
    const allTeams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { externalId: true, teamName: true, ownerName: true, id: true, avatarUrl: true },
    })

    // Shuffle and create draft order slots
    const shuffled = [...allTeams].sort(() => Math.random() - 0.5)
    const draftOrderSlots = shuffled.map((team, index) => ({
      slot: index + 1,
      ownerId: team.id,
      ownerName: team.ownerName || team.teamName || `Team ${index + 1}`,
      avatarUrl: team.avatarUrl || null,
    }))

    // Create slotOrder for draft session
    const slotOrder = shuffled.map((team, index) => ({
      slot: index + 1,
      rosterId: team.externalId,
      displayName: team.ownerName || team.teamName || `Team ${index + 1}`,
    }))

    // Update draft session
    await prisma.draftSession.update({
      where: { leagueId },
      data: {
        slotOrder: slotOrder as unknown as Prisma.InputJsonValue,
        cpuAutoPick: true,
      },
    })

    // Update league settings with draft order AND enable CPU auto-pick
    await prisma.leagueSettings.upsert({
      where: { leagueId },
      create: {
        leagueId,
        cpuAutoPick: true,
        draftOrderSlots: draftOrderSlots as unknown as Prisma.InputJsonValue,
      },
      update: {
        cpuAutoPick: true,
        draftOrderSlots: draftOrderSlots as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      ok: true,
      teamsCreated: teamsCreated.length,
      totalTeams: allTeams.length + teamsCreated.length,
      message: `Created ${teamsCreated.length} AI teams and populated draft order`,
      draftOrderSlots,
    })
  } catch (e) {
    console.error('[fill-empty-slots]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'Failed to fill empty slots' },
      { status: 500 }
    )
  }
}
