import { NextRequest, NextResponse } from "next/server"
import { Queue } from "bullmq"

import { requireCronAuth } from "@/app/api/cron/_auth"
import type { IntegrityJobPayload } from "@/lib/jobs/types"
import { checkLeagueCommissionerEntitlement } from "@/lib/integrity/leagueEntitlement"
import { prisma } from "@/lib/prisma"
import { getRedisConnection, isRedisConfigured } from "@/lib/queues/bullmq"
import { QUEUE_NAMES } from "@/lib/jobs/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function resolveNflWeek(): number {
  const w = Number(process.env.CURRENT_NFL_WEEK ?? "12")
  if (Number.isFinite(w) && w >= 1 && w <= 22) return Math.floor(w)
  return 12
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const week = resolveNflWeek()
  const settingsRows = await prisma.leagueIntegritySettings.findMany({
    where: { tankingMonitorEnabled: true },
    select: { leagueId: true },
  })

  let queued = 0
  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: true, queued: 0, note: "redis_not_configured" })
  }
  const connection = getRedisConnection()
  if (!connection) {
    return NextResponse.json({ ok: true, queued: 0, note: "no_redis_connection" })
  }

  const queue = new Queue<IntegrityJobPayload>(QUEUE_NAMES.INTEGRITY, { connection })

  for (const row of settingsRows) {
    const entitled = await checkLeagueCommissionerEntitlement(row.leagueId)
    if (!entitled) continue
    await queue.add(
      "tanking_scan_week",
      {
        type: "tanking_scan_week",
        leagueId: row.leagueId,
        weekNumber: week,
      },
      { attempts: 2, backoff: { type: "exponential", delay: 15_000 } }
    )
    queued += 1
  }

  return NextResponse.json({ ok: true, queued, week })
}
