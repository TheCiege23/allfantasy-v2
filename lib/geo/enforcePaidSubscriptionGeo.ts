import { NextResponse } from "next/server"

import { detectUserState } from "./detectUserState"
import { isPaidBlocked } from "./restrictedStates"

/** Returns a 451 JSON response when paid checkout must be blocked; otherwise null. */
export async function enforcePaidSubscriptionGeo(req: Request): Promise<NextResponse | null> {
  const geo = await detectUserState(req)
  if (geo.stateCode && isPaidBlocked(geo.stateCode)) {
    return NextResponse.json(
      {
        error: "PAID_GEO_BLOCKED",
        stateCode: geo.stateCode,
        message: "Paid subscriptions are not available in your state.",
        redirectTo: "/paid-restricted",
        allowFree: true,
      },
      { status: 451 }
    )
  }
  return null
}
