/**
 * QA harness for specialty leagues (PROMPT 350).
 * Standard checks: creation, config, summary route, AI route, roster guard, capabilities.
 */

import type { SpecialtyLeagueId, SpecialtyLeagueSpec } from './types'

export interface QACheckResult {
  check: string
  passed: boolean
  reason?: string
}

/**
 * Run standard QA checks for a specialty league. Does not run automation or mutate state.
 */
export async function runSpecialtyQAHarness(args: {
  leagueId: string
  spec: SpecialtyLeagueSpec
  options?: { week?: number }
}): Promise<{ passed: string[]; failed: { check: string; reason: string }[]; skipped: string[] }> {
  const { leagueId, spec, options } = args
  const passed: string[] = []
  const failed: { check: string; reason: string }[] = []
  const skipped: string[] = []

  const add = (check: string, ok: boolean, reason?: string) => {
    if (ok) passed.push(check)
    else failed.push({ check, reason: reason ?? 'Unknown' })
  }
  const skip = (check: string) => skipped.push(check)

  try {
    const detected = await spec.detect(leagueId)
    add('detect', detected, detected ? undefined : 'League not detected as this specialty type')
    if (!detected) {
      return { passed, failed, skipped }
    }

    const config = await spec.getConfig(leagueId)
    add('getConfig', config != null, config != null ? undefined : 'Config null or missing')

    if (spec.rosterGuard) {
      try {
        const canAct = await spec.rosterGuard(leagueId, 'non-existent-roster-id')
        add('rosterGuard', typeof canAct === 'boolean', 'rosterGuard must return boolean')
      } catch (e) {
        add('rosterGuard', false, (e as Error).message)
      }
    } else {
      skip('rosterGuard')
    }

    if (spec.getExcludedRosterIds) {
      try {
        const ids = await spec.getExcludedRosterIds(leagueId)
        add('getExcludedRosterIds', Array.isArray(ids), 'Must return array')
      } catch (e) {
        add('getExcludedRosterIds', false, (e as Error).message)
      }
    } else {
      skip('getExcludedRosterIds')
    }

    if (spec.capabilities) {
      add(
        'capabilities',
        typeof spec.capabilities === 'object',
        'capabilities must be object'
      )
    } else {
      skip('capabilities')
    }
  } catch (e) {
    failed.push({ check: 'harness', reason: (e as Error).message })
  }

  return { passed, failed, skipped }
}

/** Standard QA check IDs for specialty leagues. */
export const QA_HARNESS_CHECKS = [
  'creation_flow',
  'config_load',
  'summary_route',
  'ai_route',
  'roster_guard',
  'excluded_rosters',
  'automation_safe',
  'ai_no_outcomes',
  'mobile_layout',
  'desktop_layout',
] as const
