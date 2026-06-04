import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import {
  getStripeWebhookHealth,
  getTokenLedgerHealth,
} from "@/lib/admin/paymentHealthQueries"
import {
  getRunVolume,
  getProviderErrorRate,
  getCacheHitRatio,
  getAvgPromptSize,
  getTopRisksFrequency,
  getFeedbackSummary,
  getCardSentiment,
} from "@/lib/chimmy-context/telemetry/healthQueries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SHORT_HOURS = 24
const LONG_HOURS = 168

export async function GET(request: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const [
    stripeWebhookHealth,
    tokenLedgerHealth,
    runVolumeShort,
    runVolumeLong,
    errorRateShort,
    errorRateLong,
    cacheHitShort,
    cacheHitLong,
    avgPromptSize,
    topRisks,
    feedback,
    cardSentiment,
  ] = await Promise.all([
    getStripeWebhookHealth(LONG_HOURS),
    getTokenLedgerHealth(LONG_HOURS),
    getRunVolume(SHORT_HOURS),
    getRunVolume(LONG_HOURS),
    getProviderErrorRate(SHORT_HOURS),
    getProviderErrorRate(LONG_HOURS),
    getCacheHitRatio(SHORT_HOURS),
    getCacheHitRatio(LONG_HOURS),
    getAvgPromptSize(LONG_HOURS),
    getTopRisksFrequency(LONG_HOURS),
    getFeedbackSummary(LONG_HOURS),
    getCardSentiment(LONG_HOURS),
  ])

  const ok = stripeWebhookHealth.ok && tokenLedgerHealth.ok

  return NextResponse.json({
    ok,
    accepted: true,
    generatedAt: new Date().toISOString(),
    windows: { short: SHORT_HOURS, long: LONG_HOURS },
    stripeWebhookHealth,
    tokenLedgerHealth,
    chimmyTelemetry: {
      runVolume: {
        short: runVolumeShort,
        long: runVolumeLong,
      },
      providerErrorRate: {
        short: errorRateShort,
        long: errorRateLong,
      },
      cacheHitRatio: {
        short: cacheHitShort,
        long: cacheHitLong,
      },
      avgPromptSize,
      topRisks,
      feedback,
      cardSentiment,
    },
  })
}
