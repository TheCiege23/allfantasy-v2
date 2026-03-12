import { NextResponse } from "next/server"
import { requireVerifiedUser } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const leagueId = String(body.leagueId || "")
  const challengerEntryId = String(body.challengerEntryId || "")
  const challengedEntryId = String(body.challengedEntryId || "")

  if (!leagueId || !challengerEntryId || !challengedEntryId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (challengerEntryId === challengedEntryId) {
    return NextResponse.json({ error: "Cannot challenge your own bracket" }, { status: 400 })
  }

  const [challenger, challenged] = await Promise.all([
    prisma.bracketEntry.findUnique({
      where: { id: challengerEntryId },
      select: { id: true, userId: true, leagueId: true },
    }),
    prisma.bracketEntry.findUnique({
      where: { id: challengedEntryId },
      select: { id: true, userId: true, leagueId: true },
    }),
  ])

  if (!challenger || !challenged) {
    return NextResponse.json({ error: "Entries not found" }, { status: 404 })
  }
  if (challenger.userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (challenger.leagueId !== leagueId || challenged.leagueId !== leagueId) {
    return NextResponse.json({ error: "Entries must be in same league" }, { status: 400 })
  }

  const existing = await prisma.bracketChallenge.findFirst({
    where: {
      leagueId,
      challengerEntryId,
      challengedEntryId,
      status: { in: ["pending", "accepted"] },
    },
  })
  if (existing) {
    return NextResponse.json({ ok: true, challengeId: existing.id, status: existing.status })
  }

  const challenge = await prisma.bracketChallenge.create({
    data: {
      leagueId,
      challengerEntryId,
      challengedEntryId,
      status: "pending",
    },
  })

  await prisma.activityEvent.create({
    data: {
      leagueId,
      entryId: challengerEntryId,
      userId: auth.userId,
      type: "bracket_challenge_sent",
      message: "Bracket challenge sent.",
      metadata: { challengerEntryId, challengedEntryId },
    },
  }).catch(() => {})

  return NextResponse.json({ ok: true, challengeId: challenge.id, status: challenge.status })
}

