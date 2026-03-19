import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { containsProfanity } from "@/lib/profanity"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function normalizeUsername(u: string) {
  return u.trim()
}

function isDatabaseUnavailableError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(err.code)) {
      return true
    }
  }

  const message = String((err as any)?.message ?? "").toLowerCase()
  if (message.includes("can't reach database server")) return true
  if (message.includes("connection timed out")) return true

  return false
}

export async function GET(req: Request) {
  try {
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
  } catch (error) {
    console.error("[check-username] error:", error)
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        {
          ok: false,
          available: false,
          reason: "db_unavailable",
          message: "Database temporarily unavailable.",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ ok: false, available: false, reason: "error" }, { status: 500 })
  }
}

