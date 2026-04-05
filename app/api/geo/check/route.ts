import { NextResponse } from "next/server"

import { detectUserState } from "@/lib/geo/detectUserState"
import { getRestrictionLevel, getRestrictedStateMeta } from "@/lib/geo/restrictedStates"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const geo = await detectUserState(req)
  const restrictionLevel = getRestrictionLevel(geo.stateCode)
  const meta = getRestrictedStateMeta(geo.stateCode)
  return NextResponse.json({
    stateCode: geo.stateCode,
    stateName: meta?.name ?? null,
    country: geo.country,
    isVpnOrProxy: geo.isVpnOrProxy,
    restrictionLevel,
  })
}
