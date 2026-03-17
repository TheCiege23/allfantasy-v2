import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertCommissioner } from "@/lib/commissioner/permissions"

/**
 * POST: Request league reset (rosters/standings wipe).
 * Currently returns 501; implement when platform supports safe reset.
 */
export async function POST(
  _req: Request,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    await assertCommissioner(params.leagueId, userId)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json(
    { error: "League reset not yet implemented. Use your platform (e.g. Sleeper) to reset, or contact support." },
    { status: 501 }
  )
}
