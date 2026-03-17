/**
 * GET: Keeper config, selections, and locks for the league draft.
 * POST: Add or update a keeper selection (validated). Commissioner can override.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { validateKeeperSelection } from '@/lib/live-draft-engine/keeper/KeeperRuleEngine'
import type { KeeperConfig, KeeperSelection } from '@/lib/live-draft-engine/keeper/types'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const snapshot = await buildSessionSnapshot(leagueId)
  if (!snapshot) return NextResponse.json({ error: 'No draft session' }, { status: 404 })

  const keeper = (snapshot as any).keeper
  const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  const mySelections = keeper?.selections?.filter((s: any) => s.rosterId === currentUserRosterId) ?? []

  return NextResponse.json({
    config: keeper?.config ?? { maxKeepers: 0 },
    selections: keeper?.selections ?? [],
    locks: keeper?.locks ?? [],
    mySelections,
    currentUserRosterId: currentUserRosterId ?? undefined,
  })
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const rosterId = body.rosterId ?? body.roster_id
  const roundCost = body.roundCost ?? body.round_cost
  const playerName = body.playerName ?? body.player_name
  const position = body.position ?? ''
  const team = body.team ?? null
  const playerId = body.playerId ?? body.player_id ?? null
  const commissionerOverride = Boolean(body.commissionerOverride ?? body.commissioner_override)

  if (!rosterId || roundCost == null || !playerName) {
    return NextResponse.json(
      { error: 'rosterId, roundCost, and playerName are required' },
      { status: 400 }
    )
  }

  const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
  if (rosterId !== currentUserRosterId && !commissionerOverride) {
    try {
      await assertCommissioner(leagueId, userId)
    } catch {
      return NextResponse.json({ error: 'You can only set keepers for your own roster' }, { status: 403 })
    }
  }

  const isCommissioner = await assertCommissioner(leagueId, userId).then(() => true).catch(() => false)

  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
  })
  if (!draftSession) return NextResponse.json({ error: 'No draft session' }, { status: 404 })
  if (draftSession.status !== 'pre_draft') {
    return NextResponse.json({ error: 'Keepers cannot be changed after draft has started' }, { status: 400 })
  }

  const config = (draftSession.keeperConfig ?? (draftSession as any).keeperConfig) as KeeperConfig | null
  const existing = (draftSession.keeperSelections ?? (draftSession as any).keeperSelections) as KeeperSelection[] | undefined
  const existingList = Array.isArray(existing) ? existing : []

  const newSelection: KeeperSelection = {
    rosterId,
    roundCost: Number(roundCost),
    playerName: String(playerName).trim(),
    position: String(position).trim() || '—',
    team: team != null ? String(team).trim() || null : null,
    playerId: playerId != null ? String(playerId).trim() || null : null,
    commissionerOverride: isCommissioner && commissionerOverride,
  }

  const validation = validateKeeperSelection({
    config,
    existingSelections: existingList,
    newSelection,
    rounds: draftSession.rounds,
    teamCount: draftSession.teamCount,
    commissionerOverride: isCommissioner && commissionerOverride,
  })
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const withoutThisPlayer = existingList.filter(
    (s) => !(s.rosterId === rosterId && s.playerName.trim().toLowerCase() === newSelection.playerName.toLowerCase())
  )
  const withoutThisRound = withoutThisPlayer.filter(
    (s) => !(s.rosterId === rosterId && s.roundCost === newSelection.roundCost)
  )
  const nextSelections = [...withoutThisRound, newSelection]

  await prisma.draftSession.update({
    where: { id: draftSession.id },
    data: {
      keeperSelections: nextSelections as any,
      version: { increment: 1 },
      updatedAt: new Date(),
    },
  })

  const snapshot = await buildSessionSnapshot(leagueId)
  return NextResponse.json({
    ok: true,
    keeper: (snapshot as any).keeper,
    session: snapshot,
  })
}
