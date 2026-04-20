/**
 * Deterministic league-engine simulation (no DB) for regression and stress scenarios.
 * Uses: preset engine, draft order generation, lifecycle invariants.
 */

import { runPresetEngine } from '@/lib/league-creation/preset-engine/runPresetEngine'
import { generateFullPickOrder } from '@/lib/draft-engine/order/generateFullPickOrder'
import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import {
  assertLifecycleTransitionAllowed,
  assertDraftPickCountInvariant,
} from '@/lib/engine-testing/hardening/engineInvariants'
import type { LeagueEngineScenarioFixture } from '@/lib/engine-testing/fixtures/leagueScenarioFixtures'
import type { LeagueLifecycleState } from '@prisma/client'

export type SimulationStep =
  | { kind: 'preset_resolved'; presetKey: string; leagueFormatId: string }
  | { kind: 'draft_planned'; totalPicks: number; rounds: number }
  | { kind: 'lifecycle_step'; from: LeagueLifecycleState; to: LeagueLifecycleState; ok: boolean }

export type LeagueSimulationReport = {
  scenarioId: string
  ok: boolean
  errors: string[]
  steps: SimulationStep[]
  derivedFlags: Record<string, unknown> | null
}

function buildSlotOrder(teamCount: number): SlotOrderEntry[] {
  return Array.from({ length: teamCount }, (_, i) => ({
    rosterId: `roster-${i + 1}`,
    displayName: `Team ${i + 1}`,
    slot: i + 1,
  }))
}

/**
 * Runs a full dry-run: preset → derived flags → draft order (snake) → optional lifecycle walk.
 */
export function runLeagueSimulationScenario(
  fixture: LeagueEngineScenarioFixture,
  options?: {
    lifecyclePath?: LeagueLifecycleState[]
  },
): LeagueSimulationReport {
  const errors: string[] = []
  const steps: SimulationStep[] = []

  let derivedFlags: Record<string, unknown> | null = null

  try {
    const out = runPresetEngine(fixture.preset)
    derivedFlags = out.derivedFlags as unknown as Record<string, unknown>
    steps.push({
      kind: 'preset_resolved',
      presetKey: out.presetKey,
      leagueFormatId: out.leagueFormatId,
    })

    const rounds = out.formatResolution.draftDefaults.rounds_default ?? 16
    const teamCount = fixture.preset.teamCount
    const slotOrder = buildSlotOrder(teamCount)
    const resolvedDraftType = String(out.formatResolution.draftType ?? 'snake').toLowerCase()
    const structuralType =
      resolvedDraftType.includes('auction') ? ('auction' as const) : resolvedDraftType.includes('linear')
        ? ('linear' as const)
        : ('snake' as const)

    const plan =
      structuralType === 'auction'
        ? []
        : generateFullPickOrder({
            teamCount,
            rounds,
            draftType: structuralType,
            thirdRoundReversal: false,
            slotOrder,
          })

    if (plan.length > 0) {
      const inv = assertDraftPickCountInvariant({
        teamCount,
        rounds,
        expectedPicks: plan.length,
      })
      if (!inv.ok) errors.push(inv.message)
    }

    steps.push({
      kind: 'draft_planned',
      totalPicks: plan.length,
      rounds,
    })

    const path = options?.lifecyclePath ?? ['setup', 'pre_draft', 'drafting', 'post_draft', 'in_season']
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i]!
      const to = path[i + 1]!
      const t = assertLifecycleTransitionAllowed(from, to)
      steps.push({ kind: 'lifecycle_step', from, to, ok: t.ok })
      if (!t.ok) errors.push(t.message)
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
  }

  return {
    scenarioId: fixture.id,
    ok: errors.length === 0,
    errors,
    steps,
    derivedFlags,
  }
}

export function runAllFixtures(
  fixtures: LeagueEngineScenarioFixture[],
): { passed: number; failed: number; reports: LeagueSimulationReport[] } {
  const reports = fixtures.map((f) => runLeagueSimulationScenario(f))
  const failed = reports.filter((r) => !r.ok).length
  return { passed: reports.length - failed, failed, reports }
}
