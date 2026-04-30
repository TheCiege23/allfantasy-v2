import { NextResponse } from "next/server"
import { z } from "zod"
import { isAuthorizedRequest } from "@/lib/adminAuth"
import { syncAllOpenWorldCupChallenges, syncWorldCupChallenge } from "@/lib/world-cup"
import { getWorldCupApiUser, getWorldCupAdminState } from "../_utils"

export const runtime = "nodejs"

const syncWorldCupSchema = z.object({
  challengeId: z.string().min(1).optional(),
})

export async function POST(request: Request) {
  const user = await getWorldCupApiUser()
  const isAdmin = Boolean(isAuthorizedRequest(request) || (await getWorldCupAdminState(request, user)))
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = syncWorldCupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.challengeId) {
    const result = await syncWorldCupChallenge(parsed.data.challengeId)
    return NextResponse.json({ ok: true, ...result })
  }

  const results = await syncAllOpenWorldCupChallenges()
  return NextResponse.json({ ok: true, results })
}
