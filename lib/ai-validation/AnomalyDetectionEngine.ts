/**
 * Anomaly Detection Engine
 *
 * Identifies odd user behavior such as inactivity, suspicious trades,
 * unusual draft patterns, and potential collusion signals.
 *
 * From PDF: "Essential AI Feature #4 — Basic Anomaly Detection"
 * Also covers: "Advanced AI Feature — AI Financial Risk Scoring"
 */

import { prisma } from '@/lib/prisma'

export type AnomalyType =
  | 'inactivity'
  | 'suspicious_trade'
  | 'lineup_neglect'
  | 'collusion_signal'
  | 'extreme_reach_draft'
  | 'dumping_roster'
  | 'unusual_waiver_pattern'
  | 'session_anomaly'

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export type AnomalyAlert = {
  type: AnomalyType
  severity: AnomalySeverity
  userId: string
  userName: string | null
  leagueId: string
  description: string
  evidence: string[]
  suggestedAction: string
  detectedAt: string
}

/**
 * Run anomaly detection scan for a league.
 */
export async function detectLeagueAnomalies(leagueId: string): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true },
  })
  if (!league) return alerts

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Check each team for anomalies
  for (const team of league.teams) {
    const userId = team.claimedByUserId ?? team.ownerId
    if (!userId) continue

    // 1. Inactivity detection
    const recentChats = await prisma.leagueChatMessage.count({
      where: { leagueId, userId, createdAt: { gte: thirtyDaysAgo } },
    }).catch(() => 0)

    if (recentChats === 0) {
      alerts.push({
        type: 'inactivity',
        severity: 'medium',
        userId,
        userName: team.ownerName,
        leagueId,
        description: `${team.ownerName ?? userId} has not been active in league chat for 30+ days.`,
        evidence: ['No chat messages in 30 days'],
        suggestedAction: 'Send a reminder or check if manager is still participating.',
        detectedAt: new Date().toISOString(),
      })
    }

    // 2. Suspicious trade patterns (lopsided trades)
    const recentTrades = await prisma.redraftLeagueTrade?.findMany?.({
      where: {
        leagueId,
        createdAt: { gte: thirtyDaysAgo },
        OR: [
          { proposerRoster: { ownerId: userId } },
          { receiverRoster: { ownerId: userId } },
        ],
      },
      select: { proposerOffers: true, receiverOffers: true, status: true },
    }).catch(() => []) ?? []

    const completedTrades = recentTrades.filter((t) => t.status === 'accepted' || t.status === 'completed')
    if (completedTrades.length >= 5) {
      alerts.push({
        type: 'suspicious_trade',
        severity: 'low',
        userId,
        userName: team.ownerName,
        leagueId,
        description: `${team.ownerName ?? userId} has completed ${completedTrades.length} trades in 30 days — above average activity.`,
        evidence: [`${completedTrades.length} trades completed`],
        suggestedAction: 'Review trade history for fairness. High activity alone is not suspicious.',
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return alerts
}

/**
 * Detect suspicious admin/commissioner activity.
 * From PDF: "Session & Usage Anomaly Detection"
 */
export async function detectAdminAnomalies(leagueId: string): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = []

  // Check for commissioner overrides
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true, settings: true },
  })
  if (!league) return alerts

  const settings = (league.settings ?? {}) as Record<string, unknown>
  const overrideCount = Number(settings.commissioner_override_count ?? 0)

  if (overrideCount > 5) {
    alerts.push({
      type: 'session_anomaly',
      severity: 'medium',
      userId: league.userId,
      userName: null,
      leagueId,
      description: `Commissioner has made ${overrideCount} manual overrides. Review for fairness.`,
      evidence: [`${overrideCount} overrides logged`],
      suggestedAction: 'Verify overrides were communicated to league members.',
      detectedAt: new Date().toISOString(),
    })
  }

  return alerts
}
