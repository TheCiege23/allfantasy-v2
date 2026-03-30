import { NextResponse } from "next/server"
import { getFanCredBoundaryDisclosure } from "@/lib/legal/FanCredBoundaryDisclosure"
import { listFeatureMonetizationMatrix } from "@/lib/monetization/feature-monetization-matrix"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    matrix: listFeatureMonetizationMatrix(),
    fancredBoundary: getFanCredBoundaryDisclosure(),
    generatedAt: new Date().toISOString(),
  })
}
