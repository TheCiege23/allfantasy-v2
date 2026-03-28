/**
 * PROMPT 151 — Frontend-safe provider availability.
 * Returns only booleans; no secrets or keys.
 */

import { NextResponse } from "next/server"
import { getProviderStatus, getProviderSurfaceStatus } from "@/lib/provider-config"
import { getClearSportsToolStates } from "@/lib/clear-sports"

export const dynamic = "force-dynamic"

export async function GET() {
  const status = getProviderStatus()
  return NextResponse.json({
    ...status,
    grok: status.xai,
    surfaces: getProviderSurfaceStatus(status),
    clearsportsTools: getClearSportsToolStates(status.clearsports),
  })
}
