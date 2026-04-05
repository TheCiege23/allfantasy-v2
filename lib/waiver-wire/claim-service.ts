import { prisma } from "@/lib/prisma"
import type { WaiverClaimInput } from "./types"
import { isRosterChopped } from "@/lib/guillotine/guillotineGuard"
import { isRosterCurrentlyEliminated } from "@/lib/survivor/SurvivorRosterState"
import { validateDevyWaiverClaim } from "@/lib/devy/waiver/DevyWaiverRules"
import { isWaiverFrozenForRoster } from "@/lib/survivor/SurvivorEffectEngine"

/**
 * Create a waiver claim. Validates that roster exists and belongs to the league (data consistency).
 * Guillotine: chopped (eliminated) rosters cannot submit claims.
 * Devy: devy players not claimable unless league has dispersal devy FA enabled.
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

  const survivorEliminated = await isRosterCurrentlyEliminated(leagueId, rosterId).catch(() => false)
  if (survivorEliminated) {
    throw new Error("This Survivor manager has been eliminated and cannot submit waiver claims")
  }

  const waiversFrozen = await isWaiverFrozenForRoster(leagueId, rosterId).catch(() => false)
  if (waiversFrozen) {
    throw new Error("This roster's waiver moves are frozen by an active Survivor idol effect")
  }

  const devyCheck = await validateDevyWaiverClaim({ leagueId, addPlayerId: input.addPlayerId })
  if (!devyCheck.allowed) {
    throw new Error(devyCheck.reason ?? "This player cannot be claimed via waivers.")
  }

  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true },
  })

  const maxOrder = await (prisma as any).waiverClaim.aggregate({
    where: { leagueId, status: "pending" },
    _max: { priorityOrder: true },
  })
  const priorityOrder = (maxOrder?._max?.priorityOrder ?? -1) + 1
  const created = await (prisma as any).waiverClaim.create({
    data: {
      leagueId,
      sportType: league?.sport ?? null,
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
  const survivorEliminated = await isRosterCurrentlyEliminated(leagueId, rosterId).catch(() => false)
  if (survivorEliminated) {
    throw new Error("This Survivor manager has been eliminated and cannot edit waiver claims")
  }
  const waiversFrozen = await isWaiverFrozenForRoster(leagueId, rosterId).catch(() => false)
  if (waiversFrozen) {
    throw new Error("This roster's waiver moves are frozen by an active Survivor idol effect")
  }
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
  const enriched = await enrichTransactionsWithPositions(transactions)
  return { claims, transactions: enriched }
}

const IDP_POSITIONS = new Set(["DE", "DT", "LB", "CB", "S", "SS", "FS"])

async function enrichTransactionsWithPositions(
  transactions: { addPlayerId: string; dropPlayerId: string | null }[]
): Promise<{ addPlayerId: string; dropPlayerId: string | null; addPlayerPosition?: string; dropPlayerPosition?: string; isDefensiveAdd?: boolean; isDefensiveDrop?: boolean }[]> {
  const ids = new Set<string>()
  for (const t of transactions) {
    if (t.addPlayerId) ids.add(t.addPlayerId)
    if (t.dropPlayerId) ids.add(t.dropPlayerId)
  }
  if (ids.size === 0) return transactions.map((t) => ({ ...t, isDefensiveAdd: false, isDefensiveDrop: false }))
  const players = await (prisma as any).sportsPlayer.findMany({
    where: { id: { in: Array.from(ids) } },
    select: { id: true, position: true },
  })
  const posById = new Map<string, string>(players.map((p: { id: string; position: string | null }) => [p.id, (p.position ?? "").toUpperCase()]))
  return transactions.map((t) => {
    const addPos = posById.get(t.addPlayerId) ?? ""
    const dropPos = posById.get(t.dropPlayerId ?? "") ?? ""
    return {
      ...t,
      addPlayerPosition: addPos || undefined,
      dropPlayerPosition: dropPos || undefined,
      isDefensiveAdd: addPos ? IDP_POSITIONS.has(addPos) : false,
      isDefensiveDrop: dropPos ? IDP_POSITIONS.has(dropPos) : false,
    }
  })
}
