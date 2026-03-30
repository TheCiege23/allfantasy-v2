import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { EntitlementResolver } from "@/lib/subscription/EntitlementResolver"
import {
  SUBSCRIPTION_TOKEN_POLICY_CONFIG,
  resolveTokenChargeDecisionForEntitlement,
} from "@/lib/tokens/subscription-policy"
import { listTokenSpendRuleMatrix } from "@/lib/tokens/pricing-matrix"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const entitlement = await new EntitlementResolver().resolveSnapshot(session.user.id)
    const matrix = listTokenSpendRuleMatrix().map((entry) => {
      const decision = resolveTokenChargeDecisionForEntitlement({
        entitlement,
        ruleCode: entry.code,
        baseTokenCost: entry.tokenCost,
      })
      return {
        ...entry,
        effectiveTokenCost: decision.effectiveTokenCost,
        discountPct: decision.discountPct,
        chargeMode: decision.chargeMode,
        policyMessage: decision.policyMessage,
      }
    })

    return NextResponse.json({
      matrix,
      subscriptionTokenPolicy: SUBSCRIPTION_TOKEN_POLICY_CONFIG,
      entitlement,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[tokens/pricing-matrix GET]", error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Failed to load token pricing matrix" }, { status: 500 })
  }
}
