/**
 * CLI: run league-engine simulation fixtures (preset + draft plan + lifecycle walk).
 *
 * Usage:
 *   npx tsx scripts/run-league-engine-simulation.ts [--json]
 *   npx tsx scripts/run-league-engine-simulation.ts --full [--json]
 *
 * --full  Runs `runFullLeagueEngineDryRun` (extended probes + consistency snapshot) for every fixture.
 */

import {
  LEAGUE_ENGINE_SCENARIO_FIXTURES,
  runAllFixtures,
  runFullLeagueEngineDryRun,
} from '@/lib/engine-testing'

const json = process.argv.includes('--json')
const full = process.argv.includes('--full')

if (full) {
  const reports = LEAGUE_ENGINE_SCENARIO_FIXTURES.map((fx) => runFullLeagueEngineDryRun(fx))
  const failed = reports.filter((r) => !r.fullOk).length
  const passed = reports.length - failed

  if (json) {
    console.log(JSON.stringify({ mode: 'full', passed, failed, reports }, null, 2))
  } else {
    console.log(
      `League engine FULL dry-run: ${passed} passed, ${failed} failed (total ${reports.length})`,
    )
    for (const r of reports) {
      const mark = r.fullOk ? 'OK' : 'FAIL'
      console.log(`  [${mark}] ${r.scenarioId}: ${r.errors.join('; ') || 'no errors'}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

const { passed, failed, reports } = runAllFixtures(LEAGUE_ENGINE_SCENARIO_FIXTURES)

if (json) {
  console.log(JSON.stringify({ mode: 'base', passed, failed, reports }, null, 2))
} else {
  console.log(`League engine simulation: ${passed} passed, ${failed} failed (total ${reports.length})`)
  for (const r of reports) {
    const mark = r.ok ? 'OK' : 'FAIL'
    console.log(`  [${mark}] ${r.scenarioId}: ${r.errors.join('; ') || 'no errors'}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
