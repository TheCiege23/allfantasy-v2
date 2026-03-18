/**
 * Cron: run weekly summary email flow (PROMPT 302).
 * Secured by x-cron-secret or x-admin-secret (CRON_SECRET, BRACKET_ADMIN_SECRET, ADMIN_PASSWORD).
 * Call weekly (e.g. Monday 9 AM) from Vercel Cron or external scheduler.
 */

import { NextResponse } from "next/server"
import { runWeeklySummaryFlow } from "@/lib/email-growth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function requireCron(req: Request): boolean {
  const provided =
    req.headers.get("x-cron-secret") ?? req.headers.get("x-admin-secret") ?? ""
  const cronSecret = process.env.CRON_SECRET
  const adminSecret =
    process.env.BRACKET_ADMIN_SECRET ?? process.env.ADMIN_PASSWORD
  return !!(
    provided &&
    ((cronSecret && provided === cronSecret) ||
      (adminSecret && provided === adminSecret))
  )
}

export async function POST(req: Request) {
  if (!requireCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const limit =
      typeof body.limit === "number" && body.limit > 0
        ? Math.min(body.limit, 1000)
        : 500
    const lookbackDays =
      typeof body.lookbackDays === "number" && body.lookbackDays > 0
        ? body.lookbackDays
        : 7

    const result = await runWeeklySummaryFlow({
      lookbackDays,
      limit,
    })

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.slice(0, 20),
    })
  } catch (e) {
    console.error("[cron/email-weekly] error:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}
