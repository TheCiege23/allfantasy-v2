import { NextResponse } from "next/server"

import { writeAutomationAuditLog } from "@/lib/automation/audit"
import { toErrorMessage } from "@/lib/automation/errors"
import { discoverDueWaiverLeagues } from "@/lib/automation/jobs/waivers/discoverDueWaiverLeagues"
import { processLeagueWaiversJob } from "@/lib/automation/jobs/waivers/processLeagueWaiversJob"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * GET /api/cron/waivers
 * Auth: `Authorization: Bearer ${CRON_SECRET}`.
 * Non-production: `?secret=${CRON_SECRET}` allowed for local smoke tests (omit in production callers).
 *
 * Reuses discovery + `processLeagueWaiversJob` → `processWaiverClaimsForLeague` (`lib/waiver-wire/process-engine.ts`).
 */
function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const auth = request.headers.get("authorization")
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null
  if (bearer && bearer === secret) return true

  if (process.env.NODE_ENV !== "production") {
    const q = new URL(request.url).searchParams.get("secret")
    if (q && q === secret) return true
  }

  return false
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "true"
  const leagueId = url.searchParams.get("leagueId") ?? undefined
  const limitRaw = url.searchParams.get("limit")
  const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw) || 25)) : 25

  const discoveredRows = await discoverDueWaiverLeagues({
    limit,
    leagueId,
    now: new Date(),
  })

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      discovered: discoveredRows.length,
      processed: 0,
      failed: 0,
      results: discoveredRows.map((d) => ({
        leagueId: d.leagueId,
        pendingClaimCount: d.pendingClaimCount,
        scheduledFor: d.scheduledFor.toISOString(),
        waiverType: d.waiverType,
        metadata: d.metadata,
      })),
    })
  }

  const results: Array<Record<string, unknown>> = []
  let processed = 0
  let failed = 0

  for (const row of discoveredRows) {
    try {
      const out = await processLeagueWaiversJob({
        leagueId: row.leagueId,
        scheduledFor: row.scheduledFor,
        trigger: "cron",
      })
      results.push({
        leagueId: row.leagueId,
        ok: out.ok,
        automationJobId: out.automationJobId,
        summary: out.summary,
        message: out.message,
      })
      if (out.ok) processed += 1
      else failed += 1
    } catch (error: unknown) {
      failed += 1
      const safe =
        process.env.NODE_ENV === "production"
          ? "processing_failed"
          : toErrorMessage(error)
      results.push({
        leagueId: row.leagueId,
        ok: false,
        error: safe,
      })
      await writeAutomationAuditLog({
        leagueId: row.leagueId,
        action: "waivers.cron.league_failed",
        entityType: "league",
        entityId: row.leagueId,
        message: toErrorMessage(error),
      }).catch(() => {})
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    dryRun: false,
    discovered: discoveredRows.length,
    processed,
    failed,
    results,
  })
}
