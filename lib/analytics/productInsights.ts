import { prisma } from '@/lib/prisma'
import { ANALYTICS_TOOL_ENGINE, ANALYTICS_TOOL_PRODUCT } from '@/lib/analytics/eventNames'

export type ProductInsightsResult = {
  since: string
  until: string
  countsByEvent: Array<{ event: string; _count: number }>
  dailySeries: Array<{ day: string; event: string; count: number }>
  createLeagueSummary: {
    serverSuccess: number
    serverFail: number
    clientSuccess: number
    clientFail: number
    funnelOpen: number
    funnelAbandon: number
  }
  engagementSummary: {
    draftCompleted: number
    waiverRuns: number
    tradesProcessed: number
    matchupViews: number
    commissionerSettings: number
    aiMatchup: number
    aiStartSit: number
    joinInviteTeamClaims: number
    draftRoomStarts: number
    draftRoomPicks: number
    draftRoomQueueAdds: number
    draftRoomChatSends: number
    draftRoomInviteCopies: number
    draftRoomCommissionerAutopickLeague: number
    draftRoomCommissionerForceAutopick: number
    draftRoomClaimSlots: number
  }
  engineSampleCounts: Array<{ event: string; _count: number }>
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

export async function getProductInsights(args: { since: Date; until?: Date }): Promise<ProductInsightsResult> {
  const until = args.until ?? new Date()
  const since = startOfUtcDay(args.since)

  const [countsByEvent, engineSampleCounts, dailyRows] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since, lte: until }, toolKey: { in: [ANALYTICS_TOOL_PRODUCT, ANALYTICS_TOOL_ENGINE] } },
      _count: true,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { createdAt: { gte: since, lte: until }, toolKey: ANALYTICS_TOOL_ENGINE },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ day: Date; event: string; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, "event", COUNT(*)::bigint AS count
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${since}
        AND "createdAt" <= ${until}
        AND ("toolKey" = ${ANALYTICS_TOOL_PRODUCT} OR "toolKey" = ${ANALYTICS_TOOL_ENGINE})
      GROUP BY 1, 2
      ORDER BY 1 ASC, 2 ASC
    `,
  ])

  const mapCount = (name: string) => countsByEvent.find((c) => c.event === name)?._count ?? 0

  return {
    since: since.toISOString(),
    until: until.toISOString(),
    countsByEvent: countsByEvent.map((c) => ({ event: c.event, _count: c._count })),
    dailySeries: dailyRows.map((r) => ({
      day: new Date(r.day).toISOString().slice(0, 10),
      event: r.event,
      count: Number(r.count),
    })),
    createLeagueSummary: {
      serverSuccess: mapCount('product.create_league.server_success'),
      serverFail: mapCount('product.create_league.server_fail'),
      clientSuccess: mapCount('product.create_league.success_client'),
      clientFail: mapCount('product.create_league.fail_client'),
      funnelOpen: mapCount('product.create_league.funnel_open'),
      funnelAbandon: mapCount('product.create_league.funnel_abandon'),
    },
    engagementSummary: {
      draftCompleted: mapCount('engagement.draft_completed'),
      waiverRuns: mapCount('engagement.waiver_run_completed'),
      tradesProcessed: mapCount('engagement.trade_processed'),
      matchupViews: mapCount('engagement.matchup_center_view'),
      commissionerSettings: mapCount('engagement.commissioner_settings_save'),
      aiMatchup: mapCount('ai.matchup_analysis'),
      aiStartSit: mapCount('ai.start_sit'),
      joinInviteTeamClaims: mapCount('engagement.join_invite.team_claim'),
      draftRoomStarts: mapCount('engagement.draft_room.start_draft'),
      draftRoomPicks: mapCount('engagement.draft_room.pick'),
      draftRoomQueueAdds: mapCount('engagement.draft_room.queue_add'),
      draftRoomChatSends: mapCount('engagement.draft_room.chat_send'),
      draftRoomInviteCopies: mapCount('engagement.draft_room.invite_copy'),
      draftRoomCommissionerAutopickLeague: mapCount('engagement.draft_room.commissioner_autopick_league'),
      draftRoomCommissionerForceAutopick: mapCount('engagement.draft_room.commissioner_force_autopick'),
      draftRoomClaimSlots: mapCount('engagement.draft_room.claim_slot'),
    },
    engineSampleCounts: engineSampleCounts.map((c) => ({ event: c.event, _count: c._count })),
  }
}
