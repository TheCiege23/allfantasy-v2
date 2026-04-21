import { prisma } from '@/lib/prisma'
import { ANALYTICS_TOOL_ENGINE, ANALYTICS_TOOL_PRODUCT } from '@/lib/analytics/eventNames'

export type RecordAnalyticsEventArgs = {
  event: string
  toolKey?: string | null
  userId?: string | null
  sessionId?: string | null
  path?: string | null
  referrer?: string | null
  userAgent?: string | null
  meta?: Record<string, unknown> | null
}

/**
 * Persists one row to `AnalyticsEvent`. Safe to await; errors are logged, not thrown.
 */
export async function recordAnalyticsEvent(args: RecordAnalyticsEventArgs): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        event: args.event.slice(0, 512),
        toolKey: args.toolKey ?? ANALYTICS_TOOL_PRODUCT,
        userId: args.userId ?? null,
        sessionId: args.sessionId ?? null,
        path: args.path ?? null,
        referrer: args.referrer ?? null,
        userAgent: args.userAgent ?? null,
        meta: args.meta === undefined ? undefined : (args.meta as object),
      },
    })
  } catch (e) {
    console.warn('[analytics] recordAnalyticsEvent failed', args.event, e)
  }
}

export function recordAnalyticsEventAsync(args: RecordAnalyticsEventArgs): void {
  void recordAnalyticsEvent(args)
}

export function recordProductEvent(
  event: string,
  args?: Omit<RecordAnalyticsEventArgs, 'event' | 'toolKey'>
): void {
  recordAnalyticsEventAsync({ event, toolKey: ANALYTICS_TOOL_PRODUCT, ...args })
}

export function recordEngineEvent(
  event: string,
  args?: Omit<RecordAnalyticsEventArgs, 'event' | 'toolKey'>
): void {
  recordAnalyticsEventAsync({ event, toolKey: ANALYTICS_TOOL_ENGINE, ...args })
}

/** Sampled engine metrics to limit row volume (default 10% via env). */
export function shouldSampleEngineTelemetry(): boolean {
  const raw = process.env.AF_ANALYTICS_ENGINE_SAMPLE_RATE
  const r = raw === undefined || raw === '' ? 0.1 : Number(raw)
  if (!Number.isFinite(r) || r <= 0) return false
  if (r >= 1) return true
  return Math.random() < r
}

export function recordEngineTelemetrySample(
  event: string,
  args?: Omit<RecordAnalyticsEventArgs, 'event' | 'toolKey'>
): void {
  if (!shouldSampleEngineTelemetry()) return
  recordAnalyticsEventAsync({ event, toolKey: ANALYTICS_TOOL_ENGINE, ...args })
}
