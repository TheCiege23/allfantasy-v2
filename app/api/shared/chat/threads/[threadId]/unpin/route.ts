import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { deletePinMessage } from "@/lib/platform/chat-service"
import { isLeagueVirtualRoom } from "@/lib/chat-core"

/**
 * POST /api/shared/chat/threads/[threadId]/unpin
 * Body: { pinMessageId: string }
 * Removes the pin (deletes the pin-type message). Only for platform threads; virtual league rooms return 400.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  if (isLeagueVirtualRoom(threadId)) {
    return NextResponse.json({ error: "Unpin not supported for league virtual room" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const pinMessageId = String(body?.pinMessageId || "").trim()
  if (!pinMessageId) return NextResponse.json({ error: "pinMessageId required" }, { status: 400 })

  const ok = await deletePinMessage(user.appUserId, threadId, pinMessageId)
  if (!ok) return NextResponse.json({ error: "Unable to unpin" }, { status: 400 })
  return NextResponse.json({ status: "ok" })
}
