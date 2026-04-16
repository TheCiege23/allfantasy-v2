/**
 * Big Brother league bootstrap after creation: draft session shell, week 1 cycle (HOH_OPEN),
 * default premium engine spec. House chat uses the main league chat (Left panel).
 */

import { prisma } from '@/lib/prisma'
import { getOrCreateDraftSession } from '@/lib/live-draft-engine/DraftSessionService'
import { createFirstCycleIfNeeded } from '@/lib/big-brother/BigBrotherPhaseStateMachine'
import { DEFAULT_BIG_BROTHER_PREMIUM_ENGINE_SPEC } from '@/lib/big-brother/big-brother-premium-engine-spec'

export type BigBrotherBootstrapResult = {
  draftSessionReady: boolean
  weekOneCycle: { ok: boolean; cycleId?: string; week?: number; error?: string }
  premiumSpecSeeded: boolean
}

export async function runBigBrotherLeagueBootstrap(leagueId: string): Promise<BigBrotherBootstrapResult> {
  await getOrCreateDraftSession(leagueId)

  let premiumSpecSeeded = false
  const cfg = await prisma.bigBrotherLeagueConfig.findUnique({
    where: { leagueId },
    select: { id: true, premiumEngineSpec: true },
  })
  if (cfg && cfg.premiumEngineSpec == null) {
    await prisma.bigBrotherLeagueConfig.update({
      where: { leagueId },
      data: { premiumEngineSpec: DEFAULT_BIG_BROTHER_PREMIUM_ENGINE_SPEC as object },
    })
    premiumSpecSeeded = true
  }

  const weekOneCycle = await createFirstCycleIfNeeded(leagueId)

  return {
    draftSessionReady: true,
    weekOneCycle,
    premiumSpecSeeded,
  }
}
