import { NextResponse } from "next/server"
import { z } from "zod"
import {
  createWorldCupBracketChallenge,
  recalculateWorldCupChallenge,
  updateWorldCupChallengeSettings,
} from "@/lib/world-cup"
import { requireWorldCupApiUser } from "@/app/api/brackets/world-cup/_utils"
import { verifyWorldCupDevQaRequest } from "@/lib/world-cup/worldCupDevQaAccess"
import { loadWorldCupTestFixtures } from "@/lib/world-cup/worldCupSimulationService"

export const runtime = "nodejs"

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  seasonYear: z.coerce.number().int().min(2026).max(2100).optional(),
  /** Seed demo teams + Round of 32-style fixtures (same as admin load-test-fixtures). Default true. */
  loadTestFixtures: z.boolean().optional().default(true),
  /** Allow simulate-match / simulate-round flows. Default true. */
  enableSimulation: z.boolean().optional().default(true),
  dryRunFixtures: z.boolean().optional().default(false),
  /** Run leaderboard scoring after seed (cheap sanity check). Default false. */
  recalculate: z.boolean().optional().default(false),
})

export async function GET(request: Request) {
  if (!verifyWorldCupDevQaRequest(request)) {
    return NextResponse.json({ error: "World Cup QA helpers are disabled" }, { status: 404 })
  }
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  return NextResponse.json({
    ok: true,
    usage: {
      method: "POST",
      auth: "Session cookie for NextAuth user + dev QA gate (see docs/world-cup-bracket-qa-checklist.md)",
      bodyFields:
        "name?, visibility?, seasonYear?, loadTestFixtures?, enableSimulation?, dryRunFixtures?, recalculate?",
    },
  })
}

export async function POST(request: Request) {
  if (!verifyWorldCupDevQaRequest(request)) {
    return NextResponse.json({ error: "World Cup QA helpers are disabled" }, { status: 404 })
  }

  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const name = parsed.data.name ?? `QA Seed ${new Date().toISOString().slice(0, 16)}`
  const visibility = parsed.data.visibility ?? "public"

  try {
    const created = await createWorldCupBracketChallenge({
      user: auth.user,
      name,
      seasonYear: parsed.data.seasonYear ?? 2026,
      visibility,
      pickLockStrategy: "tournament_start",
      pickLockAt: null,
      includeThirdPlace: false,
      maxParticipants: 100,
      maxEntriesPerParticipant: 5,
    })

    await updateWorldCupChallengeSettings({
      challengeId: created.challengeId,
      isTestMode: true,
      simulationEnabled: parsed.data.enableSimulation,
    })

    let fixturesResult: Awaited<ReturnType<typeof loadWorldCupTestFixtures>> | null = null
    if (parsed.data.loadTestFixtures) {
      fixturesResult = await loadWorldCupTestFixtures(created.challengeId, {
        dryRun: parsed.data.dryRunFixtures,
      })
      if (!fixturesResult.success) {
        return NextResponse.json(
          {
            ok: false,
            challengeId: created.challengeId,
            inviteCode: created.inviteCode,
            fixturesError: fixturesResult.warnings[0] ?? "Fixture seed failed",
            fixturesResult,
          },
          { status: 422 }
        )
      }
    }

    let leaderboard: Awaited<ReturnType<typeof recalculateWorldCupChallenge>> | null = null
    if (parsed.data.recalculate) {
      leaderboard = await recalculateWorldCupChallenge(created.challengeId)
    }

    return NextResponse.json({
      ok: true,
      challengeId: created.challengeId,
      inviteCode: created.inviteCode,
      inviteUrl: created.inviteUrl,
      visibility,
      fixturesLoaded: Boolean(parsed.data.loadTestFixtures),
      fixturesResult,
      simulationEnabled: parsed.data.enableSimulation,
      recalculated: parsed.data.recalculate,
      leaderboardPreview: Array.isArray(leaderboard) ? leaderboard.slice(0, 5) : leaderboard,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "QA seed failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
