/**
 * Automation entry points — call from cron, Inngest, or Vercel cron routes.
 * Keep work idempotent and short; delegate heavy lifting to queue workers.
 */

export const AI_OPPONENT_CRON_TAGS = {
  draftTick: "ai_opponents_draft_tick",
  waiverRun: "ai_opponents_waiver_run",
  lineupRun: "ai_opponents_lineup_run",
  tradeWindow: "ai_opponents_trade_window",
  inactiveScan: "ai_opponents_inactive_scan",
} as const

/**
 * Suggested schedules (UTC):
 * - Draft tick: every 15s while draft active (or use SSE-driven worker only)
 * - Waiver run: 5 min before league waiver process time
 * - Lineup: Tue 12:00 + Sun 11:00 (tune per sport)
 * - Trade window: daily
 * - Inactive scan: daily
 *
 * Implementation: POST `/api/ai/opponents/waivers/run` etc. with `CRON_SECRET` header
 * from a trusted scheduler only.
 */

export function buildCronAuthHeader(secret: string): HeadersInit {
  return { "x-cron-secret": secret }
}
