/**
 * [NEW] lib/big-brother/BigBrotherPhaseStateMachine.ts
 * Week state machine: HOH_OPEN → … → EVICTION_RESOLVED → JURY_UPDATE → RESET_NEXT_WEEK.
 * All transitions are deterministic and auditable. PROMPT 3.
 */

import { prisma } from '@/lib/prisma'
import { appendBigBrotherAudit } from './BigBrotherAuditLog'
import type { BigBrotherWeekPhase } from './types'

const VALID_PHASES: BigBrotherWeekPhase[] = [
  'HOH_OPEN',
  'HOH_LOCKED',
  'NOMINATION_OPEN',
  'NOMINATION_LOCKED',
  'VETO_DRAW',
  'VETO_CHALLENGE_OPEN',
  'VETO_DECISION_OPEN',
  'REPLACEMENT_NOMINATION_OPEN',
  'VOTING_OPEN',
  'VOTING_LOCKED',
  'EVICTION_RESOLVED',
  'JURY_UPDATE',
  'RESET_NEXT_WEEK',
]

export function isValidPhase(s: string): s is BigBrotherWeekPhase {
  return VALID_PHASES.includes(s as BigBrotherWeekPhase)
}

/** Valid transitions from each phase (deterministic). */
const TRANSITIONS: Record<BigBrotherWeekPhase, BigBrotherWeekPhase[]> = {
  HOH_OPEN: ['HOH_LOCKED'],
  HOH_LOCKED: ['NOMINATION_OPEN'],
  NOMINATION_OPEN: ['NOMINATION_LOCKED'],
  NOMINATION_LOCKED: ['VETO_DRAW'],
  VETO_DRAW: ['VETO_CHALLENGE_OPEN'],
  VETO_CHALLENGE_OPEN: ['VETO_DECISION_OPEN'],
  VETO_DECISION_OPEN: ['REPLACEMENT_NOMINATION_OPEN', 'VOTING_OPEN'], // VOTING_OPEN if veto not used
  REPLACEMENT_NOMINATION_OPEN: ['VOTING_OPEN'],
  VOTING_OPEN: ['VOTING_LOCKED'],
  VOTING_LOCKED: ['EVICTION_RESOLVED'],
  EVICTION_RESOLVED: ['JURY_UPDATE', 'RESET_NEXT_WEEK'],
  JURY_UPDATE: ['RESET_NEXT_WEEK'],
  RESET_NEXT_WEEK: [],
}

export function canTransition(from: BigBrotherWeekPhase, to: BigBrotherWeekPhase): boolean {
  const allowed = TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

export async function getCyclePhase(cycleId: string): Promise<BigBrotherWeekPhase | null> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { phase: true },
  })
  if (!cycle?.phase) return null
  return isValidPhase(cycle.phase) ? (cycle.phase as BigBrotherWeekPhase) : 'HOH_OPEN'
}

export async function getCurrentCycleForLeague(leagueId: string): Promise<{ id: string; week: number; phase: string } | null> {
  const cycle = await prisma.bigBrotherCycle.findFirst({
    where: { leagueId },
    orderBy: { week: 'desc' },
    select: { id: true, week: true, phase: true },
  })
  return cycle ? { id: cycle.id, week: cycle.week, phase: cycle.phase } : null
}

/**
 * Transition cycle to a new phase. Validates transition; updates DB; audits.
 */
export async function transitionPhase(
  cycleId: string,
  toPhase: BigBrotherWeekPhase,
  metadata?: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const cycle = await prisma.bigBrotherCycle.findUnique({
    where: { id: cycleId },
    select: { leagueId: true, configId: true, week: true, phase: true },
  })
  if (!cycle) return { ok: false, error: 'Cycle not found' }

  const from = (isValidPhase(cycle.phase) ? cycle.phase : 'HOH_OPEN') as BigBrotherWeekPhase
  if (!canTransition(from, toPhase)) {
    return { ok: false, error: `Invalid transition from ${from} to ${toPhase}` }
  }

  await prisma.bigBrotherCycle.update({
    where: { id: cycleId },
    data: { phase: toPhase },
  })

  await appendBigBrotherAudit(cycle.leagueId, cycle.configId, 'phase_transition', {
    cycleId,
    week: cycle.week,
    fromPhase: from,
    toPhase,
    ...metadata,
  })
  return { ok: true }
}
