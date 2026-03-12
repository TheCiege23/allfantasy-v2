import { NextResponse } from "next/server"
import { requireVerifiedUser } from "@/lib/auth-guard"
import { getLiveBracketIntel } from "@/lib/brackets/live-intel"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const auth = await requireVerifiedUser()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const entryId = String(body.entryId || "")

  if (!entryId) {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 })
  }

  const intel = await getLiveBracketIntel(entryId)
  if (!intel) {
    return NextResponse.json(
      { error: "Unable to load live bracket intelligence" },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    ...intel,
    note:
      "Live tournament intelligence is based on current game feeds, bracket states, and simulations. It highlights context and probabilities but does not guarantee any outcome.",
  })
}

