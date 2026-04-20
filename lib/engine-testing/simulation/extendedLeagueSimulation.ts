/**
 * Extended dry-run: preset + draft plan + lifecycle + create validation + trade + roster + lineup lock.
 * No database — safe for CI and stress loops.
 */

import { validateCreatePayload } from '@/lib/league-creation/canonical/validateCreateLeague'
import { resolveLeagueTradeSettings } from '@/lib/league-trade-engine/tradeSettingsResolver'
import {
  validateTradeAssets,
  type TradeValidationResult,
} from '@/lib/league-trade-engine/tradeValidationService'
import { collectDuplicatePlayerIssues } from '@/lib/roster-lineup-engine/rosterValidationService'
import { evaluateLineupLock } from '@/lib/league/lineup-lock'
import {
  buildEngineTestLeague,
  buildEngineTestRoster,
  buildPlayerSwapTradeAssets,
} from '@/lib/engine-testing/fixtures/enginePayloadBuilders'
import type { LeagueEngineScenarioFixture } from '@/lib/engine-testing/fixtures/leagueScenarioFixtures'
import {
  runLeagueSimulationScenario,
  type LeagueSimulationReport,
  type SimulationStep,
} from '@/lib/engine-testing/simulation/leagueSimulationHarness'

export type ExtendedSimulationStep =
  | SimulationStep
  | { kind: 'create_payload'; ok: boolean }
  | { kind: 'trade_validation'; ok: boolean; code?: string }
  | { kind: 'roster_duplicate_scan'; issueCount: number }
  | { kind: 'lineup_lock_probe'; locked: boolean; policy: string }

export type ExtendedLeagueSimulationReport = LeagueSimulationReport & {
  extendedOnlySteps: ExtendedSimulationStep[]
  extendedOk: boolean
}

/**
 * Runs `runLeagueSimulationScenario` plus cross-engine probes with deterministic stubs.
 */
export function runExtendedLeagueEngineSimulation(
  fixture: LeagueEngineScenarioFixture,
  options?: Parameters<typeof runLeagueSimulationScenario>[1],
): ExtendedLeagueSimulationReport {
  const base = runLeagueSimulationScenario(fixture, options)
  const extendedOnlySteps: ExtendedSimulationStep[] = []

  const p = fixture.preset
  const cp = validateCreatePayload({
    concept: String(p.concept),
    sport: p.sport,
    teamCount: p.teamCount,
    draftType: String(p.draftType),
    scoringPreset: p.scoringPreset,
    leagueName: p.leagueName ?? 'Sim',
  })
  extendedOnlySteps.push({ kind: 'create_payload', ok: cp.ok })

  const lg = buildEngineTestLeague()
  const proposer = buildEngineTestRoster('r-sim-1', lg.id, 'u1', { players: ['p1', 'p2'] })
  const receiver = buildEngineTestRoster('r-sim-2', lg.id, 'u2', { players: ['p3', 'p4'] })
  const settings = resolveLeagueTradeSettings(lg)
  const tv = validateTradeAssets({
    league: lg,
    settings,
    proposer,
    receiver,
    assets: buildPlayerSwapTradeAssets({
      proposerRosterId: proposer.id,
      receiverRosterId: receiver.id,
      proposerSendsPlayerId: 'p1',
      receiverSendsPlayerId: 'p3',
    }),
    currentWeek: 5,
  })
  const tvFailed: Extract<TradeValidationResult, { ok: false }> | null = tv.ok ? null : tv
  extendedOnlySteps.push({
    kind: 'trade_validation',
    ok: tv.ok,
    code: tvFailed?.code,
  })

  const dupIssues = collectDuplicatePlayerIssues({
    lineup_sections: {
      starters: [{ id: 'p1', position: 'RB' }],
      bench: [{ id: 'p1', position: 'RB' }],
      ir: [],
      taxi: [],
      devy: [],
    },
  })
  extendedOnlySteps.push({ kind: 'roster_duplicate_scan', issueCount: dupIssues.length })

  const lock = evaluateLineupLock({
    sport: 'NFL',
    now: new Date(),
    leagueWeek: 5,
    editingWeek: 5,
  })
  extendedOnlySteps.push({
    kind: 'lineup_lock_probe',
    locked: lock.locked,
    policy: lock.policy,
  })

  const extendedOk = cp.ok && tv.ok && dupIssues.length > 0
  const errors = [...base.errors]
  if (!extendedOk) {
    errors.push('extended_league_engine_simulation_failed')
  }

  return {
    ...base,
    ok: base.ok && extendedOk,
    errors,
    extendedOnlySteps,
    extendedOk,
  }
}
