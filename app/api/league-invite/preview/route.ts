import { NextRequest, NextResponse } from "next/server"
import { getLeaguePreviewByCode } from "@/lib/league-invite"

export const runtime = "nodejs"

/**
 * GET /api/league-invite/preview?code=XXX
 * Public: returns league preview for an invite code (for join page).
 * Optional: ?userId= for already-member check (e.g. from session on client).
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined

  const result = await getLeaguePreviewByCode(code, { userId: userId || null })

  if (result.ok) {
    return NextResponse.json({ ok: true, preview: result.preview })
  }

  const status =
    result.error === "INVALID_CODE"
      ? 404
      : result.error === "EXPIRED"
        ? 410
        : result.error === "LEAGUE_FULL"
          ? 409
          : 400
  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      preview: result.preview ?? undefined,
    },
    { status }
  )
}
