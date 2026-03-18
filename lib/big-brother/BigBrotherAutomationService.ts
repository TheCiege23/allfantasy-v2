/**
 * [NEW] lib/big-brother/BigBrotherAutomationService.ts
 * Deterministic automation: phase transitions, auto-nomination, veto draw, eviction close, jury, finale.
 * Call from cron or commissioner trigger. AI never decides outcomes. PROMPT 3.
 */

import { prisma } from '@/lib/prisma'
import { getBigBrotherConfig } from './BigBrotherLeagueConfig'
import { getCurrentCycleForLeague, transitionPhase } from './BigBrotherPhaseStateMachine'
import { runAutoNomination } from './BigBrotherNominationEnforcement'
import { selectVetoCompetitors, setVetoWinner } from './BigBrotherVetoEngine'
import { announceVetoDraw } from './BigBrotherChatAnnouncements'
import { closeEviction } from './BigBrotherEvictionService'
import { getFinalNomineeRosterIds } from './BigBrotherNominationEngine'
import type { BigBrotherWeekPhase } from './types'

export interface AutomationRunInput {
  leagueId: string
  /** Optional: force action (e.g. 'close_eviction', 'auto_nominate', 'veto_draw'). If not set, automation infers from phase and time. */
  action?: 'tick' | 'close_eviction' | 'auto_nominate' | 'veto_draw' | 'auto_replacement' | 'lock_voting'
  systemUserId?: string | null
}

export interface AutomationRunResult {
  ok: boolean
  cycleId?: string
  phase?: string
  actionTaken?: string
  error?: string
}

/**
 * Run one automation tick for a league. Determines current cycle and phase; applies deadline-based actions.
 * Does not infer deadlines from wall clock here — caller (cron) should call with action when appropriate.
 */
export async function runAutomation(input: AutomationRunInput): Promise<AutomationRunResult> {
  const { leagueId, action = 'tick', systemUserId } = input

  const config = await getBigBrotherConfig(leagueId)
  if (!config) return { ok: false, error: 'Not a Big Brother league' }

  const current = await getCurrentCycleForLeague(leagueId)
  if (!current) return { ok: false, error: 'No current cycle' }

  const phase = current.phase as BigBrotherWeekPhase

  if (action === 'auto_nominate') {
    const res = await runAutoNomination(current.id, { systemUserId })
    if (!res.ok) return { ok: false, error: res.error }
    await transitionPhase(current.id, 'NOMINATION_LOCKED', { auto: true })
    return { ok: true, cycleId: current.id, phase: 'NOMINATION_LOCKED', actionTaken: 'auto_nomination' }
  }

  if (action === 'veto_draw') {
    const res = await selectVetoCompetitors(current.id)
    if (!res.ok) return { ok: false, error: res.error }
    await transitionPhase(current.id, 'VETO_CHALLENGE_OPEN')
    const cycle = await prisma.bigBrotherCycle.findUnique({
      where: { id: current.id },
      select: { vetoParticipantRosterIds: true },
    })
    const ids = (cycle?.vetoParticipantRosterIds as string[] | null) ?? []
    await announceVetoDraw({
      leagueId,
      week: current.week,
      participantRosterIds: ids,
      systemUserId,
    })
    return { ok: true, cycleId: current.id, phase: 'VETO_CHALLENGE_OPEN', actionTaken: 'veto_draw' }
  }

  if (action === 'auto_replacement') {
    const { runAutoReplacementNominee } = await import('./BigBrotherNominationEnforcement')
    const res = await runAutoReplacementNominee(current.id, { systemUserId })
    if (!res.ok) return { ok: false, error: res.error }
    await transitionPhase(current.id, 'VOTING_OPEN')
    return { ok: true, cycleId: current.id, phase: 'VOTING_OPEN', actionTaken: 'auto_replacement' }
  }

  if (action === 'lock_voting' || action === 'close_eviction') {
    const cycle = await prisma.bigBrotherCycle.findUnique({
      where: { id: current.id },
      select: { closedAt: true, phase: true },
    })
    if (cycle?.closedAt) return { ok: false, error: 'Eviction already closed' }
    if (phase !== 'VOTING_OPEN' && phase !== 'VOTING_LOCKED') {
      await transitionPhase(current.id, 'VOTING_LOCKED').catch(() => {})
    }
    const res = await closeEviction(current.id, { systemUserId, postToChat: true })
    if (!res.ok) return { ok: false, error: res.error }
    return { ok: true, cycleId: current.id, phase: 'EVICTION_RESOLVED', actionTaken: 'close_eviction' }
  }

  return { ok: true, cycleId: current.id, phase, actionTaken: undefined }
}
