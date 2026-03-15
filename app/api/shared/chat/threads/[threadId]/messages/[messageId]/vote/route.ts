import { NextRequest, NextResponse } from "next/server"
import { resolvePlatformUser } from "@/lib/platform/current-user"
import { votePollMessage } from "@/lib/platform/chat-service"

/**
 * POST: record a poll vote for the given option index.
 * Body: { optionIndex: number }
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
  const optionIndex = Number(body?.optionIndex)

  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return NextResponse.json({ error: "optionIndex required (non-negative integer)" }, { status: 400 })
  }

  const ok = await votePollMessage(user.appUserId, threadId, messageId, optionIndex)
  if (!ok) return NextResponse.json({ error: "Could not record vote" }, { status: 400 })

  return NextResponse.json({ status: "ok" })
}
