import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/subscription/entitlements
 * Returns current user's subscription entitlement for gating (useEntitlement hook).
 * Optional: ?feature=<SubscriptionFeatureId> to get hasAccess for that feature.
 * When subscription/Stripe integration is persisted, resolve from DB or Stripe here.
 */
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const featureId = searchParams.get("feature") ?? undefined

    // TODO: resolve from UserSubscription / Stripe when persisted; until then return stable shape for gating UI
    const entitlement = {
      plans: [] as string[],
      status: "none" as const,
      currentPeriodEnd: null as string | null,
      gracePeriodEnd: null as string | null,
    }

    const hasAccess = false
    const message = "Upgrade to access this feature."

    return NextResponse.json({
      entitlement,
      hasAccess: Boolean(hasAccess),
      message: String(message ?? "Upgrade to access this feature."),
    })
  } catch (e) {
    console.error("[subscription/entitlements GET]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: "Failed to load entitlements" },
      { status: 500 }
    )
  }
}
