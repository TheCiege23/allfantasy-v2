/**
 * Phase 2A — SubscriptionContextProvider
 * Thin wrapper over `AIAccessResolver` that produces a Chimmy-friendly slice.
 *
 * Never exposes Stripe IDs, raw plan SKUs, or payment-method tokens.
 */

import { prisma } from "@/lib/prisma"
import { aiAccessResolver } from "@/lib/ai-access/AIAccessResolver"
import type {
  ChimmyContextProvider,
  ChimmyContextRequest,
  ProviderResult,
  SubscriptionContextSlice,
} from "@/lib/chimmy-context/types"

export class SubscriptionContextProvider
  implements ChimmyContextProvider<SubscriptionContextSlice>
{
  readonly name = "subscription"
  readonly defaultTtlMs = 60 * 1000

  async load(
    request: ChimmyContextRequest
  ): Promise<ProviderResult<SubscriptionContextSlice>> {
    const startedAt = Date.now()
    const fetchedAt = new Date().toISOString()
    try {
      const appUser = await prisma.appUser.findUnique({
        where: { id: request.userId },
        select: { createdAt: true, email: true },
      })

      const status = await aiAccessResolver.resolveForUser({
        userId: request.userId,
        userEmail: request.userEmail ?? appUser?.email ?? null,
        createdAt: appUser?.createdAt ?? null,
      })

      const planLabel =
        status.subscription.plans.length > 0
          ? status.subscription.plans[0] ?? null
          : null

      const slice: SubscriptionContextSlice = {
        hasAccess: status.hasAccess,
        reason: status.reason,
        hasSubscription: status.hasSubscription,
        planLabel,
        inTrial: status.trial.inTrial,
        trialDaysRemaining: status.trial.daysRemaining,
        trialEndsAt: status.trial.endsAt,
        tokenBalance: status.tokenBalance,
        message: status.message,
      }

      return {
        ok: true,
        data: slice,
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    } catch (err) {
      return {
        ok: false,
        data: null,
        error: err instanceof Error ? err.message : "Unknown subscription provider error",
        fetchedAt,
        durationMs: Date.now() - startedAt,
      }
    }
  }
}
