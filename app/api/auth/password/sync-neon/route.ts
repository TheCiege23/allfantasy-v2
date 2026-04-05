import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { isStrongPassword } from "@/lib/tokens"

export const runtime = "nodejs"

/**
 * After Supabase `updateUser({ password })`, sync bcrypt hash to Neon `appUser`
 * so NextAuth credentials sign-in stays consistent.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  const accessToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  if (!accessToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 })
  }

  const supabase = createClient(url, anon)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(accessToken)

  if (userErr || !user?.email) {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const newPassword = String(body?.newPassword || "")
  if (!isStrongPassword(newPassword)) {
    return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 })
  }

  const email = user.email.toLowerCase()
  const passwordHash = await bcrypt.hash(newPassword, 12)

  try {
    const result = await prisma.appUser.updateMany({
      where: { email: { equals: email, mode: "insensitive" } },
      data: { passwordHash },
    })
    if (result.count === 0) {
      console.warn("[sync-neon] No app_users row for email after Supabase password update:", email)
    }
  } catch (e) {
    console.error("[sync-neon] prisma update failed:", e)
    return NextResponse.json({ error: "SYNC_FAILED" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
