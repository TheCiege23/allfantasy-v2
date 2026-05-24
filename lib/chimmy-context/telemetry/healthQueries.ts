/**
 * Phase 5 — Chimmy intelligence telemetry health query helpers.
 *
 * Pure, read-only Prisma-backed helpers that summarize the
 * `chimmy_context_runs` and `chimmy_intelligence_feedback` tables. Designed
 * to be called from internal/admin diagnostics surfaces ONLY — not from
 * user-facing routes.
 *
 * Each helper:
 *   - Accepts a window-hours argument (default 1 or 24 per metric).
 *   - Uses parameterized `prisma.$queryRaw` so windows are not strings.
 *   - Returns a plain object so the shape is stable for consumers.
 *   - Never throws — failures resolve to `{ ok: false, error }`.
 *
 * NOTE: No admin UI is wired yet. These helpers are intentionally left
 * un-mounted so the rollout slice stays small. Wire them up in a future
 * phase behind `requireAdmin()`.
 */

import { prisma } from "@/lib/prisma"

type QueryOk<T> = { ok: true; data: T }
type QueryErr = { ok: false; error: string }
export type QueryResult<T> = QueryOk<T> | QueryErr

function clampHours(windowHours: number, fallback: number): number {
  const n = Number(windowHours)
  if (!Number.isFinite(n) || n <= 0) return fallback
  if (n > 24 * 30) return 24 * 30
  return Math.floor(n)
}

function err(error: unknown): QueryErr {
  const message =
    error instanceof Error ? error.message.slice(0, 200) : "query_failed"
  return { ok: false, error: message }
}

// ─── Run-rate / volume ───────────────────────────────────────────────────────

export async function getRunVolume(
  windowHours = 1
): Promise<QueryResult<{ windowHours: number; total: number; bySurface: Array<{ surface: string; count: number }> }>> {
  const hours = clampHours(windowHours, 1)
  try {
    const rows = await prisma.$queryRaw<Array<{ surface: string; count: bigint }>>`
      SELECT "surface", COUNT(*)::bigint AS count
      FROM "chimmy_context_runs"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
      GROUP BY "surface"
      ORDER BY count DESC
    `
    const bySurface = rows.map((r) => ({ surface: r.surface, count: Number(r.count) }))
    const total = bySurface.reduce((a, b) => a + b.count, 0)
    return { ok: true, data: { windowHours: hours, total, bySurface } }
  } catch (e) {
    return err(e)
  }
}

// ─── Error rates ─────────────────────────────────────────────────────────────

export async function getProviderErrorRate(
  windowHours = 1
): Promise<QueryResult<{ windowHours: number; runs: number; runsWithFailure: number; ratio: number }>> {
  const hours = clampHours(windowHours, 1)
  try {
    const rows = await prisma.$queryRaw<Array<{ runs: bigint; failed: bigint }>>`
      SELECT
        COUNT(*)::bigint                                        AS runs,
        COUNT(*) FILTER (WHERE "providerFailureCount" > 0)::bigint AS failed
      FROM "chimmy_context_runs"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
    `
    const row = rows[0] ?? { runs: 0n, failed: 0n }
    const runs = Number(row.runs)
    const runsWithFailure = Number(row.failed)
    const ratio = runs > 0 ? runsWithFailure / runs : 0
    return { ok: true, data: { windowHours: hours, runs, runsWithFailure, ratio } }
  } catch (e) {
    return err(e)
  }
}

// ─── Cache hit ratio ─────────────────────────────────────────────────────────

export async function getCacheHitRatio(
  windowHours = 1
): Promise<QueryResult<{ windowHours: number; runs: number; runsWithCacheHit: number; ratio: number }>> {
  const hours = clampHours(windowHours, 1)
  try {
    const rows = await prisma.$queryRaw<Array<{ runs: bigint; hits: bigint }>>`
      SELECT
        COUNT(*)::bigint                                       AS runs,
        COUNT(*) FILTER (WHERE "cacheHitCount" > 0)::bigint   AS hits
      FROM "chimmy_context_runs"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
    `
    const row = rows[0] ?? { runs: 0n, hits: 0n }
    const runs = Number(row.runs)
    const runsWithCacheHit = Number(row.hits)
    const ratio = runs > 0 ? runsWithCacheHit / runs : 0
    return { ok: true, data: { windowHours: hours, runs, runsWithCacheHit, ratio } }
  } catch (e) {
    return err(e)
  }
}

// ─── Prompt size ─────────────────────────────────────────────────────────────

export async function getAvgPromptSize(
  windowHours = 24
): Promise<QueryResult<{ windowHours: number; samples: number; avgChars: number; p95Chars: number }>> {
  const hours = clampHours(windowHours, 24)
  try {
    const rows = await prisma.$queryRaw<Array<{ samples: bigint; avg: number | null; p95: number | null }>>`
      SELECT
        COUNT(*)::bigint                                                 AS samples,
        AVG("approxPromptChars")::float                                  AS avg,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "approxPromptChars")::float AS p95
      FROM "chimmy_context_runs"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
        AND "approxPromptChars" IS NOT NULL
    `
    const row = rows[0] ?? { samples: 0n, avg: 0, p95: 0 }
    return {
      ok: true,
      data: {
        windowHours: hours,
        samples: Number(row.samples),
        avgChars: Math.round(row.avg ?? 0),
        p95Chars: Math.round(row.p95 ?? 0),
      },
    }
  } catch (e) {
    return err(e)
  }
}

// ─── Top risks / urgency frequency ───────────────────────────────────────────

export async function getTopRisksFrequency(
  windowHours = 24,
  topN = 10
): Promise<QueryResult<{ windowHours: number; rows: Array<{ topRisk: string; count: number }> }>> {
  const hours = clampHours(windowHours, 24)
  const n = Math.max(1, Math.min(50, Math.floor(topN)))
  try {
    const rows = await prisma.$queryRaw<Array<{ topRisk: string; count: bigint }>>`
      SELECT "topRisk", COUNT(*)::bigint AS count
      FROM "chimmy_context_runs"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
        AND "topRisk" IS NOT NULL
      GROUP BY "topRisk"
      ORDER BY count DESC
      LIMIT ${n}::int
    `
    return {
      ok: true,
      data: {
        windowHours: hours,
        rows: rows.map((r) => ({ topRisk: r.topRisk, count: Number(r.count) })),
      },
    }
  } catch (e) {
    return err(e)
  }
}

// ─── Feedback summary ────────────────────────────────────────────────────────

export async function getFeedbackSummary(
  windowHours = 24
): Promise<QueryResult<{ windowHours: number; rows: Array<{ eventType: string; count: number }> }>> {
  const hours = clampHours(windowHours, 24)
  try {
    const rows = await prisma.$queryRaw<Array<{ eventType: string; count: bigint }>>`
      SELECT "eventType", COUNT(*)::bigint AS count
      FROM "chimmy_intelligence_feedback"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
      GROUP BY "eventType"
      ORDER BY count DESC
    `
    return {
      ok: true,
      data: {
        windowHours: hours,
        rows: rows.map((r) => ({ eventType: r.eventType, count: Number(r.count) })),
      },
    }
  } catch (e) {
    return err(e)
  }
}

// ─── Per-card sentiment ──────────────────────────────────────────────────────

export async function getCardSentiment(
  windowHours = 24
): Promise<QueryResult<{ windowHours: number; rows: Array<{ cardId: string; up: number; down: number; ratio: number }> }>> {
  const hours = clampHours(windowHours, 24)
  try {
    const rows = await prisma.$queryRaw<Array<{ cardId: string; up: bigint; down: bigint }>>`
      SELECT
        "cardId",
        COUNT(*) FILTER (WHERE "eventType" = 'thumbs_up')::bigint   AS up,
        COUNT(*) FILTER (WHERE "eventType" = 'thumbs_down')::bigint AS down
      FROM "chimmy_intelligence_feedback"
      WHERE "createdAt" >= NOW() - (${hours}::int * INTERVAL '1 hour')
        AND "cardId" IS NOT NULL
        AND "eventType" IN ('thumbs_up', 'thumbs_down')
      GROUP BY "cardId"
      ORDER BY (up + down) DESC
    `
    return {
      ok: true,
      data: {
        windowHours: hours,
        rows: rows.map((r) => {
          const up = Number(r.up)
          const down = Number(r.down)
          const total = up + down
          return { cardId: r.cardId, up, down, ratio: total > 0 ? up / total : 0 }
        }),
      },
    }
  } catch (e) {
    return err(e)
  }
}
