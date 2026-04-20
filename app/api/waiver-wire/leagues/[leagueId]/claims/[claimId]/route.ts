import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateClaim, cancelClaim } from "@/lib/waiver-wire"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { leagueId: string; claimId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const roster = await (prisma as any).roster.findFirst({
    where: { leagueId: params.leagueId, platformUserId: userId },
  })
  if (!roster) return NextResponse.json({ error: "Roster not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  try {
    const updated = await updateClaim(params.claimId, params.leagueId, roster.id, {
      addPlayerId: body.addPlayerId,
      dropPlayerId: body.dropPlayerId,
      faabBid: body.faabBid,
      priorityOrder: body.priorityOrder,
    })
    if (!updated) return NextResponse.json({ error: "Claim not found or not pending" }, { status: 404 })
    return NextResponse.json({ claim: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update claim"
    if (message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 423 })
    }
    throw e
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { leagueId: string; claimId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const roster = await (prisma as any).roster.findFirst({
    where: { leagueId: params.leagueId, platformUserId: userId },
  })
  if (!roster) return NextResponse.json({ error: "Roster not found" }, { status: 404 })

  try {
    const ok = await cancelClaim(params.claimId, params.leagueId, roster.id)
    if (!ok) return NextResponse.json({ error: "Claim not found or not pending" }, { status: 404 })
    return NextResponse.json({ status: "ok" })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to cancel claim"
    if (message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 423 })
    }
    throw e
  }
}
