/**
 * Learning hooks — persist via Prisma / events; used as light tie-breakers only.
 */

export interface UserDraftPreferenceProfile {
  userId: string
  queueFrequencyByPlayerKey: Record<string, number>
  reachTendency: number
  youthVsVetLean: number
  tradeUpAggression: number
  tradeDownWillingness: number
  starVsValueLean: number
  updatedAt: string
}

export interface ManagerTendencyProfile {
  managerId: string
  earlyReachRate: number
  lateValueRate: number
  positionRunParticipation: number
}

export interface SiteTrendAdpProfile {
  playerKey: string
  momentum: 'rising' | 'falling' | 'stable'
  sampleSize: number
}
