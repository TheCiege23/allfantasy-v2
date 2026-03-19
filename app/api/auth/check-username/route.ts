import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { containsProfanity } from "@/lib/profanity"

export const runtime = "nodejs"

function normalizeUsername(u: string) {
  return u.trim()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("username") || ""
  const username = normalizeUsername(raw)

  if (!username) {
    return NextResponse.json({ ok: false, available: false, reason: "empty" })
  }

  if (username.length < 3 || username.length > 30) {
    return NextResponse.json({ ok: true, available: false, reason: "length" })
  }

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    return NextResponse.json({ ok: true, available: false, reason: "charset" })
  }

  if (containsProfanity(username)) {
    return NextResponse.json({ ok: true, available: false, reason: "profanity" })
  }

  const existing = await prisma.appUser.findFirst({
    where: { username },
    select: { id: true },
  })

  return NextResponse.json({
    ok: true,
    available: !existing,
    reason: existing ? "taken" : "ok",
  })
}

