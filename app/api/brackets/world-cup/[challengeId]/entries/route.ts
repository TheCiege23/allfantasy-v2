import { NextResponse } from "next/server"
import { createWorldCupBracketEntry, listWorldCupBracketEntries } from "@/lib/world-cup"
import { requireWorldCupApiUser, worldCupChallengeParamsSchema } from "../../_utils"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const entries = await listWorldCupBracketEntries({
    challengeId: params.data.challengeId,
    userId: auth.user.id,
  })

  return NextResponse.json({ entries })
}

export async function POST(request: Request, context: { params: { challengeId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid challenge id" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body?.name === "string" ? body.name : undefined

  try {
    const entry = await createWorldCupBracketEntry({
      challengeId: params.data.challengeId,
      userId: auth.user.id,
      name: name ?? null,
    })
    return NextResponse.json({ ok: true, entry })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create entry"
    const status = message.toLowerCase().includes("maximum") ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
