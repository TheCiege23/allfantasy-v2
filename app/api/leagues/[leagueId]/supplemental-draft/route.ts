/**
 * GET: Active supplemental draft for league, or null.
 * POST: Create supplemental draft (commissioner + entitlement + dynasty + orphans).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { getOrphanRosterIdsForLeague, isOrphanPlatformUserId } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { prisma } from '@/lib/prisma'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'
import { isSupplementalDraftDynastyEligible } from '@/lib/supplemental-draft/dynastyEligibility'
import { SupplementalDraftEngine } from '@/lib/supplemental-draft/SupplementalDraftEngine'
import type { SupplementalDraftConfig } from '@/lib/supplemental-draft/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  if (!(await canAccessLeagueDraft(leagueId, userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const draft = await SupplementalDraftEngine.getActiveDraftForLeague(leagueId)
  return NextResponse.json({ draft })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const ent = await requireEntitlement('commissioner_supplemental_draft')
  if (ent instanceof NextResponse) return ent
  const commissionerUserId = ent

  if (!(await isCommissioner(leagueId, commissionerUserId))) {
    return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, isDynasty: true, leagueVariant: true, settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  if (!isSupplementalDraftDynastyEligible(league)) {
    return NextResponse.json({ error: 'Supplemental draft requires a dynasty league' }, { status: 400 })
  }

  const orphanIds = await getOrphanRosterIdsForLeague(leagueId)
  if (orphanIds.length < 2) {
    return NextResponse.json({ error: 'At least two orphan teams are required' }, { status: 400 })
  }

  const active = await SupplementalDraftEngine.getActiveDraftForLeague(leagueId)
  if (active) {
    return NextResponse.json({ error: 'A supplemental draft is already active' }, { status: 409 })
  }

  const allRosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true, platformUserId: true },
  })
  const participantRosterIds = allRosters
    .filter((r) => !isOrphanPlatformUserId(r.platformUserId))
    .map((r) => r.id)

  if (participantRosterIds.length === 0) {
    return NextResponse.json(
      { error: 'Supplemental draft needs at least one non-orphan team to participate' },
      { status: 400 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as Partial<SupplementalDraftConfig>
  const orderMode = body.orderMode === 'commissioner_set' ? 'commissioner_set' : 'randomized'
  const pickTimeSeconds =
    typeof body.pickTimeSeconds === 'number' && Number.isFinite(body.pickTimeSeconds)
      ? Math.max(30, Math.min(600, Math.floor(body.pickTimeSeconds)))
      : 120
  const autoPickOnTimeout = body.autoPickOnTimeout !== false
  const scenario = body.scenario === 'league_downsizing' ? 'league_downsizing' : 'orphan_teams'

  const config: SupplementalDraftConfig = {
    leagueId,
    scenario,
    sourceRosterIds: orphanIds,
    participantRosterIds,
    orderMode,
    manualOrder: Array.isArray(body.manualOrder) ? body.manualOrder.map(String) : undefined,
    pickTimeSeconds,
    autoPickOnTimeout,
  }

  try {
    const draft = await SupplementalDraftEngine.createDraft(config, commissionerUserId)
    return NextResponse.json({ draft })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create draft'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
