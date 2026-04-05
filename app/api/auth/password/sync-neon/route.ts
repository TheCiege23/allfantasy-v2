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

  try {
    const passwordHash = await bcrypt.hash(newPassword, 12)
    const row = await prisma.appUser.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    })
    if (!row) {
      console.warn("[sync-neon] No app_users row for email after Supabase password update:", email)
      return NextResponse.json({ ok: true, synced: false })
    }
    await prisma.appUser.update({
      where: { id: row.id },
      data: { passwordHash },
    })
    return NextResponse.json({ ok: true, synced: true })
  } catch (err) {
    console.error("[sync-neon] DB sync failed (non-critical):", err)
    return NextResponse.json({ ok: true, synced: false })
  }
}
