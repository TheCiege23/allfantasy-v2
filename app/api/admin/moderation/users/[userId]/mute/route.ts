import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { removeMute } from "@/lib/moderation"

export const dynamic = "force-dynamic"

export async function DELETE(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const userId = params.userId
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const ok = await removeMute(userId)
  if (!ok) return NextResponse.json({ error: "No active mute found or failed to remove" }, { status: 400 })
  return NextResponse.json({ ok: true, message: "User unmuted" })
}
