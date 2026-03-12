import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireVerifiedUser } from "@/lib/auth-guard"

export const runtime = "nodejs"

function getMaxEntriesPerUser(scoringRules: Record<string, unknown> | null | undefined): number {
  const value = Number(scoringRules?.maxEntriesPerUser ?? 1)
  if (!Number.isFinite(value)) return 1
  return Math.min(25, Math.max(1, value))
}

function normalizeTiebreakerPoints(input: unknown): number | null {
  if (input == null || input === "") return null
  const value = Number(input)
  if (!Number.isFinite(value)) return null
  return Math.min(400, Math.max(0, Math.round(value)))
}

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const leagueId = String(body?.leagueId || "")
  const name = String(body?.name || "").trim()
  const requestedTiebreakerPoints = normalizeTiebreakerPoints(body?.tiebreakerPoints)

  if (!leagueId) {
    return NextResponse.json({ error: "MISSING_LEAGUE_ID" }, { status: 400 })
  }

  if (!name) {
    return NextResponse.json({ error: "MISSING_NAME" }, { status: 400 })
  }

  const member = await (prisma as any).bracketLeagueMember.findUnique({
    where: {
      leagueId_userId: { leagueId, userId: auth.userId },
    },
    select: { leagueId: true },
  }).catch(() => null)

  if (!member) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const league = await (prisma as any).bracketLeague.findUnique({
    where: { id: leagueId },
    select: {
      tournamentId: true,
      scoringRules: true,
      ownerId: true,
      tournament: { select: { lockAt: true } },
    },
  })

  if (!league) {
    return NextResponse.json({ error: "LEAGUE_NOT_FOUND" }, { status: 404 })
  }

  const lockAt = league.tournament?.lockAt
  if (lockAt && new Date(lockAt) <= new Date()) {
    return NextResponse.json(
      {
        error: "BRACKET_LOCKED",
        message: "Brackets are locked. The tournament has already started.",
      },
      { status: 409 }
    )
  }

  const scoringRules = (league.scoringRules || {}) as Record<string, unknown>
  const maxEntriesPerUser = getMaxEntriesPerUser(scoringRules)

  const count = await (prisma as any).bracketEntry.count({
    where: { leagueId, userId: auth.userId },
  })

  if (count >= maxEntriesPerUser) {
    return NextResponse.json(
      {
        error: "ENTRY_LIMIT_REACHED",
        message: `You can only create up to ${maxEntriesPerUser} entr${maxEntriesPerUser === 1 ? "y" : "ies"} in this pool.`,
      },
      { status: 409 }
    )
  }

  const tiebreakerEnabled = Boolean(scoringRules?.tiebreakerEnabled)
  const entry = await (prisma as any).bracketEntry.create({
    data: {
      leagueId,
      userId: auth.userId,
      name,
      status: "DRAFT",
      tiebreakerPoints: tiebreakerEnabled ? requestedTiebreakerPoints : null,
    },
    select: { id: true, tiebreakerPoints: true },
  })

  return NextResponse.json({
    ok: true,
    entryId: entry.id,
    tournamentId: league.tournamentId,
    entryCountForUser: count + 1,
    maxEntriesPerUser,
    tiebreakerPoints: entry.tiebreakerPoints,
  })
}
