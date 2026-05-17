import { NextResponse } from "next/server"
import { z } from "zod"
import { createPlayoffBracketChallenge, listUserPlayoffChallenges } from "@/lib/playoffs/playoffService"
import type { PlayoffSport } from "@/lib/playoffs/types"
import { requireWorldCupApiUser } from "./_utils"

export const runtime = "nodejs"

const createPlayoffChallengeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  sport: z.enum(["nba", "nhl"]),
  seasonYear: z.coerce.number().int().min(2024).max(2100).optional(),
  isTestMode: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: Request) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const sportParam = searchParams.get("sport")
  const sport = sportParam === "nba" || sportParam === "nhl" ? sportParam : null

  try {
    const challenges = await listUserPlayoffChallenges(auth.user.id)
    return NextResponse.json({
      ok: true,
      challenges: sport ? challenges.filter((challenge) => challenge.sport === sport) : challenges,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load playoff challenges",
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireWorldCupApiUser(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const parsed = createPlayoffChallengeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await createPlayoffBracketChallenge({
      user: auth.user,
      name: parsed.data.name,
      sport: parsed.data.sport,
      seasonYear: parsed.data.seasonYear,
      isTestMode: parsed.data.isTestMode,
      config: parsed.data.config as any,
    })

    return NextResponse.json({
      ok: true,
      challengeId: result.challengeId,
      entryId: result.entryId,
      sport: result.sport as PlayoffSport,
      name: result.name,
      redirectUrl: result.redirectUrl,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create playoff challenge",
      },
      { status: 500 }
    )
  }
}
