/**
 * Throttled keeper/slow-draft/auction automation ticks shared by draft poll endpoints.
 */

import { runAuctionAutomationTick } from '@/lib/live-draft-engine/auction'
import { runKeeperAutomationTick } from '@/lib/live-draft-engine/keeper'
import { runSlowDraftAutomationTick } from '@/lib/live-draft-engine/slow-draft/SlowDraftRuntimeService'

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

export async function runAutomationTicksThrottled(leagueId: string): Promise<void> {
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
