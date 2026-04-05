import { NextRequest, NextResponse } from "next/server"

import { requireCronAuth } from "@/app/api/cron/_auth"
import { enqueueCollusionScan } from "@/lib/integrity/enqueueCollusionScan"
import { checkLeagueCommissionerEntitlement } from "@/lib/integrity/leagueEntitlement"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, "CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const trades = await prisma.redraftLeagueTrade.findMany({
    where: {
      status: "accepted",
      createdAt: { gte: since },
    },
    select: { id: true, leagueId: true, proposerRosterId: true, receiverRosterId: true },
  })

  const leagueChecked = new Set<string>()
  let queued = 0

  for (const t of trades) {
    leagueChecked.add(t.leagueId)
    const entitled = await checkLeagueCommissionerEntitlement(t.leagueId)
    if (!entitled) continue

    const existing = await prisma.integrityFlag.findFirst({
      where: { leagueId: t.leagueId, tradeTransactionId: t.id },
    })
    if (existing) continue

    await enqueueCollusionScan(t.leagueId, t.id, [t.proposerRosterId, t.receiverRosterId])
    queued += 1
  }

  return NextResponse.json({
    ok: true,
    queued,
    leaguesChecked: leagueChecked.size,
  })
}
