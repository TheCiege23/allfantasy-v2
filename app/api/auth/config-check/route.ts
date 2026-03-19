import { NextResponse } from "next/server"
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
  if (!process.env.NEXTAUTH_SECRET?.trim()) missing.push("NEXTAUTH_SECRET")

  if (missing.length === 0) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json(
    {
      ok: false,
      reason: "Configuration missing",
      missing,
      message:
        "DATABASE_URL is not set. Add it to your local environment and Vercel project settings.",
    },
    { status: 503 }
  )
}
