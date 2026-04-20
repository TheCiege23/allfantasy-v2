import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processWaiverClaimsForLeague } from "@/lib/waiver-wire/process-engine"
import { logAction } from "@/server/services/auditService"
import { assertLeagueActionGate } from "@/server/services/leagueActionGate"

/**
 * POST: run waiver processing for the league (cron or commissioner).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  const leagueId = params.leagueId

  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const cronSecret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams?.get("cronSecret")
  const isCron = cronSecret === process.env.CRON_SECRET

  if (!isCron) {
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const gate = await assertLeagueActionGate(leagueId, userId, "waiver_process_run")
    if (!gate.ok) {
      return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
    }
  }

  const isOwnerTrigger = Boolean(userId && league.userId === userId)
  const results = await processWaiverClaimsForLeague(leagueId, {
    runType: isOwnerTrigger ? "manual" : "scheduled",
    processedByUserId: isOwnerTrigger ? userId : null,
  })

  if (!isCron && userId) {
    void logAction({
      leagueId,
      userId,
      actionType: "waiver_process_run",
      entityType: "waiver",
      entityId: leagueId,
      afterState: { processed: results.length },
    }).catch(() => {})
  }

  void import("@/lib/league-events/publisher").then(({ publishLeagueFanoutEvent }) =>
    publishLeagueFanoutEvent({
      leagueId,
      eventType: "waiver_processed",
      title: "Waivers processed",
      message:
        results.length > 0
          ? `Waiver run completed (${results.length} claim(s) resolved).`
          : "Waiver run completed; no pending claims to process.",
      category: "league_announcements",
      visibility: "all_members",
      actorUserId: userId ?? null,
      meta: { processedCount: results.length },
      skipNotifications: results.length === 0,
    }).catch(() => {}),
  )

  return NextResponse.json({ status: "ok", processed: results.length, results })
}
