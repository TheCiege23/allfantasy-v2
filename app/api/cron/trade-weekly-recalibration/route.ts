/**
 * GET/POST /api/cron/trade-weekly-recalibration
 *
 * Vercel Cron schedule: weekly (see vercel.json). Disabled by default —
 * calls runScheduledWeeklyRecalibration(), which no-ops unless
 * TRADE_ENGINE_WEEKLY_RECALIBRATION_ENABLED=true. See
 * docs/TRADE_LEARNING_CALIBRATED_B0_OWNERSHIP_ADR.md and
 * docs/DECISION_OS_CLOSED_LOOP_LEARNING_AUDIT.md §7 Step 0.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { runScheduledWeeklyRecalibration } from "@/lib/trade-engine/auto-recalibration"

export const dynamic = "force-dynamic"
export const maxDuration = 120

async function handle() {
  const startedAt = Date.now()
  try {
    const outcome = await runScheduledWeeklyRecalibration()
    return NextResponse.json({
      ok: true,
      ran: outcome.ran,
      reason: outcome.reason,
      durationMs: Date.now() - startedAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[cron/trade-weekly-recalibration] failed:", message)
    return NextResponse.json(
      { ok: false, error: message.slice(0, 240), durationMs: Date.now() - startedAt },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return handle()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return handle()
}
