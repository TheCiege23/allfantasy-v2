import type { CommissionerPlatformResponse } from '../../contracts'

/**
 * Manager Intelligence owns behavioral pattern analysis only — never
 * fantasy strategy, player evaluation, or message content. Per the
 * Manager Intelligence blueprint's Privacy & Trust section: no single
 * overall "manager score" exists here — reliability is one specific,
 * labeled trait among several, never a collapsed grade.
 */
export interface ManagerDnaProfile {
  id: string
  managerName: string
  /** A descriptive archetype, never a permanent label — see the blueprint's DNA naming discipline. */
  archetype: string
  tenureSeasons: number
  engagementTrend: 'rising' | 'steady' | 'declining'
  reliabilityScore: number
  /** League-continuity risk framing only — never a characterological judgment. */
  riskFlag?: string
  recognition?: string
}

export interface ManagerIntelligenceClient {
  getManagerDirectory(): Promise<CommissionerPlatformResponse<ManagerDnaProfile[]>>
}
