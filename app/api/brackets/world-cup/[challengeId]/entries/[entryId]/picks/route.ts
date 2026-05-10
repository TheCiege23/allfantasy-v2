import { NextResponse } from "next/server"
import { z } from "zod"
import {
  WORLD_CUP_BRACKET_LOCKED_MESSAGE,
  getWorldCupChallengeView,
  getWorldCupBracketEntryDetail,
  saveWorldCupBracketPickForEntry,
} from "@/lib/world-cup"
import { isWorldCupChallengeLocked } from "@/lib/world-cup/worldCupBracketBuilder"
import { prisma } from "@/lib/prisma"
import { requireWorldCupApiUser, worldCupEntryParamsSchema } from "../../../../_utils"

export const runtime = "nodejs"

const savePickBodySchema = z.object({
  activeEntryId: z.string().min(1).optional(),
  matchId: z.string().min(1),
  selectedTeamId: z.string().nullable().optional(),
  selectedSide: z.enum(["home", "away"]).optional(),
  selectedSlotKey: z.string().nullable().optional(),
  selectedTeamName: z.string().nullable().optional(),
  round: z.string().optional(),
  sourceSlotKey: z.string().nullable().optional(),
  nextMatchId: z.string().nullable().optional(),
  nextMatchSlot: z.enum(["home", "away"]).nullable().optional(),
  matchNumber: z.number().int().positive().optional(),
})

const clearPicksBodySchema = z.object({
  matchIds: z.array(z.string().min(1)).min(1).max(64),
})

function isLockedErrorMessage(message: string): boolean {
  return message === WORLD_CUP_BRACKET_LOCKED_MESSAGE || message.toLowerCase().includes("locked")
}

export async function POST(request: Request, context: { params: { challengeId: string; entryId: string } }) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupEntryParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = savePickBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }
  if (parsed.data.activeEntryId && parsed.data.activeEntryId !== params.data.entryId) {
    return NextResponse.json({ error: "Pick entry mismatch" }, { status: 400 })
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[world-cup:picks:save-request]", {
      activeEntryId: parsed.data.activeEntryId ?? params.data.entryId,
      matchId: parsed.data.matchId,
      round: parsed.data.round ?? null,
      matchNumber: parsed.data.matchNumber ?? null,
      selectedTeamId: parsed.data.selectedTeamId ?? null,
      selectedSlotKey: parsed.data.selectedSlotKey ?? null,
    })
  }

  try {
    const entry = await getWorldCupBracketEntryDetail({
      entryId: params.data.entryId,
      userId: auth.user.id,
    })
    if (!entry || entry.challengeId !== params.data.challengeId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    const result = await saveWorldCupBracketPickForEntry({
      entryId: params.data.entryId,
      userId: auth.user.id,
      matchId: parsed.data.matchId,
      selectedTeamId: parsed.data.selectedTeamId,
      selectedTeamName: parsed.data.selectedTeamName,
      selectedSlotKey: parsed.data.selectedSlotKey,
      selectedSide: parsed.data.selectedSide,
      round: parsed.data.round,
      matchNumber: parsed.data.matchNumber,
      nextMatchId: parsed.data.nextMatchId,
      nextMatchSlot: parsed.data.nextMatchSlot,
    })
    const view = await getWorldCupChallengeView({
      challengeId: params.data.challengeId,
      user: auth.user,
    })

    return NextResponse.json({
      success: true,
      entry: result.entry,
      pick: result.pick,
      picks: result.picks,
      isComplete: result.isComplete,
      view,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save pick"
    if (isLockedErrorMessage(message)) {
      return NextResponse.json({ error: WORLD_CUP_BRACKET_LOCKED_MESSAGE }, { status: 423 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

/**
 * DELETE /api/brackets/world-cup/[challengeId]/entries/[entryId]/picks
 * Body: { matchIds: string[] }
 *
 * Clears specific picks for this entry (used when an earlier-round pick changes
 * and downstream picks are now invalid).
 */
export async function DELETE(
  request: Request,
  context: { params: { challengeId: string; entryId: string } }
) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const params = worldCupEntryParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = clearPicksBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    // Verify ownership
    const entry = await prisma.worldCupBracketEntry.findUnique({
      where: { id: params.data.entryId },
      include: { challenge: { include: { matches: true } } },
    })
    if (!entry || entry.userId !== auth.user.id) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }
    if (entry.challengeId !== params.data.challengeId) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    // Check challenge lock
    const lock = isWorldCupChallengeLocked({
      challenge: entry.challenge,
      matches: entry.challenge.matches,
      entry,
    })
    if (lock.locked) {
      return NextResponse.json({ error: WORLD_CUP_BRACKET_LOCKED_MESSAGE }, { status: 423 })
    }

    // Delete only the specified matchIds for this entry
    await prisma.worldCupBracketPick.deleteMany({
      where: {
        entryId: params.data.entryId,
        matchId: { in: parsed.data.matchIds },
      },
    })

    // Return remaining picks
    const remainingPicks = await prisma.worldCupBracketPick.findMany({
      where: {
        entryId: params.data.entryId,
        selectedTeamName: { not: "" },
        OR: [
          { selectedTeamId: { not: null } },
          { selectedSlotKey: { not: null } },
        ],
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ success: true, picks: remainingPicks })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to clear picks"
    if (isLockedErrorMessage(message)) {
      return NextResponse.json({ error: WORLD_CUP_BRACKET_LOCKED_MESSAGE }, { status: 423 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
