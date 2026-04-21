/**
 * Unified coaching plan contract for AI Coaching dashboard + `/api/ai/coaching/plan`.
 */

export type CoachingPlanMode = 'contend' | 'retool' | 'rebuild'

export type StrategyLens = 'win_now' | 'balanced' | 'future_focused'

export type PositionOutlook = 'strong' | 'average' | 'weak'

export type CoreAssetTag = 'core' | 'sell_high' | 'trade_block' | 'hold' | 'devy_stash'

export type CoachingPlanResponse = {
  mode: CoachingPlanMode
  timelineYears: number
  confidence: number
  summary: string
  priorityActions: string[]
  rosterStrengths: string[]
  rosterWeaknesses: string[]
  marketStrategy: string[]
  draftStrategy: string[]
  tradeStrategy: string[]
  waiverStrategy?: string[]
  devyStrategy?: string[]
  windowToWin?: {
    label: string
    risk: 'low' | 'medium' | 'high'
    explanation: string
  }
  positionHealth?: Array<{
    position: string
    strengthScore: number
    ageScore?: number
    depthScore?: number
    outlook: PositionOutlook
  }>
  futureCapital?: {
    summary: string
    picksByYear: Record<string, string[]>
  }
  coreAssets?: Array<{
    playerId: string
    name: string
    position: string
    team?: string | null
    imageUrl?: string | null
    age?: number | null
    tag: CoreAssetTag
    note?: string
  }>
  timelinePlan?: Array<{
    year: number
    title: string
    actions: string[]
  }>
  /** True when using roster/settings only */
  dataSparse?: boolean
  /** e.g. Dynasty, Devy, C2C */
  formatBadges?: string[]
}
