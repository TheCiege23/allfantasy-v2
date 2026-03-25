import { prisma } from "@/lib/prisma"
import type {
  SportsAlertLatencyStatus,
  SportsAlertLatencyTypeMetrics,
} from "./types"
import type { SportsAlertType } from "@/lib/sports-alerts"

const SPORTS_ALERT_TYPES: SportsAlertType[] = [
  "injury_alert",
  "performance_alert",
  "lineup_alert",
]

const DEFAULT_WINDOW_HOURS = 24
const MAX_WINDOW_HOURS = 24 * 7
const MAX_ALERT_ROWS = 1000

function normalizeWindowHours(windowHours?: number): number {
  if (!Number.isFinite(windowHours)) return DEFAULT_WINDOW_HOURS
  return Math.min(Math.max(Math.floor(windowHours as number), 1), MAX_WINDOW_HOURS)
}

function readLatencyMs(meta: unknown): number | null {
  if (!meta || typeof meta !== "object") return null
  const value = (meta as Record<string, unknown>).deliveryLatencyMs
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value)
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) return Math.round(parsed)
  }
  return null
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  if (values.length === 1) return Math.round(values[0])
  const idx = (values.length - 1) * p
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return Math.round(values[lower])
  const fraction = idx - lower
  return Math.round(values[lower] + (values[upper] - values[lower]) * fraction)
}

function summarize(values: number[]) {
  const sorted = values.slice().sort((a, b) => a - b)
  return {
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    maxMs: sorted.length > 0 ? sorted[sorted.length - 1] : null,
  }
}

function emptyByTypeMetrics(): SportsAlertLatencyTypeMetrics[] {
  return SPORTS_ALERT_TYPES.map((alertType) => ({
    alertType,
    totalAlerts: 0,
    sampledAlerts: 0,
    p50Ms: null,
    p95Ms: null,
    maxMs: null,
  }))
}

function buildEmptyStatus(windowHours: number): SportsAlertLatencyStatus {
  return {
    windowHours,
    totalAlerts: 0,
    sampledAlerts: 0,
    p50Ms: null,
    p95Ms: null,
    p99Ms: null,
    maxMs: null,
    lastAlertAt: null,
    byType: emptyByTypeMetrics(),
  }
}

export async function getSportsAlertLatency(windowHours?: number): Promise<SportsAlertLatencyStatus> {
  const normalizedWindow = normalizeWindowHours(windowHours)
  const start = new Date(Date.now() - normalizedWindow * 60 * 60 * 1000)
  const empty = buildEmptyStatus(normalizedWindow)

  try {
    const rows = await prisma.platformNotification.findMany({
      where: {
        type: { in: SPORTS_ALERT_TYPES },
        createdAt: { gte: start },
      },
      select: {
        type: true,
        createdAt: true,
        meta: true,
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ALERT_ROWS,
    })

    if (rows.length === 0) return empty

    const globalLatencies: number[] = []
    const byType = new Map<SportsAlertType, number[]>()
    const countsByType = new Map<SportsAlertType, number>()
    for (const type of SPORTS_ALERT_TYPES) {
      byType.set(type, [])
      countsByType.set(type, 0)
    }

    for (const row of rows) {
      const alertType = row.type as SportsAlertType
      if (!countsByType.has(alertType)) continue
      countsByType.set(alertType, (countsByType.get(alertType) ?? 0) + 1)

      const latency = readLatencyMs(row.meta)
      if (latency == null) continue
      globalLatencies.push(latency)
      byType.get(alertType)?.push(latency)
    }

    const summary = summarize(globalLatencies)
    const byTypeMetrics: SportsAlertLatencyTypeMetrics[] = SPORTS_ALERT_TYPES.map((alertType) => {
      const values = byType.get(alertType) ?? []
      const stats = summarize(values)
      return {
        alertType,
        totalAlerts: countsByType.get(alertType) ?? 0,
        sampledAlerts: values.length,
        p50Ms: stats.p50Ms,
        p95Ms: stats.p95Ms,
        maxMs: stats.maxMs,
      }
    })

    return {
      windowHours: normalizedWindow,
      totalAlerts: rows.length,
      sampledAlerts: globalLatencies.length,
      p50Ms: summary.p50Ms,
      p95Ms: summary.p95Ms,
      p99Ms: summary.p99Ms,
      maxMs: summary.maxMs,
      lastAlertAt: rows[0]?.createdAt?.toISOString?.() ?? null,
      byType: byTypeMetrics,
    }
  } catch {
    return empty
  }
}
