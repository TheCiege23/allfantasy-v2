/**
 * In-process scheduled waiver run (e.g. worker / cron job that calls TS directly).
 * FCFS leagues use immediate processing on each claim POST instead of this batch helper.
 * For HTTP, prefer `POST /api/waiver-wire/leagues/[leagueId]/process` with `x-cron-secret: $CRON_SECRET`.
 */
import { processWaiverClaimsForLeague } from './process-engine'

export async function runScheduledWaiverProcessForLeague(leagueId: string) {
  return processWaiverClaimsForLeague(leagueId, {
    runType: 'scheduled',
    processedByUserId: null,
  })
}
