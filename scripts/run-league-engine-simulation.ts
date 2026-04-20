/**
 * CLI: run all league-engine simulation fixtures (preset + draft plan + lifecycle walk).
 * Usage: npx tsx scripts/run-league-engine-simulation.ts [--json]
 */

import { LEAGUE_ENGINE_SCENARIO_FIXTURES, runAllFixtures } from '@/lib/engine-testing'

const json = process.argv.includes('--json')

const { passed, failed, reports } = runAllFixtures(LEAGUE_ENGINE_SCENARIO_FIXTURES)

if (json) {
  console.log(JSON.stringify({ passed, failed, reports }, null, 2))
} else {
  console.log(`League engine simulation: ${passed} passed, ${failed} failed (total ${reports.length})`)
  for (const r of reports) {
    const mark = r.ok ? 'OK' : 'FAIL'
    console.log(`  [${mark}] ${r.scenarioId}: ${r.errors.join('; ') || 'no errors'}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
