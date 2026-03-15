import { NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { getThreadMembers } from "@/lib/platform/chat-service"

/**
 * GET /api/shared/chat/threads/[threadId]/members
 * Returns thread members for mention suggestions: { id, username, displayName }[].
 */
export async function GET(
  _req: Request,
  { params }: { params: { threadId: string } }
) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const threadId = decodeURIComponent(params.threadId)
  const members = await getThreadMembers(user.appUserId, threadId)
  return NextResponse.json({ status: "ok", members })
}
