import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getLeagueWaiverState } from "@/lib/waiver-wire/waiver-state-service"
import { getEffectiveLeagueWaiverSettings } from "@/lib/waiver-wire"

/**
 * League waiver snapshot: next run hint, priority order JSON, processing lock (for all members).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const [leagueAsOwner, rosterAsMember] = await Promise.all([
    (prisma as any).league.findFirst({ where: { id: leagueId, userId } }),
    (prisma as any).roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }),
  ])
  if (!leagueAsOwner && !rosterAsMember) {
    return NextResponse.json({ error: "League not found" }, { status: 404 })
  }

  const [state, settings] = await Promise.all([
    getLeagueWaiverState(leagueId),
    getEffectiveLeagueWaiverSettings(leagueId),
  ])

  return NextResponse.json({
    state,
    settings: {
      waiverType: settings.waiverType,
      processingDayOfWeek: settings.processingDayOfWeek,
      processingTimeUtc: settings.processingTimeUtc,
      processingDays: settings.processingDays,
      claimLimitPerWeek: settings.claimLimitPerWeek,
      claimLimitPerPeriod: settings.claimLimitPerPeriod,
      claimLimitPerRun: settings.claimLimitPerRun,
      nextRunAt: state?.nextRunAt ?? null,
      processingLocked: state?.processingLocked ?? false,
    },
  })
}
