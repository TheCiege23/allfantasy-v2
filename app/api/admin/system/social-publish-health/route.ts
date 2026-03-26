import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/adminAuth"
import { getSocialPublishHealthStatus } from "@/lib/social-clips-grok/SocialPublishHealthResolver"

export const dynamic = "force-dynamic"

export async function GET() {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.res

  try {
    const health = await getSocialPublishHealthStatus()
    return NextResponse.json(health)
  } catch (error) {
    console.error("[admin/system/social-publish-health]", error)
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        platforms: [],
      },
      { status: 500 }
    )
  }
}
