/**
 * League-engine job catalog: kinds, recommended BullMQ options, retry/dead-letter guidance.
 * Enqueue via `enqueueLeagueEngineJob` + `LeagueEngineJobPayload` in `lib/jobs/types.ts`.
 */

import type { LeagueEngineJobKind } from '@/lib/jobs/types'

/** Default BullMQ options for durable league-engine work (tune per deployment). */
export const DEFAULT_LEAGUE_ENGINE_QUEUE_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2500 },
  removeOnComplete: 200,
  removeOnFail: 1000,
} as const

const KIND_RETRY: Record<LeagueEngineJobKind, { notes: string; idempotency: string }> = {
  waiver_process: {
    notes: 'Must pass `buildWaiverCronIdempotencyKey` or run-specific key; duplicates return empty via waiver run metadata.',
    idempotency: 'Required per league per run window.',
  },
  scoring_week: {
    notes: 'Idempotent scoring writes should use stat line keys / week locks in scoring engine.',
    idempotency: 'Prefer `buildScoringJobIdempotencyKey` for enqueue dedupe.',
  },
  standings_refresh: {
    notes: 'Recompute from weekly scores; safe to retry if deterministic.',
    idempotency: 'Optional minute-bucket key.',
  },
  specialty_automation: {
    notes: 'Use `SpecialtyAutomationRun.idempotencyKey` unique constraint as source of truth.',
    idempotency: 'Required — match DB row.',
  },
  import_resync: {
    notes: 'Pair with import persistence idempotency; avoid parallel resync for same batch.',
    idempotency: 'Required — batch fingerprint.',
  },
  notification_fanout: {
    notes: 'Prefer notification dedupe keys; BullMQ jobId optional for fan-out batches.',
    idempotency: 'Per-recipient or batch key from product rules.',
  },
  stat_correction: {
    notes: 'Use `stat_reprocess_logs` / server stat correction idempotency.',
    idempotency: 'Required — league+season+week.',
  },
}

export function describeLeagueEngineJobKind(kind: LeagueEngineJobKind): (typeof KIND_RETRY)[LeagueEngineJobKind] {
  return KIND_RETRY[kind]
}
