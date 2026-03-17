import { NextResponse } from "next/server"
import { getPlatformConfigSnapshot } from "@/lib/feature-toggle"

export const dynamic = "force-dynamic"

/** Public API: current feature toggles and enabled sports for app UI. */
export async function GET() {
  try {
    const snapshot = await getPlatformConfigSnapshot()
    return NextResponse.json({
      features: snapshot.features,
      sports: snapshot.sports,
    })
  } catch (e) {
    console.error("[config/features]", e)
    return NextResponse.json(
      { error: "Failed to load features" },
      { status: 500 }
    )
  }
}
