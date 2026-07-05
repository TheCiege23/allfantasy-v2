import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { DuplicateManagerAssessment } from "@/lib/identity/DuplicateManagerRiskService"
import { recordHouseholdException } from "@/lib/identity/DuplicateManagerRiskService"

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient

/** Reuses the existing IntegrityFlag model (flagType = "duplicate_manager") rather than a parallel table — same commissioner-review shape (severity/status/evidenceJson/commissionerNote) already used for trade collusion flags. */
export const DUPLICATE_MANAGER_FLAG_TYPE = "duplicate_manager"

export type DuplicateManagerFlagStatus =
  | "pending_review"
  | "flagged"
  | "allowed"
  | "blocked"
  | "household"
  | "verification_requested"

type DuplicateManagerEvidence = {
  joiningUserId: string
  inviteLinkId?: string | null
  comparisons: Array<{
    suspectAppUserId: string
    suspectRosterId: string | null
    suspectLabel: string
    score: number
    reasons: string[]
  }>
}

export async function createDuplicateManagerFlag(input: {
  leagueId: string
  joiningUserId: string
  assessment: DuplicateManagerAssessment
  status: "pending_review" | "flagged"
  inviteLinkId?: string | null
  client?: PrismaClientOrTx
}): Promise<string> {
  const client = input.client ?? prisma
  const activeComparisons = input.assessment.comparisons.filter((c) => !c.householdExempt)
  const evidence: DuplicateManagerEvidence = {
    joiningUserId: input.joiningUserId,
    inviteLinkId: input.inviteLinkId ?? null,
    comparisons: activeComparisons.map((c) => ({
      suspectAppUserId: c.suspectAppUserId,
      suspectRosterId: c.suspectRosterId,
      suspectLabel: c.suspectLabel,
      score: c.score,
      reasons: c.reasons,
    })),
  }

  const flag = await client.integrityFlag.create({
    data: {
      leagueId: input.leagueId,
      flagType: DUPLICATE_MANAGER_FLAG_TYPE,
      severity: input.assessment.riskLevel,
      status: input.status,
      affectedRosterIds: activeComparisons.map((c) => c.suspectRosterId).filter((v): v is string => !!v),
      affectedTeamNames: activeComparisons.map((c) => c.suspectLabel),
      summary:
        activeComparisons.length > 0
          ? `Possible duplicate manager — matches ${activeComparisons.length} existing manager${activeComparisons.length > 1 ? "s" : ""} in this league.`
          : "Possible duplicate manager detected.",
      evidenceJson: evidence as unknown as Prisma.InputJsonValue,
      aiConfidence: Math.min(1, input.assessment.topScore / 100),
    },
    select: { id: true },
  })
  return flag.id
}

export type DuplicateManagerFlagSummary = {
  id: string
  riskLevel: string
  status: string
  summary: string
  reasons: string[]
  comparedTeams: string[]
  createdAt: string
  commissionerNote: string | null
}

/** Sanitized for commissioner UI — never returns raw evidenceJson (no IP/UA/device values ever land there anyway, but this keeps the API contract explicit). */
export async function listDuplicateManagerFlags(leagueId: string): Promise<DuplicateManagerFlagSummary[]> {
  const flags = await prisma.integrityFlag.findMany({
    where: { leagueId, flagType: DUPLICATE_MANAGER_FLAG_TYPE },
    orderBy: { createdAt: "desc" },
  })

  return flags.map((flag) => {
    const evidence = (flag.evidenceJson ?? {}) as Partial<DuplicateManagerEvidence>
    const reasons = Array.from(new Set((evidence.comparisons ?? []).flatMap((c) => c.reasons)))
    return {
      id: flag.id,
      riskLevel: flag.severity,
      status: flag.status,
      summary: flag.summary,
      reasons,
      comparedTeams: flag.affectedTeamNames,
      createdAt: flag.createdAt.toISOString(),
      commissionerNote: flag.commissionerNote,
    }
  })
}

export type DuplicateManagerFlagAction = "allow" | "block" | "household" | "verification_requested"

const ACTION_TO_STATUS: Record<DuplicateManagerFlagAction, DuplicateManagerFlagStatus> = {
  allow: "allowed",
  block: "blocked",
  household: "household",
  verification_requested: "verification_requested",
}

/**
 * Resolves a pending/flagged duplicate-manager flag. For "allow"/"household" on a
 * flag that was blocking a join (status was "pending_review", no roster created
 * yet), this also completes the join by re-running the same roster-creation path
 * with the risk check bypassed — so leagueTeam/growthAttribution/dues side effects
 * stay identical to a normal join, not a re-implementation of them.
 */
export async function resolveDuplicateManagerFlag(input: {
  flagId: string
  leagueId: string
  action: DuplicateManagerFlagAction
  commissionerUserId: string
  commissionerNote?: string | null
}): Promise<{ ok: true; joinCompleted: boolean } | { ok: false; error: string }> {
  const flag = await prisma.integrityFlag.findUnique({ where: { id: input.flagId } })
  if (!flag || flag.flagType !== DUPLICATE_MANAGER_FLAG_TYPE) {
    return { ok: false, error: "Flag not found" }
  }
  // The caller already verified the requester is a commissioner of input.leagueId —
  // without this check they could resolve a flag from a league they don't manage
  // just by supplying its flagId.
  if (flag.leagueId !== input.leagueId) {
    return { ok: false, error: "Flag not found" }
  }
  if (flag.status !== "pending_review" && flag.status !== "flagged") {
    return { ok: false, error: "Flag already resolved" }
  }

  const evidence = (flag.evidenceJson ?? {}) as Partial<DuplicateManagerEvidence>
  const joiningUserId = evidence.joiningUserId
  const wasBlockingJoin = flag.status === "pending_review"

  if (input.action === "household" && joiningUserId) {
    const primarySuspect = evidence.comparisons?.[0]?.suspectAppUserId
    if (primarySuspect) {
      await recordHouseholdException({
        userIdA: joiningUserId,
        userIdB: primarySuspect,
        leagueId: flag.leagueId,
        reason: input.commissionerNote ?? "Marked as household by commissioner",
        approvedByUserId: input.commissionerUserId,
      })
    }
  }

  let joinCompleted = false
  if ((input.action === "allow" || input.action === "household") && wasBlockingJoin && joiningUserId) {
    const { createFantasyLeagueRosterBypassingRiskCheck } = await import("@/lib/invite-engine/InviteEngine")
    const result = await createFantasyLeagueRosterBypassingRiskCheck(flag.leagueId, joiningUserId)
    joinCompleted = result.ok && !result.alreadyMember
    if (result.ok && evidence.inviteLinkId) {
      const { incrementInviteUseCountById } = await import("@/lib/invite-engine/InviteEngine")
      await incrementInviteUseCountById(evidence.inviteLinkId).catch(() => {})
    }
  }

  await prisma.integrityFlag.update({
    where: { id: input.flagId },
    data: {
      status: ACTION_TO_STATUS[input.action],
      commissionerNote: input.commissionerNote ?? null,
      commissionerUserId: input.commissionerUserId,
      reviewedAt: new Date(),
    },
  })

  return { ok: true, joinCompleted }
}
