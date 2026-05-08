import { NextResponse } from "next/server"
import { z } from "zod"
import { createWorldCupBracketChallenge } from "@/lib/world-cup"
import { requireWorldCupApiUser } from "../_utils"

export const runtime = "nodejs"

const createWorldCupChallengeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  seasonYear: z.coerce.number().int().min(2026).max(2100).default(2026),
  visibility: z.enum(["public", "private"]).default("private"),
  pickLockStrategy: z.enum(["per_match", "tournament_start"]).default("tournament_start"),
  pickLockAt: z.string().datetime().nullable().optional(),
  includeThirdPlace: z.boolean().optional(),
  scoring: z
    .object({
      roundOf32Points: z.number().int().min(0).optional(),
      roundOf16Points: z.number().int().min(0).optional(),
      quarterFinalPoints: z.number().int().min(0).optional(),
      semiFinalPoints: z.number().int().min(0).optional(),
      finalPoints: z.number().int().min(0).optional(),
      championBonusPoints: z.number().int().min(0).optional(),
      thirdPlacePoints: z.number().int().min(0).nullable().optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = createWorldCupChallengeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const result = await createWorldCupBracketChallenge({
    user: auth.user,
    name: parsed.data.name,
    seasonYear: parsed.data.seasonYear,
    visibility: parsed.data.visibility,
    pickLockStrategy: parsed.data.pickLockStrategy,
    pickLockAt: parsed.data.pickLockAt ? new Date(parsed.data.pickLockAt) : null,
    includeThirdPlace: parsed.data.includeThirdPlace,
    scoring: parsed.data.scoring,
  })

  const challengeId = result.challengeId ?? (result as { id?: string }).id
  return NextResponse.json({
    ok: true,
    ...result,
    id: challengeId,
    challenge: { id: challengeId },
  })
}
