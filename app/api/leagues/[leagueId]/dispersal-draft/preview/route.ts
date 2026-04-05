/**
 * POST: commissioner — asset pool preview without creating a draft.
 */

import { NextRequest, NextResponse } from 'next/server'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import {
  buildAssetPoolFromRosters,
  computeSuggestedDraftShape,
} from '@/lib/dispersal-draft/assetPoolBuilder'
import { isOrphanPlatformUserId } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { prisma } from '@/lib/prisma'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const ent = await requireEntitlement('commissioner_dispersal_draft')
  if (ent instanceof NextResponse) return ent
  const userId = ent

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { sourceRosterIds?: string[]; participantCount?: number }
  const sourceRosterIds = Array.isArray(body.sourceRosterIds) ? body.sourceRosterIds.map(String) : []
  if (sourceRosterIds.length === 0) {
    return NextResponse.json({ error: 'sourceRosterIds required' }, { status: 400 })
  }

  const rosterCheck = await prisma.roster.findMany({
    where: { leagueId, id: { in: sourceRosterIds } },
    select: { id: true },
  })
  if (rosterCheck.length !== sourceRosterIds.length) {
    return NextResponse.json({ error: 'One or more rosters are not in this league.' }, { status: 400 })
  }

  const pool = await buildAssetPoolFromRosters(leagueId, sourceRosterIds)

  const allRosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { platformUserId: true },
  })
  const defaultParticipants = allRosters.filter((r) => !isOrphanPlatformUserId(r.platformUserId)).length
  const participantCount =
    typeof body.participantCount === 'number' && body.participantCount > 0
      ? Math.floor(body.participantCount)
      : Math.max(1, defaultParticipants)

  const { suggestedRounds, suggestedPicksPerRound } = computeSuggestedDraftShape(pool.assets, participantCount)

  return NextResponse.json({
    assets: pool.assets,
    playerCount: pool.playerCount,
    draftPickCount: pool.draftPickCount,
    totalFaab: pool.totalFaab,
    totalAssets: pool.totalCount,
    suggestedRounds,
    suggestedPicksPerRound,
  })
}
