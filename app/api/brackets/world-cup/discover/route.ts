import { NextResponse } from "next/server"
import { z } from "zod"
import { listPublicWorldCupChallengesForDiscover } from "@/lib/world-cup/worldCupDiscoverService"

export const runtime = "nodejs"

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  seasonYear: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(["open", "locked", "final", "all"]).optional().default("all"),
  take: z.coerce.number().int().min(1).max(100).optional(),
})

export async function GET(request: Request) {
  const url = new URL(request.url)
  const raw = Object.fromEntries(url.searchParams.entries())
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { q, seasonYear, status, take } = parsed.data
  const challenges = await listPublicWorldCupChallengesForDiscover({
    q: q || undefined,
    seasonYear: seasonYear ?? undefined,
    status: status === "all" ? undefined : status,
    take,
  })

  return NextResponse.json({ challenges })
}
