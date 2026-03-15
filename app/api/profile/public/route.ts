import { NextResponse } from "next/server"
import { getPublicProfileByUsername } from "@/lib/user-settings"

export const dynamic = "force-dynamic"

/**
 * GET /api/profile/public?username=
 * Returns public profile DTO for the given username (no auth required).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const username = url.searchParams.get("username")
  if (!username?.trim()) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 })
  }

  const profile = await getPublicProfileByUsername(username)
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json(profile)
}
