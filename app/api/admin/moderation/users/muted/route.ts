import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const now = new Date()
  const rows = await prisma.platformModerationAction.findMany({
    where: {
      actionType: "mute",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  })
  const userIds = [...new Set(rows.map((r) => r.userId))]
  const users = await prisma.appUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, username: true },
  })
  const byId = new Map(users.map((u) => [u.id, u]))
  const list = userIds.map((userId) => {
    const u = byId.get(userId)
    const action = rows.find((r) => r.userId === userId)
    return {
      userId,
      email: u?.email ?? null,
      username: u?.username ?? null,
      mutedAt: action?.createdAt ?? null,
      expiresAt: action?.expiresAt ?? null,
    }
  })
  return NextResponse.json({ muted: list })
}
