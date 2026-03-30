import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { SubscriptionFeatureId } from "@/lib/subscription/types"
import {
  FeatureGateService,
  isFeatureGateAccessError,
} from "@/lib/subscription/FeatureGateService"
import { isSubscriptionFeatureId } from "@/lib/subscription/feature-access"

type FeatureGateBody = {
  featureId?: string
}

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as
      | { user?: { id?: string } }
      | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as FeatureGateBody
    const featureId = body.featureId?.trim()
    if (!featureId || !isSubscriptionFeatureId(featureId)) {
      return NextResponse.json({ error: "Invalid featureId" }, { status: 400 })
    }

    const gate = new FeatureGateService()
    const decision = await gate.evaluateUserFeatureAccess(
      session.user.id,
      featureId as SubscriptionFeatureId
    )
    if (!decision.allowed) {
      return NextResponse.json(
        {
          error: "Feature locked",
          code: "feature_not_entitled",
          message: decision.message,
          requiredPlan: decision.requiredPlan,
          upgradePath: decision.upgradePath,
          entitlement: decision.entitlement,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      allowed: true,
      featureId,
      message: "Access granted.",
      entitlement: decision.entitlement,
    })
  } catch (error) {
    if (isFeatureGateAccessError(error)) {
      return NextResponse.json(
        {
          error: "Feature locked",
          code: error.code,
          message: error.message,
          requiredPlan: error.requiredPlan,
          upgradePath: error.upgradePath,
          entitlement: error.entitlement,
        },
        { status: error.statusCode }
      )
    }
    console.error("[subscription/feature-gate POST]", error)
    return NextResponse.json(
      { error: "Failed to evaluate feature access" },
      { status: 500 }
    )
  }
}
