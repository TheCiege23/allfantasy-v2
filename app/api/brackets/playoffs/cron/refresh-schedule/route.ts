import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { prisma } from "@/lib/prisma"
import { refreshPlayoffScheduleMetadataForChallenge } from "@/lib/playoffs/playoffSeriesSyncService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const booleanLike = z.preprocess((value) => {
  if (typeof value === "string") return value === "true" || value === "1"
  return value
}, z.boolean())

const querySchema = z.object({
  sport: z.enum(["all", "nba", "nhl"]).optional().default("all"),
  provider: z.enum(["espn"]).optional().default("espn"),
  windowDays: z.coerce.number().int().min(1).max(14).optional().default(7),
  dryRun: booleanLike.optional().default(false),
})

function isPlayoffCronAuthorized(request: NextRequest) {
  return requireCronAuth(request, "CRON_SECRET")
}

async function getActivePlayoffChallengeIds(sport: "all" | "nba" | "nhl") {
  const sports = sport === "all" ? ["nba", "nhl"] : [sport]
  const rows = await (prisma as any).playoffBracketChallenge.findMany({
    where: {
      sport: { in: sports },
      status: { in: ["open", "locked", "live"] },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })
  return rows.map((row: { id: string }) => row.id)
}

function sanitizeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]")
    .replace(/(key=)[^&\s]+/gi, "$1[redacted]")
}

export async function GET(request: NextRequest) {
  if (!isPlayoffCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const syncedAt = new Date().toISOString()

  try {
    const challengeIds = await getActivePlayoffChallengeIds(input.sport)
    const warnings: string[] = []
    let updatedSeries = 0
    let scheduleGamesSeen = 0
    let scheduleGamesMatched = 0
    let liveGamesMatched = 0
    let broadcastFieldsFound = 0
    let venueFieldsFound = 0

    for (const challengeId of challengeIds) {
      const result = await refreshPlayoffScheduleMetadataForChallenge({
        challengeId,
        provider: input.provider,
        windowDays: input.windowDays,
        dryRun: input.dryRun,
      })
      updatedSeries += result.updatedSeries
      scheduleGamesSeen += result.scheduleGamesSeen
      scheduleGamesMatched += result.scheduleGamesMatched
      liveGamesMatched += result.liveGamesMatched
      broadcastFieldsFound += result.broadcastFieldsFound
      venueFieldsFound += result.venueFieldsFound
      warnings.push(...result.warnings.map((warning) => `${challengeId}: ${warning}`))
    }

    return NextResponse.json({
      ok: true,
      job: "playoff_schedule_refresh",
      sport: input.sport,
      provider: input.provider,
      challengeCount: challengeIds.length,
      updatedSeries,
      scheduleGamesSeen,
      scheduleGamesMatched,
      liveGamesMatched,
      broadcastFieldsFound,
      venueFieldsFound,
      warnings,
      dryRun: input.dryRun,
      windowDays: input.windowDays,
      syncedAt,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        job: "playoff_schedule_refresh",
        sport: input.sport,
        provider: input.provider,
        error: "playoff_schedule_refresh_failed",
        message: sanitizeErrorMessage(error),
        syncedAt,
      },
      { status: 500 }
    )
  }
}
