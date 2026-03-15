/**
 * ReputationEvidenceAggregator — collects evidence from DB and other sources, outputs per-dimension values for scoring.
 */

import { prisma } from '@/lib/prisma'
import type { AggregatedEvidence } from './ReputationScoreCalculator'
import type { ReputationEvidenceType } from './types'

/** Evidence row from DB. */
export interface EvidenceRow {
  evidenceType: string
  value: number
}

/**
 * Aggregate reputation evidence for a manager in a league into dimension buckets (0–100 scale inputs).
 * Uses ReputationEvidenceRecord; can be extended to pull from payments, matchups, trades, disputes.
 */
export async function aggregateReputationEvidence(
  leagueId: string,
  managerId: string,
  sport: string
): Promise<AggregatedEvidence> {
  const evidence = await prisma.reputationEvidenceRecord.findMany({
    where: { leagueId, managerId, sport },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const sums: Record<string, number> = {}
  const counts: Record<string, number> = {}
  for (const e of evidence) {
    const t = e.evidenceType
    sums[t] = (sums[t] ?? 0) + e.value
    counts[t] = (counts[t] ?? 0) + 1
  }

  const get = (type: ReputationEvidenceType, defaultVal: number) => {
    const v = sums[type]
    if (v == null) return defaultVal
    const c = counts[type] ?? 0
    return c > 0 ? Math.max(0, Math.min(100, v / c)) : defaultVal
  }

  return {
    reliability: get('payment_complete', 50) * 0.5 + get('lineup_consistency', 50) * 0.5,
    activity: get('activity_frequency', 50),
    tradeFairness: (get('trade_accept_rate', 50) + get('trade_fair_offers', 50)) / 2,
    sportsmanship: get('fair_play', 50) + (100 - get('toxic_flag', 0)) / 2,
    commissionerTrust: get('commissioner_action_positive', 50),
    toxicityRisk: get('toxic_flag', 0),
    participationQuality: get('lineup_consistency', 50) * 0.6 + get('activity_frequency', 50) * 0.4,
    responsiveness: get('responsiveness', 50),
  }
}

/**
 * Seed default evidence when none exists (so new managers get Neutral tier).
 */
export async function seedDefaultEvidenceIfEmpty(
  leagueId: string,
  managerId: string,
  sport: string
): Promise<void> {
  const count = await prisma.reputationEvidenceRecord.count({
    where: { leagueId, managerId, sport },
  })
  if (count > 0) return
  await prisma.reputationEvidenceRecord.createMany({
    data: [
      { leagueId, managerId, sport, evidenceType: 'activity_frequency', value: 50, sourceReference: 'default' },
      { leagueId, managerId, sport, evidenceType: 'trade_fair_offers', value: 50, sourceReference: 'default' },
      { leagueId, managerId, sport, evidenceType: 'fair_play', value: 50, sourceReference: 'default' },
    ],
  })
}
