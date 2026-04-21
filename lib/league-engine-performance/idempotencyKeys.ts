/**
 * Stable idempotency key builders for league-engine background work.
 * Use these for cron, BullMQ jobIds, and deduplicated processing — not for client-generated keys unless documented.
 */

/** Minute-bucket key so overlapping cron invocations in the same UTC minute skip duplicate waiver runs per league. */
export function buildWaiverCronIdempotencyKey(leagueId: string, at: Date = new Date()): string {
  const iso = at.toISOString()
  const minute = iso.slice(0, 16)
  return `cron:waiver:${leagueId}:${minute}`
}

/** Scoring batch: one key per league per season-week bucket. */
export function buildScoringJobIdempotencyKey(
  leagueId: string,
  season: number,
  weekOrRound: number,
  at: Date = new Date(),
): string {
  const minute = at.toISOString().slice(0, 16)
  return `job:scoring:${leagueId}:${season}:w${weekOrRound}:${minute}`
}

/** Specialty automation — prefer DB `SpecialtyAutomationRun.idempotencyKey` uniqueness; this is for enqueue-only flows. */
export function buildSpecialtyAutomationEnqueueKey(
  leagueId: string,
  concept: string,
  triggerType: string,
  window: string,
): string {
  return `auto:${leagueId}:${concept}:${triggerType}:${window}`
}

/** Import resync — pair with `persistImportWithCanonicalAudit` keys when enqueueing. */
export function buildImportResyncEnqueueKey(leagueId: string, batchFingerprint: string): string {
  return `import:resync:${leagueId}:${batchFingerprint}`
}

/** Draft pick submission — one logical key per league + overall pick (guards double-submit). */
export function buildDraftPickIdempotencyKey(
  leagueId: string,
  overallPick: number,
  at: Date = new Date(),
): string {
  const minute = at.toISOString().slice(0, 16)
  return `draft:pick:${leagueId}:o${overallPick}:${minute}`
}

/** Trade processing / acceptance — scope to proposal id when available. */
export function buildTradeProcessIdempotencyKey(leagueId: string, proposalId: string): string {
  return `trade:${leagueId}:${proposalId}`
}

/** Matchup center GET dedupe / short cache — viewer-scoped. */
export function buildMatchupCenterCacheKey(
  leagueId: string,
  season: number,
  week: number,
  viewerUserId: string,
): string {
  return `matchup:center:${leagueId}:${season}:w${week}:u${viewerUserId}`
}

/** Notification inbox unread count polling — optional minute bucket for cron. */
export function buildNotificationCountKey(userId: string, at: Date = new Date()): string {
  const minute = at.toISOString().slice(0, 16)
  return `notif:count:${userId}:${minute}`
}

/** AI matchup / start-sit refresh — throttle duplicate enqueue for same league+week. */
export function buildAiMatchupRefreshEnqueueKey(leagueId: string, week: number, surface: string): string {
  return `ai:matchup:${leagueId}:w${week}:${surface}`
}
