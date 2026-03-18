/**
 * Devy Dynasty three-draft orchestration. PROMPT 2/6.
 * A. Startup vet draft (once) — veterans/pro only; excludes NCAA devy.
 * B. Annual rookie draft — newly drafted pro rookies only; excludes devy-held-and-promoted, excludes vets.
 * C. Annual devy draft — NCAA eligible devy only; excludes rostered devy, excludes graduated.
 * Deterministic: pick order methods, exclusion logic, draft type (snake/linear).
 */

import { prisma } from '@/lib/prisma'
import { getDevyConfig } from '../DevyLeagueConfig'
import type { DevyLeagueConfigShape } from '../types'
import type { DevyDraftPhase, DevyPickOrderMethod } from '../types'

export type DraftPhaseStatus = 'not_started' | 'in_progress' | 'completed'

export interface DevyDraftPhaseInfo {
  phase: DevyDraftPhase
  status: DraftPhaseStatus
  rounds: number
  draftType: 'snake' | 'linear'
  pickOrderMethod: DevyPickOrderMethod
  /** Human-readable description. */
  description: string
}

/**
 * Get the current draft phase for a league (startup_vet → rookie → devy per season).
 * Uses DraftSession if present; otherwise derives from config and league state.
 */
export async function getCurrentDraftPhase(leagueId: string): Promise<{
  phase: DevyDraftPhase | null
  phaseInfo: DevyDraftPhaseInfo | null
  sessionId: string | null
}> {
  const config = await getDevyConfig(leagueId)
  if (!config) return { phase: null, phaseInfo: null, sessionId: null }

  const session = await prisma.draftSession.findUnique({
    where: { leagueId },
    select: { id: true, status: true, draftType: true, rounds: true },
  })

  if (session) {
    const status = session.status === 'completed' ? 'completed' : session.status === 'in_progress' ? 'in_progress' : 'not_started'
    const phase: DevyDraftPhase = 'startup_vet'
    return {
      phase: 'startup_vet',
      phaseInfo: {
        phase: 'startup_vet',
        status,
        rounds: session.rounds,
        draftType: (session.draftType as 'snake' | 'linear') ?? config.startupDraftType,
        pickOrderMethod: 'custom',
        description: 'Startup veteran draft',
      },
      sessionId: session.id,
    }
  }

  return {
    phase: 'startup_vet',
    phaseInfo: {
      phase: 'startup_vet',
      status: 'not_started',
      rounds: config.startupVetRounds ?? 0,
      draftType: config.startupDraftType,
      pickOrderMethod: 'custom',
      description: 'Startup veteran draft',
    },
    sessionId: null,
  }
}

/**
 * Get config for a specific phase (rounds, draft type, pick order).
 */
export function getPhaseConfig(
  config: DevyLeagueConfigShape,
  phase: DevyDraftPhase
): { rounds: number; draftType: 'snake' | 'linear'; pickOrderMethod: DevyPickOrderMethod } {
  switch (phase) {
    case 'startup_vet':
      return {
        rounds: config.startupVetRounds ?? 0,
        draftType: config.startupDraftType,
        pickOrderMethod: 'custom',
      }
    case 'rookie':
      return {
        rounds: config.rookieDraftRounds,
        draftType: config.rookieDraftType,
        pickOrderMethod: config.rookiePickOrderMethod,
      }
    case 'devy':
      return {
        rounds: config.devyDraftRounds,
        draftType: config.devyDraftType,
        pickOrderMethod: config.devyPickOrderMethod,
      }
    default:
      return {
        rounds: 0,
        draftType: 'snake',
        pickOrderMethod: 'reverse_standings',
      }
  }
}

/**
 * Exclusion rules for pool by phase (deterministic).
 * - startup_vet: pro (veteran) only; exclude NCAA devy players.
 * - rookie: pro rookies only; exclude vets; exclude players already held as devy and promoted to owner.
 * - devy: NCAA eligible devy only; exclude already rostered devy; exclude graduated.
 */
export function getPoolExclusionRule(phase: DevyDraftPhase): string {
  switch (phase) {
    case 'startup_vet':
      return 'pro_only'
    case 'rookie':
      return 'rookies_only_exclude_devy_promoted_and_vets'
    case 'devy':
      return 'devy_only_exclude_rostered_and_graduated'
    default:
      return 'pro_only'
  }
}
