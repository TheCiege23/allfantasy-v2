import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireVerifiedUser } from "@/lib/auth-guard"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const leagueId = url.searchParams.get("leagueId") || ""

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId" }, { status: 400 })
  }

  const events = await prisma.activityEvent.findMany({
    where: { leagueId },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return NextResponse.json({
    ok: true,
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      createdAt: e.createdAt,
      metadata: e.metadata,
    })),
  })
}

