import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createClaim,
  getClaimsByRoster,
  getPendingClaims,
  getProcessedClaimsAndTransactions,
} from "@/lib/waiver-wire"
import { validateAiActionExecution } from '@/lib/ai/action-validation'

export async function GET(
  req: NextRequest,
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
  if (!leagueAsOwner && !rosterAsMember) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const type = req.nextUrl.searchParams.get("type") || "pending"
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50")))

  if (type === "history") {
    const { claims, transactions } = await getProcessedClaimsAndTransactions(leagueId, limit)
    return NextResponse.json({ claims, transactions })
  }

  const pending = await getPendingClaims(leagueId)
  return NextResponse.json({ claims: pending })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const roster = await (prisma as any).roster.findFirst({
    where: { leagueId, platformUserId: userId },
  })
  if (!roster) return NextResponse.json({ error: "Roster not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  const aiValidation = validateAiActionExecution({
    body,
    action: 'add_waiver_claim',
    leagueId,
  })
  if (!aiValidation.ok) {
    return NextResponse.json({ error: aiValidation.error }, { status: aiValidation.status })
  }

  const addPlayerId = body.addPlayerId ?? body.add_player_id
  if (!addPlayerId) return NextResponse.json({ error: "addPlayerId required" }, { status: 400 })

  const pending = await getClaimsByRoster(roster.id, "pending")
  if (pending.some((c: { addPlayerId: string }) => c.addPlayerId === String(addPlayerId))) {
    return NextResponse.json(
      { error: "You already have a pending claim for this player." },
      { status: 409 }
    )
  }

  try {
    const claim = await createClaim(leagueId, roster.id, {
      addPlayerId: String(addPlayerId),
      dropPlayerId: body.dropPlayerId ?? body.drop_player_id ?? null,
      faabBid: body.faabBid ?? body.faab_bid ?? null,
      priorityOrder: body.priorityOrder ?? body.priority_order,
    })
    return NextResponse.json({ claim })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create claim"
    if (message.includes("does not belong to this league") || message.includes("Roster not found")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (message.includes("eliminated")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    throw e
  }
}
