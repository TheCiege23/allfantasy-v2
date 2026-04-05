import { NextResponse } from "next/server"
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret"
import { hasDatabaseUrl } from "@/lib/env/database-url"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Lightweight check that auth-critical env vars are set.
 * Does NOT import prisma or any DB code, so it won't throw when DATABASE_URL is missing.
 * Used by the login page to show a clear message before the user attempts sign-in.
 */
export async function GET() {
  const missing: string[] = []
  if (!hasDatabaseUrl(process.env)) missing.push("DATABASE_URL")
  if (!resolveAuthSecret(process.env)) missing.push("NEXTAUTH_SECRET")
  if (!process.env.NEXTAUTH_URL?.trim()) missing.push("NEXTAUTH_URL")

  if (missing.length === 0) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json(
    {
      ok: false,
      reason: "Configuration missing",
      missing,
      message: `Missing required auth configuration: ${missing.join(", ")}.`,
    },
    { status: 503 }
  )
}
