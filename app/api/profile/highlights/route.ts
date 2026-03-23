import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getProfileHighlights } from "@/lib/user-settings"

export const dynamic = "force-dynamic"

/**
 * GET /api/profile/highlights
 * Authenticated highlights for own profile card (GM prestige, reputation, legacy).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const highlights = await getProfileHighlights(session.user.id)
  return NextResponse.json(highlights)
}
