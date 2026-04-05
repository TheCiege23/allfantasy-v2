import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { isStrongPassword } from "@/lib/tokens"

export const runtime = "nodejs"

const BCRYPT_ROUNDS = 10

/**
 * After Supabase `updateUser({ password })`, sync bcrypt hash to Neon `appUser`
 * so NextAuth credentials sign-in stays consistent.
 *
 * Identity: Supabase JWT (`getUser(accessToken)`). Email in body is optional and must match JWT if sent.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  const accessToken =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  if (!accessToken) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Missing access token. Open the reset link from your email again." },
      { status: 401 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !anon) {
    console.error("[sync-neon] Supabase env not configured")
    return NextResponse.json(
      { error: "NOT_CONFIGURED", message: "Server configuration error. Try again later." },
      { status: 503 }
    )
  }

  const supabase = createClient(url, anon)
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(accessToken)

  if (userErr || !user?.email) {
    console.error("[sync-neon] getUser failed:", userErr?.message ?? "no email")
    return NextResponse.json(
      { error: "INVALID_SESSION", message: "Session expired or invalid. Request a new password reset link." },
      { status: 401 }
    )
  }

  console.log("[reset] supabase email:", user.email)

  const body = await req.json().catch(() => ({}))
  const newPassword = String(body?.newPassword || "")
  const bodyEmailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!isStrongPassword(newPassword)) {
    return NextResponse.json({ error: "WEAK_PASSWORD", message: "Password does not meet strength rules." }, { status: 400 })
  }

  const normalizedEmail = user.email.toLowerCase().trim()
  if (bodyEmailRaw && bodyEmailRaw !== normalizedEmail) {
    return NextResponse.json(
      { error: "EMAIL_MISMATCH", message: "Email does not match the signed-in reset session." },
      { status: 400 }
    )
  }

  let row: { id: string } | null = null
  try {
    const primaryWhere = { email: user.email.trim() }
    console.log("[reset] prisma where clause:", primaryWhere)
    row = await prisma.appUser.findFirst({
      where: primaryWhere,
      select: { id: true },
    })
    console.log("[reset] app_users row found:", row ? row.id : "NULL")

    if (!row) {
      const fallbackWhere = {
        email: { equals: normalizedEmail, mode: "insensitive" as const },
      }
      console.log("[reset] prisma where clause:", fallbackWhere)
      row = await prisma.appUser.findFirst({
        where: fallbackWhere,
        select: { id: true },
      })
      console.log("[reset] app_users row found:", row ? row.id : "NULL")
    }
  } catch (err) {
    console.error("[sync-neon] prisma findFirst failed:", err)
    return NextResponse.json(
      { error: "DB_LOOKUP_FAILED", message: "Could not look up your account." },
      { status: 500 }
    )
  }

  if (!row) {
    console.error("[sync-neon] No app_users row for email after primary + fallback:", normalizedEmail)
    return NextResponse.json(
      {
        error: "USER_NOT_FOUND",
        message: "No account found for this email. Please sign up first.",
      },
      { status: 404 }
    )
  }

  let passwordHash: string
  try {
    passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  } catch (err) {
    console.error("[sync-neon] bcrypt.hash failed:", err)
    return NextResponse.json(
      { error: "HASH_FAILED", message: "Could not process password." },
      { status: 500 }
    )
  }

  try {
    await prisma.appUser.update({
      where: { id: row.id },
      data: { passwordHash },
    })
  } catch (err) {
    console.error("[sync-neon] prisma.appUser.update failed:", err)
    return NextResponse.json(
      {
        error: "SYNC_FAILED",
        message: err instanceof Error ? err.message : "Could not save password to your account.",
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, synced: true, email: normalizedEmail })
}
