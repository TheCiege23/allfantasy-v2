import "server-only"

import { prisma } from "@/lib/prisma"
import { EntitlementResolver } from "@/lib/subscription/EntitlementResolver"
import type { SubscriptionFeatureId } from "@/lib/subscription/types"

const FEATURE: SubscriptionFeatureId = "commissioner_integrity_monitoring"

/** True when the league owner (import row `League.userId`) has integrity monitoring entitlement. */
export async function checkLeagueCommissionerEntitlement(leagueId: string): Promise<boolean> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { userId: true },
  })
  if (!league) return false
  const resolver = new EntitlementResolver()
  const result = await resolver.resolveForUser(league.userId, FEATURE)
  return result.hasAccess
}
