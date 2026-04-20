/**
 * Structured logging and timing for league-engine operations (cron, workers, API hot paths).
 * Logs are JSON lines for log aggregators; avoid PII in `extra`.
 */

export type LeagueEngineSubsystem =
  | 'waiver'
  | 'scoring'
  | 'draft'
  | 'trade'
  | 'roster'
  | 'automation'
  | 'import'
  | 'notification'
  | 'cron'
  | 'queue'

export type LeagueEngineLogEvent = {
  subsystem: LeagueEngineSubsystem
  action: string
  leagueId?: string
  durationMs?: number
  idempotencyKey?: string
  jobId?: string
  ok?: boolean
  error?: string
  extra?: Record<string, unknown>
}

export function logLeagueEngineEvent(event: LeagueEngineLogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    source: 'league_engine',
    ...event,
  }
  const line = JSON.stringify(payload)
  if (event.ok === false || event.error) {
    console.error(line)
  } else {
    console.log(line)
  }
}

export function createEngineTimer(): { elapsedMs: () => number } {
  const start = process.hrtime.bigint()
  return {
    elapsedMs: () => Number(process.hrtime.bigint() - start) / 1_000_000,
  }
}

/** Summarize a batch (e.g. waiver cron) without logging per league. */
export function logLeagueEngineBatchSummary(event: {
  subsystem: LeagueEngineSubsystem
  action: string
  processed: number
  failed?: number
  durationMs: number
  extra?: Record<string, unknown>
}): void {
  logLeagueEngineEvent({
    subsystem: event.subsystem,
    action: event.action,
    durationMs: event.durationMs,
    ok: (event.failed ?? 0) === 0,
    extra: {
      processed: event.processed,
      failed: event.failed ?? 0,
      ...event.extra,
    },
  })
}
