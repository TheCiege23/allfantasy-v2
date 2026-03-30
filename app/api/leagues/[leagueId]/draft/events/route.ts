/**
 * GET: Poll for draft events (since=timestamp). Returns session snapshot when updatedAt > since.
 * Realtime: client polls this or GET session; no WebSocket in this implementation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft, getCurrentUserRosterIdForLeague } from '@/lib/live-draft-engine/auth'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { runAuctionAutomationTick } from '@/lib/live-draft-engine/auction'
import { runKeeperAutomationTick } from '@/lib/live-draft-engine/keeper'
import { runSlowDraftAutomationTick } from '@/lib/live-draft-engine/slow-draft/SlowDraftRuntimeService'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'
import { getOrphanRosterIdsForLeague } from '@/lib/orphan-ai-manager/orphanRosterResolver'
import { prisma } from '@/lib/prisma'
import { getProviderStatus } from '@/lib/provider-config'

export const dynamic = 'force-dynamic'
const AUTOMATION_TICK_THROTTLE_MS = 2000
const MAX_AUTOMATION_TICK_STATE = 250

type AutomationTickState = {
  lastRunAt: number
  inFlight: Promise<void> | null
}

const tickStateGlobal = globalThis as typeof globalThis & {
  __afDraftAutomationTickState?: Map<string, AutomationTickState>
}

const automationTickState =
  tickStateGlobal.__afDraftAutomationTickState ??
  (tickStateGlobal.__afDraftAutomationTickState = new Map<string, AutomationTickState>())

function pruneAutomationTickState() {
  if (automationTickState.size <= MAX_AUTOMATION_TICK_STATE) return
  const sortedEntries = [...automationTickState.entries()].sort((a, b) => a[1].lastRunAt - b[1].lastRunAt)
  const overflow = automationTickState.size - MAX_AUTOMATION_TICK_STATE
  for (let index = 0; index < overflow; index += 1) {
    automationTickState.delete(sortedEntries[index][0])
  }
}

async function runAutomationTicksThrottled(leagueId: string): Promise<void> {
  const now = Date.now()
  const current = automationTickState.get(leagueId)
  if (current?.inFlight) {
    await current.inFlight
    return
  }
  if (current && now - current.lastRunAt < AUTOMATION_TICK_THROTTLE_MS) {
    return
  }

  const tickPromise = (async () => {
    await runKeeperAutomationTick(leagueId).catch(() => {})
    await runSlowDraftAutomationTick(leagueId).catch(() => {})
    await runAuctionAutomationTick(leagueId).catch(() => {})
  })().finally(() => {
    automationTickState.set(leagueId, { lastRunAt: Date.now(), inFlight: null })
    pruneAutomationTickState()
  })

  automationTickState.set(leagueId, {
    lastRunAt: current?.lastRunAt ?? 0,
    inFlight: tickPromise,
  })
  await tickPromise
}

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

  await runAutomationTicksThrottled(leagueId)

  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  const draftSession = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { updatedAt: true },
  })
  if (!draftSession) {
    return NextResponse.json({ leagueId, updated: false, session: null })
  }

  const updatedAt = draftSession.updatedAt.toISOString()
  if (since && new Date(since).getTime() >= draftSession.updatedAt.getTime()) {
    return NextResponse.json({ leagueId, updated: false, updatedAt })
  }

  const [snapshot, uiSettings, orphanRosterIds] = await Promise.all([
    buildSessionSnapshot(leagueId),
    getDraftUISettingsForLeague(leagueId),
    getOrphanRosterIdsForLeague(leagueId),
  ])
  const providerStatus = getProviderStatus()
  const currentUserRosterId = await getCurrentUserRosterIdForLeague(leagueId, userId!)
  const sessionPayload =
    snapshot != null
      ? {
          ...snapshot,
          currentUserRosterId: currentUserRosterId ?? undefined,
          orphanRosterIds,
          aiManagerEnabled: uiSettings.orphanTeamAiManagerEnabled,
          orphanDrafterMode: uiSettings.orphanDrafterMode,
          orphanAiProviderAvailable: providerStatus.anyAi,
          orphanDrafterEffectiveMode:
            uiSettings.orphanDrafterMode === 'ai' && !providerStatus.anyAi
              ? 'cpu'
              : uiSettings.orphanDrafterMode,
        }
      : null
  return NextResponse.json({ leagueId, updated: true, updatedAt, session: sessionPayload })
}
