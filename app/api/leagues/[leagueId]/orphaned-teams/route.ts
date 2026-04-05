/**
 * GET: commissioner-only — orphan team summary + supplemental draft eligibility.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { buildAssetPoolFromRosters } from '@/lib/supplemental-draft/assetPoolBuilder'
import { SupplementalDraftEngine } from '@/lib/supplemental-draft/SupplementalDraftEngine'
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

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orphanIds = await getOrphanRosterIdsForLeague(leagueId)

  const resolver = new EntitlementResolver()
  const suppAccess = await resolver.resolveForUser(userId, 'commissioner_supplemental_draft')
  const suppDraftGated = !suppAccess.hasAccess

  const active = await SupplementalDraftEngine.getActiveDraftForLeague(leagueId)

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
    hasActiveSuppDraft: active != null,
    activeSuppDraftId: active?.id ?? null,
    canAdvertise: orphanCount >= 1,
    canAssignAI: orphanCount >= 1,
    canRunSuppDraft: orphanCount >= 2 && suppAccess.hasAccess,
    suppDraftGated,
  })
}
