import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"
import { logAdminAudit } from "@/lib/admin-audit"

export const dynamic = "force-dynamic"

/**
 * DELETE: Permanently delete a league (admin only). Cascades to rosters, draft sessions, etc.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  const { leagueId } = await params
  if (!leagueId) return NextResponse.json({ error: "leagueId required" }, { status: 400 })

  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { id: true, name: true, sport: true, userId: true },
    })
    if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 })

    await prisma.league.delete({ where: { id: leagueId } })

    await logAdminAudit({
      adminUserId: gate.user.id ?? '',
      action: "delete_league",
      targetType: "league",
      targetId: leagueId,
      details: { name: league.name, sport: league.sport, ownerUserId: league.userId },
    })

    return NextResponse.json({ ok: true, message: "League deleted" })
  } catch (e) {
    console.error("[admin/leagues/delete]", e)
    return NextResponse.json({ error: "Failed to delete league" }, { status: 500 })
  }
}
