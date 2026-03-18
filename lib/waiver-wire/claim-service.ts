import { prisma } from "@/lib/prisma"
import type { WaiverClaimInput } from "./types"
import { isRosterChopped } from "@/lib/guillotine/guillotineGuard"
import { validateDevyWaiverClaim } from "@/lib/devy/waiver/DevyWaiverRules"

/**
 * Create a waiver claim. Validates that roster exists and belongs to the league (data consistency).
 * Guillotine: chopped (eliminated) rosters cannot submit claims.
 * Devy: devy players not claimable unless league has supplemental devy FA enabled.
 */
export async function createClaim(
  leagueId: string,
  rosterId: string,
  input: WaiverClaimInput
) {
  const roster = await (prisma as any).roster.findFirst({
    where: { id: rosterId, leagueId },
    select: { id: true },
  })
  if (!roster) {
    throw new Error("Roster not found or does not belong to this league")
  }

  const chopped = await isRosterChopped(leagueId, rosterId)
  if (chopped) {
    throw new Error("This team has been eliminated and cannot submit waiver claims")
  }

  const devyCheck = await validateDevyWaiverClaim({ leagueId, addPlayerId: input.addPlayerId })
  if (!devyCheck.allowed) {
    throw new Error(devyCheck.reason ?? "This player cannot be claimed via waivers.")
  }

  const maxOrder = await (prisma as any).waiverClaim.aggregate({
    where: { leagueId, status: "pending" },
    _max: { priorityOrder: true },
  })
  const priorityOrder = (maxOrder?._max?.priorityOrder ?? -1) + 1
  const created = await (prisma as any).waiverClaim.create({
    data: {
      leagueId,
      rosterId,
      addPlayerId: input.addPlayerId,
      dropPlayerId: input.dropPlayerId ?? null,
      faabBid: input.faabBid ?? null,
      priorityOrder: input.priorityOrder ?? priorityOrder,
      status: "pending",
    },
  })
  return created
}

export async function getPendingClaims(leagueId: string) {
  const list = await (prisma as any).waiverClaim.findMany({
    where: { leagueId, status: "pending" },
    orderBy: [{ priorityOrder: "asc" }],
    include: { roster: { select: { id: true, platformUserId: true, playerData: true, faabRemaining: true, waiverPriority: true } } },
  })
  return list
}

export async function getClaimsByRoster(rosterId: string, status?: string) {
  const where: any = { rosterId }
  if (status) where.status = status
  return (prisma as any).waiverClaim.findMany({
    where,
    orderBy: [{ priorityOrder: "asc" }, { createdAt: "asc" }],
  })
}

export async function updateClaim(
  claimId: string,
  leagueId: string,
  rosterId: string,
  input: Partial<WaiverClaimInput>
) {
  const existing = await (prisma as any).waiverClaim.findFirst({
    where: { id: claimId, leagueId, rosterId, status: "pending" },
  })
  if (!existing) return null
  const updated = await (prisma as any).waiverClaim.update({
    where: { id: claimId },
    data: {
      ...(input.addPlayerId != null && { addPlayerId: input.addPlayerId }),
      ...(input.dropPlayerId !== undefined && { dropPlayerId: input.dropPlayerId }),
      ...(input.faabBid !== undefined && { faabBid: input.faabBid }),
      ...(input.priorityOrder !== undefined && { priorityOrder: input.priorityOrder }),
    },
  })
  return updated
}

export async function cancelClaim(claimId: string, leagueId: string, rosterId: string) {
  const existing = await (prisma as any).waiverClaim.findFirst({
    where: { id: claimId, leagueId, rosterId, status: "pending" },
  })
  if (!existing) return false
  await (prisma as any).waiverClaim.update({
    where: { id: claimId },
    data: { status: "cancelled" },
  })
  return true
}

export async function getProcessedClaimsAndTransactions(leagueId: string, limit: number) {
  const [claims, transactions] = await Promise.all([
    (prisma as any).waiverClaim.findMany({
      where: { leagueId, status: { in: ["processed", "failed"] } },
      orderBy: { processedAt: "desc" },
      take: limit,
      include: { roster: { select: { id: true, platformUserId: true } } },
    }),
    (prisma as any).waiverTransaction.findMany({
      where: { leagueId },
      orderBy: { processedAt: "desc" },
      take: limit,
      include: { roster: { select: { id: true, platformUserId: true } } },
    }),
  ])
  return { claims, transactions }
}
