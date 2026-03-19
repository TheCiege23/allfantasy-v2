import { prisma } from "@/lib/prisma"
import { getEffectiveLeagueWaiverSettings } from "./settings-service"
import {
  getRosterPlayerIds,
  addPlayerToRosterData,
  removePlayerFromRosterData,
  rosterContainsPlayer,
} from "./roster-utils"
import { onWaiverRunComplete } from "./run-hooks"
import { getSpecialtySpecByVariant } from "@/lib/specialty-league/registry"
import { isWaiverFrozenForRoster } from "@/lib/survivor/SurvivorEffectEngine"
import type { ProcessedClaimResult } from "./types"

type ClaimRow = {
  id: string
  leagueId: string
  rosterId: string
  addPlayerId: string
  dropPlayerId: string | null
  faabBid: number | null
  priorityOrder: number
  status: string
  roster: {
    id: string
    platformUserId: string
    playerData: unknown
    faabRemaining: number | null
    waiverPriority: number | null
  }
}

export async function processWaiverClaimsForLeague(leagueId: string): Promise<ProcessedClaimResult[]> {
  const [effectiveSettings, league, pendingClaims, allRosters, leagueTeams] = await Promise.all([
    getEffectiveLeagueWaiverSettings(leagueId),
    (prisma as any).league.findUnique({
      where: { id: leagueId },
      select: { id: true, rosterSize: true, leagueVariant: true },
    }),
    (prisma as any).waiverClaim.findMany({
      where: { leagueId, status: "pending" },
      include: {
        roster: {
          select: {
            id: true,
            platformUserId: true,
            playerData: true,
            faabRemaining: true,
            waiverPriority: true,
          },
        },
      },
    }),
    (prisma as any).roster.findMany({
      where: { leagueId },
      select: { id: true, playerData: true, waiverPriority: true },
    }),
    (prisma as any).leagueTeam.findMany({
      where: { leagueId },
      select: { externalId: true, currentRank: true },
    }).catch(() => []),
  ])

  if (!league) return []
  const specialtySpec = getSpecialtySpecByVariant(league.leagueVariant ?? null)
  const rosterGuard = specialtySpec?.rosterGuard
  const waiverType = effectiveSettings.waiverType ?? "standard"
  const faabBudget = effectiveSettings.faabBudget ?? null

  const rankByPlatformUserId = new Map<string, number>()
  for (const t of (leagueTeams as { externalId: string; currentRank: number | null }[]) || []) {
    if (t.externalId != null && t.currentRank != null) rankByPlatformUserId.set(t.externalId, t.currentRank)
  }

  const rosteredByPlayer = new Map<string, string>()
  for (const r of allRosters as { id: string; playerData: unknown }[]) {
    const ids = getRosterPlayerIds(r.playerData)
    for (const id of ids) rosteredByPlayer.set(id, r.id)
  }

  const ordered = orderClaimsForProcessing(
    pendingClaims as ClaimRow[],
    waiverType,
    rankByPlatformUserId
  )

  const results: ProcessedClaimResult[] = []
  const rosterSize = league.rosterSize ?? 20

  for (const claim of ordered) {
    const roster = claim.roster
    const waiversFrozen = await isWaiverFrozenForRoster(leagueId, claim.rosterId).catch(() => false)
    if (waiversFrozen) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Roster's waiver moves are frozen by an active Survivor idol effect." },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: claim.addPlayerId,
        dropPlayerId: claim.dropPlayerId ?? undefined,
        message: "Roster's waiver moves are frozen by an active Survivor idol effect.",
      })
      continue
    }
    if (rosterGuard && !(await rosterGuard(leagueId, claim.rosterId))) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Roster cannot make waiver claims (eliminated or inactive)." },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: claim.addPlayerId,
        dropPlayerId: claim.dropPlayerId ?? undefined,
        message: "Roster cannot make waiver claims (eliminated or inactive).",
      })
      continue
    }
    const currentPlayerIds = getRosterPlayerIds(roster.playerData)
    const addId = claim.addPlayerId
    const dropId = claim.dropPlayerId

    if (rosteredByPlayer.get(addId)) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Player no longer available" },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: addId,
        dropPlayerId: dropId ?? undefined,
        message: "Player no longer available",
      })
      continue
    }

    const needDrop = currentPlayerIds.length >= rosterSize && !dropId
    if (needDrop) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Roster full; no drop specified" },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: addId,
        message: "Roster full; no drop specified",
      })
      continue
    }

    if (dropId && !rosterContainsPlayer(roster.playerData, dropId)) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Drop player not on roster" },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: addId,
        dropPlayerId: dropId,
        message: "Drop player not on roster",
      })
      continue
    }

    const bid = claim.faabBid ?? 0
    const faabRem = roster.faabRemaining ?? 0
    if (waiverType === "faab" && bid > faabRem) {
      await (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "failed", processedAt: new Date(), resultMessage: "Insufficient FAAB" },
      })
      results.push({
        claimId: claim.id,
        rosterId: claim.rosterId,
        success: false,
        addPlayerId: addId,
        faabSpent: bid,
        message: "Insufficient FAAB",
      })
      continue
    }

    let newPlayerData = addPlayerToRosterData(roster.playerData, addId)
    if (dropId) newPlayerData = removePlayerFromRosterData(newPlayerData, dropId)
    const faabSpent = waiverType === "faab" ? bid : null
    const priorityBefore = roster.waiverPriority ?? null

    await (prisma as any).$transaction([
      (prisma as any).waiverClaim.update({
        where: { id: claim.id },
        data: { status: "processed", processedAt: new Date(), resultMessage: "Awarded" },
      }),
      (prisma as any).roster.update({
        where: { id: claim.rosterId },
        data: {
          playerData: newPlayerData,
          ...(faabSpent != null && { faabRemaining: Math.max(0, faabRem - faabSpent) }),
          ...(waiverType === "rolling" && priorityBefore != null && { waiverPriority: priorityBefore + 1 }),
        },
      }),
      (prisma as any).waiverTransaction.create({
        data: {
          leagueId,
          rosterId: claim.rosterId,
          claimId: claim.id,
          addPlayerId: addId,
          dropPlayerId: dropId,
          faabSpent,
          waiverPriorityBefore: priorityBefore,
        },
      }),
    ])

    rosteredByPlayer.set(addId, claim.rosterId)
    if (dropId) rosteredByPlayer.delete(dropId)

    results.push({
      claimId: claim.id,
      rosterId: claim.rosterId,
      success: true,
      addPlayerId: addId,
      dropPlayerId: dropId ?? undefined,
      faabSpent: faabSpent ?? undefined,
      message: "Awarded",
    })
  }

  await onWaiverRunComplete(leagueId, results).catch(() => {})
  return results
}

function orderClaimsForProcessing(
  claims: ClaimRow[],
  waiverType: string,
  rankByPlatformUserId: Map<string, number>
): ClaimRow[] {
  if (waiverType === "faab") {
    return [...claims].sort((a, b) => {
      const bidA = a.faabBid ?? 0
      const bidB = b.faabBid ?? 0
      if (bidB !== bidA) return bidB - bidA
      return a.priorityOrder - b.priorityOrder
    })
  }

  if (waiverType === "reverse_standings") {
    return [...claims].sort((a, b) => {
      const rankA = rankByPlatformUserId.get(a.roster?.platformUserId ?? "") ?? 999
      const rankB = rankByPlatformUserId.get(b.roster?.platformUserId ?? "") ?? 999
      if (rankA !== rankB) return rankA - rankB
      return a.priorityOrder - b.priorityOrder
    })
  }

  if (waiverType === "rolling") {
    return [...claims].sort((a, b) => {
      const pA = a.roster?.waiverPriority ?? 999
      const pB = b.roster?.waiverPriority ?? 999
      if (pA !== pB) return pA - pB
      return a.priorityOrder - b.priorityOrder
    })
  }

  if (waiverType === "fcfs") {
    return [...claims].sort((a, b) => {
      const at = (a as any).createdAt
      const bt = (b as any).createdAt
      const ta = at instanceof Date ? at.getTime() : typeof at === "string" ? new Date(at).getTime() : 0
      const tb = bt instanceof Date ? bt.getTime() : typeof bt === "string" ? new Date(bt).getTime() : 0
      return ta - tb
    })
  }

  return [...claims].sort((a, b) => a.priorityOrder - b.priorityOrder)
}
