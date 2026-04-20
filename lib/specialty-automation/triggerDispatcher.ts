import { runSpecialtyAutomationOrchestrator } from '@/lib/specialty-automation/orchestrator'
import type { AutomationTrigger } from '@/lib/specialty-automation/types'

/**
 * Entry point for hooks (scoring worker, waiver worker, cron, commissioner).
 */
export async function dispatchSpecialtyAutomationTrigger(input: {
  trigger: AutomationTrigger
  leagueId: string
  season: number
  week: number | null
  source?: string
  force?: boolean
}) {
  return runSpecialtyAutomationOrchestrator({
    leagueId: input.leagueId,
    season: input.season,
    week: input.week,
    trigger: input.trigger,
    source: input.source,
    force: input.force,
  })
}
