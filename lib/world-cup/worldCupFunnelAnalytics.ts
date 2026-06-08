"use client"

import { gtagEvent } from "@/lib/gtag"
import { trackMetaEventAndMirror } from "@/lib/meta-client"

// ── Funnel event names ────────────────────────────────────────────────────────

export type WcFunnelEvent =
  | "WorldCupLandingViewed"
  | "WorldCupCreatePoolClicked"
  | "WorldCupGuestPoolStarted"
  | "WorldCupPoolDraftCompleted"
  | "WorldCupSignupPromptShown"
  | "WorldCupSignupStarted"
  | "WorldCupPoolCreated"
  | "WorldCupInviteCopied"
  | "WorldCupBracketStarted"
  | "WorldCupBracketCompleted"
  | "AFProUpsellViewed"
  | "AFCommissionerUpsellViewed"
  | "TokenUpsellViewed"

// ── Helpers ───────────────────────────────────────────────────────────────────

export function trackWcFunnelEvent(
  event: WcFunnelEvent,
  params: Record<string, unknown> = {}
): void {
  gtagEvent(event, params)
}

/** Fire Meta ViewContent for the /world-cup landing page. */
export function trackWcLandingViewContent(): void {
  trackMetaEventAndMirror(
    "ViewContent",
    {
      content_name: "World Cup 2026 Pool Landing",
      content_category: "World Cup",
      value: 0,
      currency: "USD",
    },
    {
      sourceId: "wc_landing_page",
      contentName: "World Cup 2026 Pool Landing",
      contentCategory: "World Cup",
    }
  )
}

/** Track that a guest started filling out the pool draft form. */
export function trackWcGuestPoolStarted(step: number): void {
  gtagEvent("WorldCupGuestPoolStarted", { step })
}

/** Track that a guest completed the pool draft (before signup). */
export function trackWcPoolDraftCompleted(poolName: string): void {
  gtagEvent("WorldCupPoolDraftCompleted", { pool_name: poolName })
}

/** Track that the signup prompt was shown to a guest. */
export function trackWcSignupPromptShown(source: string): void {
  gtagEvent("WorldCupSignupPromptShown", { source })
}

/** Track that a guest clicked the signup CTA from the funnel. */
export function trackWcSignupStarted(source: string): void {
  gtagEvent("WorldCupSignupStarted", { source })
}

/** Track a real pool was created from a guest draft (post-auth). */
export function trackWcPoolCreated(challengeId: string, poolName: string): void {
  gtagEvent("WorldCupPoolCreated", { challenge_id: challengeId, pool_name: poolName })
}

/** Track invite link copied. */
export function trackWcInviteCopied(challengeId: string): void {
  gtagEvent("WorldCupInviteCopied", { challenge_id: challengeId })
}
