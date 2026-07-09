import { NextResponse } from "next/server"

import {
  captureLeagueSnapshotJob,
  captureLeagueSnapshotsBatchJob,
} from "@/lib/decision-os/snapshot/captureLeagueSnapshotJob"
import { createDefaultBehavioralSnapshotStore } from "@/lib/decision-os/snapshot/prismaBehavioralSnapshotStore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET /api/cron/decision-os-snapshot-capture
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (identical pattern to `app/api/cron/waivers/route.ts`).
 * Non-production: `?secret=${CRON_SECRET}` allowed for local smoke tests.
 *
 * Commissioner OS Surface Alignment — Phase B Increment 4. Captures the already-built Decision OS
 * behavioral snapshot (Phase A Increment 5's writer) for one or more EXPLICITLY named leagues —
 * deliberately not a platform-wide "discover every league" job, which is a separate, larger scope
 * decision. Pass `?leagueId=<id>` for a single league (on-demand verification) or
 * `?leagueIds=<id1>,<id2>,...` for an explicit batch.
 *
 * Not registered in `vercel.json` — this route exists and is fully authorized/testable, but is not
 * scheduled to run automatically. Wiring it into a cron schedule is a separate, deliberate
 * deployment decision (see docs/os/COMMISSIONER_OS_SURFACE_ALIGNMENT.md §4d).
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

function parseLeagueIds(url: URL): string[] {
  const leagueIds = url.searchParams.get("leagueIds")
  if (leagueIds) {
    return leagueIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  }
  const leagueId = url.searchParams.get("leagueId")
  return leagueId ? [leagueId.trim()].filter(Boolean) : []
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "true"
  const leagueIds = parseLeagueIds(url)

  if (leagueIds.length === 0) {
    return NextResponse.json({ ok: false, error: "no_leagues_specified" }, { status: 400 })
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      discovered: leagueIds.length,
      processed: 0,
      failed: 0,
      results: leagueIds.map((leagueId) => ({ leagueId })),
    })
  }

  const store = createDefaultBehavioralSnapshotStore()
  if (!store) {
    return NextResponse.json({ ok: false, error: "snapshot_store_unavailable" }, { status: 503 })
  }

  if (leagueIds.length === 1) {
    const result = await captureLeagueSnapshotJob(leagueIds[0], { store })
    return NextResponse.json({
      ok: result.ok,
      dryRun: false,
      discovered: 1,
      processed: result.ok ? 1 : 0,
      failed: result.ok ? 0 : 1,
      results: [result],
    })
  }

  const { ok, results } = await captureLeagueSnapshotsBatchJob(leagueIds, { store })
  const failedCount = results.filter((r) => !r.ok).length
  return NextResponse.json({
    ok,
    dryRun: false,
    discovered: leagueIds.length,
    processed: leagueIds.length - failedCount,
    failed: failedCount,
    results,
  })
}
