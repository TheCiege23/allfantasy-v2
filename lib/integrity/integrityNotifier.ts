import "server-only"

import { prisma } from "@/lib/prisma"
import { dispatchNotification } from "@/lib/notifications/NotificationDispatcher"

export async function notifyCommissionerOfFlag(flagId: string): Promise<void> {
  const flag = await prisma.integrityFlag.findFirst({
    where: { id: flagId },
    include: {
      league: { select: { userId: true } },
    },
  })
  if (!flag) return
  if (flag.notifiedAt) return

  const title =
    flag.flagType === "collusion" ? "⚠️ Potential collusion detected" : "⚠️ Potential tanking detected"
  const severity = flag.severity === "high" ? "high" : "medium"

  await dispatchNotification({
    userIds: [flag.league.userId],
    category: "commissioner_alerts",
    type: flag.flagType === "collusion" ? "integrity_collusion_flag" : "integrity_tanking_flag",
    title,
    body: flag.summary,
    severity,
    actionHref: `/league/${flag.leagueId}/commissioner/integrity`,
    actionLabel: "Review flag",
    meta: { leagueId: flag.leagueId, flagId: flag.id, flagType: flag.flagType },
  })

  await prisma.integrityFlag.update({
    where: { id: flagId },
    data: { notifiedAt: new Date() },
  })
}
