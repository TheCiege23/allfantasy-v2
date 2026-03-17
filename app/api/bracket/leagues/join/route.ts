import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireVerifiedUser } from "@/lib/auth-guard"
import { validateInviteCode, normalizeJoinCode } from "@/lib/league-invite"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const rawCode = body?.joinCode ?? body?.code
  if (!rawCode) return NextResponse.json({ error: "Missing joinCode" }, { status: 400 })

  const joinCode = normalizeJoinCode(rawCode)
  const validation = await validateInviteCode(joinCode, { userId: auth.userId })

  if (!validation.valid) {
    if (validation.error === "INVALID_CODE")
      return NextResponse.json({ error: "Invalid code" }, { status: 404 })
    if (validation.error === "EXPIRED")
      return NextResponse.json({ error: "Invite expired" }, { status: 410 })
    if (validation.error === "LEAGUE_FULL")
      return NextResponse.json({ error: "League is full" }, { status: 409 })
    if (validation.error === "ALREADY_MEMBER")
      return NextResponse.json({ error: "Already a member" }, { status: 409 })
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const leagueId = validation.preview.leagueId

  await (prisma as any).bracketLeagueMember.upsert({
    where: {
      leagueId_userId: {
        leagueId,
        userId: auth.userId,
      },
    },
    update: {},
    create: {
      leagueId,
      userId: auth.userId,
      role: "MEMBER",
    },
  })

  return NextResponse.json({ ok: true, leagueId })
}
