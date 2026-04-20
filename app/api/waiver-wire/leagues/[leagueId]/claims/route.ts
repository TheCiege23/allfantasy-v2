import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createClaim,
  getClaimsByRoster,
  getEffectiveLeagueWaiverSettings,
  getPendingClaims,
  getProcessedClaimsAndTransactions,
} from "@/lib/waiver-wire"
import { validateAiActionExecution } from '@/lib/ai/action-validation'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'
import { logAction } from '@/server/services/auditService'

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const [leagueAsOwner, rosterAsMember] = await Promise.all([
    (prisma as any).league.findFirst({ where: { id: leagueId, userId } }),
    (prisma as any).roster.findFirst({ where: { leagueId, platformUserId: userId }, select: { id: true } }),
  ])
  if (!leagueAsOwner && !rosterAsMember) return NextResponse.json({ error: "League not found" }, { status: 404 })

  const type = req.nextUrl.searchParams?.get("type") || "pending"
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams?.get("limit") || "50")))

  if (type === "history") {
    const { claims, transactions } = await getProcessedClaimsAndTransactions(leagueId, limit)
    return NextResponse.json({ claims, transactions })
  }

  const pending = await getPendingClaims(leagueId)
  return NextResponse.json({ claims: pending })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leagueId = params.leagueId
  const roster = await (prisma as any).roster.findFirst({
    where: { leagueId, platformUserId: userId },
  })
  if (!roster) return NextResponse.json({ error: "Roster not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  const aiValidation = validateAiActionExecution({
    body,
    action: 'add_waiver_claim',
    leagueId,
  })
  if (!aiValidation.ok) {
    return NextResponse.json({ error: aiValidation.error }, { status: aiValidation.status })
  }

  const gate = await assertLeagueActionGate(leagueId, userId, 'waiver_claim_submit')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
  }

  const addPlayerId = body.addPlayerId ?? body.add_player_id
  if (!addPlayerId) return NextResponse.json({ error: "addPlayerId required" }, { status: 400 })

  const pending = await getClaimsByRoster(roster.id, "pending")
  if (pending.some((c: { addPlayerId: string }) => c.addPlayerId === String(addPlayerId))) {
    return NextResponse.json(
      { error: "You already have a pending claim for this player." },
      { status: 409 }
    )
  }

  try {
    const claim = await createClaim(leagueId, roster.id, {
      addPlayerId: String(addPlayerId),
      dropPlayerId: body.dropPlayerId ?? body.drop_player_id ?? null,
      faabBid: body.faabBid ?? body.faab_bid ?? null,
      priorityOrder: body.priorityOrder ?? body.priority_order,
      userId,
      claimType: typeof body.claimType === "string" ? body.claimType : "add_drop",
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    })

    void logAction({
      leagueId,
      userId,
      actionType: 'waiver_claim_submit',
      entityType: 'waiver',
      entityId: claim.id,
      afterState: { addPlayerId: String(addPlayerId), rosterId: roster.id },
    }).catch(() => {})

    void import('@/lib/league-notifications/realtimeHint').then(({ publishLeagueRealtimeHint }) =>
      publishLeagueRealtimeHint(leagueId, 'waiver_claim_submitted', 'New waiver claim', {
        claimId: claim.id,
        rosterId: roster.id,
      }),
    )

    const eff = await getEffectiveLeagueWaiverSettings(leagueId)
    let fcfsProcessWarning: string | undefined
    if (eff.waiverType === "fcfs") {
      try {
        const { processWaiverClaimsForLeague } = await import("@/lib/waiver-wire/process-engine")
        await processWaiverClaimsForLeague(leagueId, {
          runType: "fcfs_immediate",
          processedByUserId: userId,
        })
      } catch (err) {
        fcfsProcessWarning = err instanceof Error ? err.message : "FCFS processing failed"
        console.error("[waiver-wire] FCFS immediate processing error", err)
      }
    }

    return NextResponse.json({
      claim,
      fcfsProcessedImmediately: eff.waiverType === "fcfs" && !fcfsProcessWarning,
      ...(fcfsProcessWarning ? { fcfsProcessWarning } : {}),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create claim"
    if (message.includes("does not belong to this league") || message.includes("Roster not found")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    if (message.includes("eliminated")) {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    if (message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 423 })
    }
    if (
      message.includes("Claim limit") ||
      message.includes("maximum pending") ||
      message.includes("temporarily blocked") ||
      message.includes("cannot be submitted") ||
      message.includes("submission window") ||
      message.includes("Waiver claims are closed") ||
      message.includes("Waiver submissions are") ||
      message.includes("frozen for this league")
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    throw e
  }
}
