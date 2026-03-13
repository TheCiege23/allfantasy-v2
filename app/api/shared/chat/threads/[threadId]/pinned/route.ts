import { NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { getPlatformThreadMessages } from "@/lib/platform/chat-service"

/**
 * GET /api/shared/chat/threads/[threadId]/pinned
 * Returns messages that are pin-type (messageType === 'pin') for the thread.
 * Pinned refs are stored as typed messages with body JSON { messageId }.
 */
export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const all = await getPlatformThreadMessages(user.appUserId, threadId, 100)
  const pinned = all.filter((m) => m.messageType === "pin")

  return NextResponse.json({ status: "ok", pinned })
}
