/**
 * Unit coverage for engine-testing hardening, AI guards, fixtures, and full dry-run orchestration.
 */

import { describe, expect, it } from 'vitest'
import {
  assertImportExternalIdBatchUnique,
  assertMatchupPayloadWeekAligned,
  assertNonNegativeWeeklyPoints,
  assertSingleDraftCompletionMarker,
  assertTradePlayersOwnedBySendingRoster,
  assertValidSpecialtyAutomationTrigger,
} from '@/lib/engine-testing/hardening/engineInvariants'
import {
  allConsistencyChecksPass,
  runLeagueEngineConsistencyChecks,
} from '@/lib/engine-testing/hardening/consistencyChecks'
import {
  assertLeagueMatchupAiResultShape,
  buildStubLeagueMatchupAiResult,
} from '@/lib/engine-testing/hardening/aiPayloadGuards'
import { buildMinimalValidMatchupCenterPayload } from '@/lib/engine-testing/fixtures/enginePayloadBuilders'
import { assertValidMatchupPayload } from '@/lib/matchup-center/validateMatchupPayload'
import { getScenarioFixture } from '@/lib/engine-testing/fixtures/leagueScenarioFixtures'
import { runFullLeagueEngineDryRun } from '@/lib/engine-testing/simulation/fullEngineDryRun'
import { repeatSimulationScenario } from '@/lib/engine-testing/simulation/stressRepeatability'
import { getClaimPriorityRule, isFaabPriority } from '@/lib/waiver-defaults/ClaimPriorityResolver'

describe('league engine hardening invariants', () => {
  it('rejects duplicate draft completion markers', () => {
    expect(assertSingleDraftCompletionMarker({ completionMarkerCount: 2 }).ok).toBe(false)
    expect(assertSingleDraftCompletionMarker({ completionMarkerCount: 1 }).ok).toBe(true)
  })

  it('detects stale matchup payloads', () => {
    expect(assertMatchupPayloadWeekAligned({ payloadWeek: 2, expectedWeek: 3 }).ok).toBe(false)
    expect(assertMatchupPayloadWeekAligned({ payloadWeek: 4, expectedWeek: 4 }).ok).toBe(true)
  })

  it('validates trade asset ownership', () => {
    expect(
      assertTradePlayersOwnedBySendingRoster({
        rosterPlayerIds: ['a', 'b'],
        sendingPlayerIds: ['c'],
      }).ok,
    ).toBe(false)
    expect(
      assertTradePlayersOwnedBySendingRoster({
        rosterPlayerIds: ['a', 'b'],
        sendingPlayerIds: ['a'],
      }).ok,
    ).toBe(true)
  })

  it('rejects duplicate import external ids', () => {
    expect(assertImportExternalIdBatchUnique(['x', 'x']).ok).toBe(false)
    expect(assertImportExternalIdBatchUnique(['x', 'y']).ok).toBe(true)
  })

  it('accepts known specialty automation triggers', () => {
    expect(assertValidSpecialtyAutomationTrigger('onWeekFinalized').ok).toBe(true)
    expect(assertValidSpecialtyAutomationTrigger('not_a_trigger').ok).toBe(false)
  })

  it('guards weekly points sign', () => {
    expect(assertNonNegativeWeeklyPoints(-1).ok).toBe(false)
    expect(assertNonNegativeWeeklyPoints(0).ok).toBe(true)
  })
})

describe('league engine consistency snapshot', () => {
  it('runs golden-path checks', () => {
    const snapshot = {
      expectedLeagueId: 'league-a',
      draftSessionLeagueId: 'league-a',
      draftCompletionMarkerCount: 1,
      standingsRows: [{ wins: 1, losses: 0, ties: 0, gamesPlayed: 1 }],
      matchupPayloadWeek: 1,
      expectedMatchupWeek: 1,
      waiverRunKey: 'w1',
      waiverCompletedRunKeys: new Set<string>(),
      notificationDedupeKey: 'dedupe:1',
      specialtyTrigger: 'onDraftCompleted',
      tradeRosterPlayerIds: ['p1'],
      tradeSendingPlayerIds: ['p1'],
      importExternalIds: ['imp-a', 'imp-b'],
    }
    expect(allConsistencyChecksPass(snapshot)).toBe(true)
    expect(runLeagueEngineConsistencyChecks(snapshot).every((r) => r.ok)).toBe(true)
  })
})

describe('AI matchup / command center guardrails', () => {
  it('accepts stub matchup AI result', () => {
    expect(assertLeagueMatchupAiResultShape(buildStubLeagueMatchupAiResult()).ok).toBe(true)
  })

  it('validates matchup center payload from fixture builder', () => {
    const p = buildMinimalValidMatchupCenterPayload()
    expect(assertValidMatchupPayload(p).ok).toBe(true)
  })
})

describe('waiver priority helpers', () => {
  it('describes FAAB tiebreak', () => {
    expect(getClaimPriorityRule('faab_highest').rule).toBe('faab_highest')
    expect(isFaabPriority('faab', 'faab_highest')).toBe(true)
  })
})

describe('full engine dry run', () => {
  it('standard redraft stays green with consistency probe', () => {
    const fx = getScenarioFixture('standard_redraft_nfl')!
    const r = runFullLeagueEngineDryRun(fx)
    expect(r.fullOk).toBe(true)
    expect(r.consistencyProbe.allPass).toBe(true)
  })
})

describe('simulation repeatability', () => {
  it('preset + draft plan fingerprint is stable', () => {
    const fx = getScenarioFixture('standard_redraft_nfl')!
    const rep = repeatSimulationScenario(fx, 5)
    expect(rep.stable).toBe(true)
    expect(rep.uniqueFingerprints).toBe(1)
  })
})
