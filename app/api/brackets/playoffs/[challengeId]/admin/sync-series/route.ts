import { NextResponse } from "next/server"
import { requireCronAuth } from "@/app/api/cron/_auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { syncPlayoffChallengeSeries } from "@/lib/playoffs/playoffSeriesSyncService"
import { playoffChallengeParamsSchema } from "../../../_utils"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SessionUser = { id?: string | null }

async function canSyncChallenge(request: Request, challengeId: string): Promise<boolean> {
  const devOpen =
    process.env.NODE_ENV === "development" && !String(process.env.CRON_SECRET ?? "").trim()
  if (devOpen || requireCronAuth(request as any, "CRON_SECRET")) return true

  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const userId = session?.user?.id
  if (!userId) return false

  const challenge = await (prisma as any).playoffBracketChallenge.findUnique({
    where: { id: challengeId },
    select: { ownerUserId: true },
  })

  return challenge?.ownerUserId === userId
}

export async function POST(request: Request, context: { params: { challengeId: string } }) {
  const params = playoffChallengeParamsSchema.safeParse(context.params)
  if (!params.success) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
  }

  if (!(await canSyncChallenge(request, params.data.challengeId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
