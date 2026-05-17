import { NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { syncPlayoffChallengeSeries } from "@/lib/playoffs/playoffSeriesSyncService"
import { playoffChallengeParamsSchema } from "../../../_utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: { challengeId: string } }) {
  const devOpen =
    process.env.NODE_ENV === "development" && !String(process.env.CRON_SECRET ?? "").trim()
  if (!devOpen && !requireCronAuth(request as any, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = playoffChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  try {
    const result = await syncPlayoffChallengeSeries({
      challengeId: params.data.challengeId,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync playoff series",
      },
      { status: 500 }
    )
  }
}
