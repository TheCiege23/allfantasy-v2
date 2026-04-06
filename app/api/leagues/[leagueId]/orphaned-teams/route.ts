/**
 * GET: head commissioner or co-commissioner — orphan team summary + dispersal draft eligibility.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLeagueRole } from '@/lib/league/permissions'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { buildAssetPoolFromRosters } from '@/lib/dispersal-draft/assetPoolBuilder'
import { DispersalDraftEngine } from '@/lib/dispersal-draft/DispersalDraftEngine'
import { EntitlementResolver } from '@/lib/subscription/EntitlementResolver'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function labelForOrphanRoster(leagueId: string, rosterId: string, platformUserId: string) {
  const team = await prisma.leagueTeam.findFirst({
    where: { leagueId, OR: [{ externalId: rosterId }, { externalId: platformUserId }] },
    select: { teamName: true, ownerName: true },
  })
  return {
    teamName: team?.teamName?.trim() || 'Open team',
    ownerName: team?.ownerName?.trim() || 'Vacant',
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const role = await getLeagueRole(leagueId, userId)
  if (role !== 'commissioner' && role !== 'co_commissioner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orphanIds = await getOrphanRosterIdsForLeague(leagueId)

  const resolver = new EntitlementResolver()
  const dispersalAccess = await resolver.resolveForUser(userId, 'commissioner_dispersal_draft')
  const dispersalDraftGated = !dispersalAccess.hasAccess

  const active = await DispersalDraftEngine.getActiveDraftForLeague(leagueId)

  const orphanedTeams = await Promise.all(
    orphanIds.map(async (rosterId) => {
      const roster = await prisma.roster.findFirst({
        where: { id: rosterId, leagueId },
        select: { platformUserId: true },
      })
      const { assets, playerCount, draftPickCount, totalFaab } = await buildAssetPoolFromRosters(leagueId, [rosterId])
      const labels = roster
        ? await labelForOrphanRoster(leagueId, rosterId, roster.platformUserId)
        : { teamName: 'Open team', ownerName: 'Vacant' }
      return {
        rosterId,
        teamName: labels.teamName,
        ownerName: labels.ownerName,
        playerCount,
        draftPickCount,
        faabRemaining: totalFaab,
        assets,
      }
    })
  )

  const orphanCount = orphanIds.length

  return NextResponse.json({
    orphanedTeams,
    orphanCount,
    hasActiveDispersalDraft: active != null,
    activeDispersalDraftId: active?.id ?? null,
    canAdvertise: orphanCount >= 1,
    canAssignAI: orphanCount >= 1,
    canRunDispersalDraft: orphanCount >= 2 && dispersalAccess.hasAccess,
    dispersalDraftGated,
  })
}
