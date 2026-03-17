/**
 * PROMPT 151 — Frontend-safe provider availability.
 * Returns only booleans; no secrets or keys.
 */

import { NextResponse } from "next/server"
import { getProviderStatus } from "@/lib/provider-config"

export const dynamic = "force-dynamic"

export async function GET() {
  const status = getProviderStatus()
  return NextResponse.json(status)
}
