/**
 * Phase 2A — Chimmy context inspection endpoint.
 *
 * GET /api/ai/context
 *   - Requires session.
 *   - Optional `?leagueId=` (must belong to caller; verified via assertLeagueMember).
 *   - Optional `?week=` `&season=` `&sport=` `&forceRefresh=1`.
 *
 * Returns the engine's bundle so the chat UI / debug tools can inspect what
 * Chimmy will see, BEFORE the chat route consumes it. This is a read-only,
 * idempotent endpoint — no AI calls, no token spend.
 */

import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertLeagueMember } from "@/lib/league-access"
import { chimmyContextEngine } from "@/lib/chimmy-context"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : undefined
}

export async function GET(request: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string | null }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const url = request.nextUrl
  const leagueId = url.searchParams.get("leagueId")?.trim() || null
  const week = parseIntParam(url.searchParams.get("week"))
  const season = parseIntParam(url.searchParams.get("season"))
  const sport = url.searchParams.get("sport")?.trim() || null
  const forceRefresh = url.searchParams.get("forceRefresh") === "1"

  if (leagueId) {
    try {
      await assertLeagueMember(leagueId, userId)
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const bundle = await chimmyContextEngine.loadContext({
    userId,
    userEmail: session.user.email ?? null,
    leagueId,
    week: week ?? null,
    season: season ?? null,
    sport,
    forceRefresh,
  })

  return NextResponse.json(
    { ok: true, bundle },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  )
}
