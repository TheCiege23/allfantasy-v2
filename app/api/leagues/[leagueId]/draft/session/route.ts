/**
 * GET: Full draft session snapshot (reconnect/resync). Poll-friendly.
 * POST: Create or start draft session (commissioner).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import {
  getOrCreateDraftSession,
  buildSessionSnapshot,
  startDraftSession,
} from '@/lib/live-draft-engine/DraftSessionService'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { getDraftOrderModeAndLotteryConfig } from '@/lib/draft-lottery/lotteryConfigStorage'
import { dedupeInFlight } from '@/lib/api-performance'

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

  try {
    const shared = await dedupeInFlight(`draft:session:${leagueId}`, async () => {
      const [snapshot, uiSettings, orphanRosterIds, orderMode] = await Promise.all([
        buildSessionSnapshot(leagueId),
        getDraftUISettingsForLeague(leagueId),
        getOrphanRosterIdsForLeague(leagueId),
        getDraftOrderModeAndLotteryConfig(leagueId),
      ])
      return { snapshot, uiSettings, orphanRosterIds, orderMode }
    })

    if (!shared.snapshot) {
      return NextResponse.json({
        leagueId,
        session: null,
        message: 'No draft session. POST to create and start.',
      })
    }

    const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
    return NextResponse.json({
      leagueId,
      session: {
        ...shared.snapshot,
        currentUserRosterId: currentUserRosterId ?? undefined,
        orphanRosterIds: shared.orphanRosterIds,
        aiManagerEnabled: shared.uiSettings.orphanTeamAiManagerEnabled,
        orphanDrafterMode: shared.uiSettings.orphanDrafterMode,
        draftOrderMode: shared.orderMode?.draftOrderMode,
        lotteryLastRunAt: shared.orderMode?.lotteryLastRunAt ?? undefined,
      },
    })
  } catch (e) {
    console.error('[draft/session GET]', e)
    return NextResponse.json({ error: 'Failed to load draft session' }, { status: 500 })
  }
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

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const action = (body.action as string) || 'ensure'

  try {
    if (action === 'ensure' || action === 'create') {
      const { session: s, created } = await getOrCreateDraftSession(leagueId)
      return NextResponse.json({
        sessionId: s.id,
        leagueId: s.leagueId,
        status: s.status,
        created,
      })
    }
    if (action === 'start') {
      const started = await startDraftSession(leagueId)
      if (!started) return NextResponse.json({ error: 'Cannot start draft' }, { status: 400 })
      const [snapshot, uiSettings, orphanRosterIds] = await Promise.all([
        buildSessionSnapshot(leagueId),
        getDraftUISettingsForLeague(leagueId),
        getOrphanRosterIdsForLeague(leagueId),
      ])
      if (!snapshot) return NextResponse.json({ error: 'Failed to build session' }, { status: 500 })
      const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId)
      return NextResponse.json({
        leagueId,
        session: {
          ...snapshot,
          currentUserRosterId: currentUserRosterId ?? undefined,
          orphanRosterIds,
          aiManagerEnabled: uiSettings.orphanTeamAiManagerEnabled,
          orphanDrafterMode: uiSettings.orphanDrafterMode,
        },
      })
    }
    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 })
  } catch (e) {
    console.error('[draft/session POST]', e)
    return NextResponse.json({ error: (e as Error).message ?? 'Server error' }, { status: 500 })
  }
}
