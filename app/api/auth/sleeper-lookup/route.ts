import { NextResponse } from "next/server"
import { lookupSleeperUser } from "@/lib/sleeper/user-lookup"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get("username")

  if (!username || username.trim().length < 2) {
    return NextResponse.json({ error: "Please enter a valid Sleeper username." }, { status: 400 })
  }

  try {
    const result = await lookupSleeperUser(username)

    if (result.status === "not_found") {
      return NextResponse.json({ found: false, error: "Sleeper user not found." }, { status: 404 })
    }

    if (result.status === "unavailable") {
      return NextResponse.json(
        { found: false, error: "Sleeper lookup is temporarily unavailable. Please try again." },
        { status: 503 }
      )
    }

    const data = result.user

    return NextResponse.json({
      found: true,
      username: data.username,
      userId: data.user_id,
      displayName: data.display_name || data.username,
      avatar: data.avatar ? `https://sleepercdn.com/avatars/thumbs/${data.avatar}` : null,
    })
  } catch {
    return NextResponse.json({ error: "Failed to look up Sleeper user." }, { status: 500 })
  }
}
