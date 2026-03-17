import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { applyModerationAction, MODERATION_ACTION_TYPES } from "@/lib/moderation"
import type { ModerationActionType } from "@/lib/moderation"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res
  const userId = params.userId
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const actionType = (body.actionType as string)?.trim()
  if (!actionType || !MODERATION_ACTION_TYPES.includes(actionType as ModerationActionType)) {
    return NextResponse.json(
      { error: "actionType must be one of: " + MODERATION_ACTION_TYPES.join(", ") },
      { status: 400 }
    )
  }
  const reason = (body.reason as string)?.trim() || null
  let expiresAt: Date | null = null
  if (body.expiresAt) {
    const t = new Date(body.expiresAt)
    if (Number.isFinite(t.getTime())) expiresAt = t
  }
  const created = await applyModerationAction({
    userId,
    actionType: actionType as ModerationActionType,
    reason,
    expiresAt,
    createdByUserId: gate.user.id,
  })
  if (!created) return NextResponse.json({ error: "Failed to apply action" }, { status: 500 })
  return NextResponse.json(created)
}
