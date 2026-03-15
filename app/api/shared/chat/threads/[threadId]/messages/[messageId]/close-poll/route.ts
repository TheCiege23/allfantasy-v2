import { NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { closePollMessage } from "@/lib/platform/chat-service"

/**
 * POST: close (resolve) a poll so no more votes can be cast.
 */
export async function POST(
  _req: Request,
  { params }: { params: { threadId: string; messageId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const messageId = decodeURIComponent(params.messageId)

  const ok = await closePollMessage(user.appUserId, threadId, messageId)
  if (!ok) return NextResponse.json({ error: "Could not close poll" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}
