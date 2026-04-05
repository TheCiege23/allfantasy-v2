import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { assertCommissioner } from "@/lib/commissioner/permissions"
import { prisma } from "@/lib/prisma"
import { requireEntitlement } from "@/lib/subscription/requireEntitlement"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; flagId: string }> }
) {
  const ent = await requireEntitlement("commissioner_integrity_monitoring")
  if (ent instanceof NextResponse) return ent
  const userId = ent

  const { leagueId, flagId } = await ctx.params
  if (!leagueId || !flagId) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  try {
    await assertCommissioner(leagueId, userId)
  } catch (e) {
    const st = (e as Error & { status?: number }).status ?? 403
    return NextResponse.json({ error: "Forbidden" }, { status: st })
  }

  let body: { status?: string; commissionerNote?: string }
  try {
    body = (await req.json()) as { status?: string; commissionerNote?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const status = body.status === "dismissed" || body.status === "escalated" ? body.status : null
  if (!status) return NextResponse.json({ error: "status must be dismissed or escalated" }, { status: 400 })

  const row = await prisma.integrityFlag.updateMany({
    where: { id: flagId, leagueId },
    data: {
      status,
      commissionerNote:
        typeof body.commissionerNote === "string" ? body.commissionerNote : undefined,
      commissionerUserId: userId,
      reviewedAt: new Date(),
    },
  })

  if (row.count === 0) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 })
  }

  const updated = await prisma.integrityFlag.findFirst({ where: { id: flagId, leagueId } })
  return NextResponse.json({ flag: updated })
}
