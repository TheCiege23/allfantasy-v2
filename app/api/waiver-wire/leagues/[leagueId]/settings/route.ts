import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEffectiveLeagueWaiverSettings, upsertLeagueWaiverSettings } from "@/lib/waiver-wire"

export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const [league, rosterAsMember] = await Promise.all([
    (prisma as any).league.findFirst({ where: { id: leagueId }, select: { id: true, sport: true, userId: true } }),
    (prisma as any).roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }),
  ])
  const hasAccess = league && (league.userId === userId || rosterAsMember)
  if (!hasAccess) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const settings = await getEffectiveLeagueWaiverSettings(leagueId)
  return NextResponse.json({ ...settings, sport: (league as { sport?: string })?.sport ?? null })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const league = await (prisma as any).league.findFirst({
    where: { id: leagueId, userId },
  })
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const settings = await upsertLeagueWaiverSettings(leagueId, {
    waiverType: body.waiverType ?? "standard",
    processingDayOfWeek: body.processingDayOfWeek,
    processingTimeUtc: body.processingTimeUtc,
    claimLimitPerPeriod: body.claimLimitPerPeriod,
    faabBudget: body.faabBudget,
    faabResetDate: body.faabResetDate,
    tiebreakRule: body.tiebreakRule,
    lockType: body.lockType,
    instantFaAfterClear: body.instantFaAfterClear,
  })
  return NextResponse.json(settings)
}
