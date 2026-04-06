/**
 * POST: commissioner / co-commissioner — asset pool preview without creating a draft.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getLeagueRole } from '@/lib/league/permissions'
import {
  buildAssetPoolFromRosters,
  computeSuggestedDraftShape,
} from '@/lib/dispersal-draft/assetPoolBuilder'
import { isOrphanPlatformUserId } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { prisma } from '@/lib/prisma'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  try {
    const ent = await requireEntitlement('commissioner_dispersal_draft')
    if (ent instanceof NextResponse) return ent
    const userId = ent

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const role = await getLeagueRole(leagueId, userId)
    if (role !== 'commissioner' && role !== 'co_commissioner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      sourceRosterIds?: string[]
      participantRosterIds?: string[]
      participantCount?: number
      pickTimeSeconds?: number
      orderMode?: string
    }
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

    let n: number
    if (Array.isArray(body.participantRosterIds) && body.participantRosterIds.length > 0) {
      n = Math.max(1, [...new Set(body.participantRosterIds.map(String))].length)
    } else if (typeof body.participantCount === 'number' && body.participantCount > 0) {
      n = Math.floor(body.participantCount)
    } else {
      n = Math.max(1, defaultParticipants)
    }

    const pickTimeSeconds =
      typeof body.pickTimeSeconds === 'number' && Number.isFinite(body.pickTimeSeconds)
        ? Math.max(0, Math.min(600, Math.floor(body.pickTimeSeconds)))
        : 120

    const { suggestedRounds, suggestedPicksPerRound } = computeSuggestedDraftShape(pool.assets, n)
    const assetCount = pool.assets.length
    const totalRounds = suggestedRounds
    const totalPicks = totalRounds * n
    const estimatedDurationMinutes = Math.ceil((totalPicks * pickTimeSeconds) / 60)

    return NextResponse.json({
      assets: pool.assets,
      playerCount: pool.playerCount,
      draftPickCount: pool.draftPickCount,
      totalFaab: pool.totalFaab,
      totalAssets: pool.totalCount,
      suggestedRounds,
      suggestedPicksPerRound,
      assetCount,
      participantCount: n,
      totalRounds,
      totalPicks,
      estimatedDurationMinutes,
      assetsPreview: pool.assets.slice(0, 10),
      orderMode: body.orderMode ?? 'randomized',
    })
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err))
    console.error('[dispersal-draft/preview POST]', e.message, e.stack)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
