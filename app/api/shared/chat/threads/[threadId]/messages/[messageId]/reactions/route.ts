import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { addReactionToMessage } from "@/lib/platform/chat-service"

/**
 * POST: add an emoji reaction to a message.
 * Body: { emoji: string } (e.g. "👍", "😂")
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string; messageId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const messageId = decodeURIComponent(params.messageId)
  const body = await req.json().catch(() => ({}))
  const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : ""

  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  const ok = await addReactionToMessage(user.appUserId, threadId, messageId, emoji)
  if (!ok) return NextResponse.json({ error: "Could not add reaction" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}
