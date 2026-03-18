/**
 * Frontend types for Salary Cap summary and UI state. PROMPT 340.
 */

export interface SalaryCapSummaryConfig {
  mode: string
  startupCap: number
  capGrowthPercent: number
  contractMinYears: number
  contractMaxYears: number
  rookieContractYears: number
  minimumSalary: number
  deadMoneyEnabled: boolean
  rolloverEnabled: boolean
  rolloverMax: number
  capFloorEnabled?: boolean
  capFloorAmount?: number | null
  extensionsEnabled: boolean
  franchiseTagEnabled: boolean
  startupDraftType: string
  futureDraftType: string
  auctionHoldback: number
  weightedLotteryEnabled: boolean
  offseasonPhase: string | null
}

export interface SalaryCapSummaryLedger {
  rosterId: string
  capYear: number
  totalCapHit: number
  deadMoneyHit: number
  rolloverUsed: number
  capSpace: number
}

export interface FutureCapYearUI {
  capYear: number
  capCeiling: number
  totalCapHit: number
  deadMoney: number
  projectedSpace: number
  contractCount: number
}

export interface ContractRowUI {
  id: string
  playerId: string
  playerName: string | null
  position: string | null
  salary: number
  yearsTotal: number
  contractYear: number
  yearsRemaining: number
  status: string
  source: string
}

export interface SalaryCapSummary {
  config: SalaryCapSummaryConfig
  myRosterId?: string
  ledger: SalaryCapSummaryLedger | null
  futureProjection: FutureCapYearUI[]
  contracts: ContractRowUI[]
  expiringCount: number
  extensionCandidatesCount: number
  tagCandidatesCount: number
  deadMoneyTotal: number
  rookieContractCount: number
  events: { eventType: string; metadata: unknown; createdAt: string }[]
  lottery: { seed: string | null; order: unknown } | null
}

export type SalaryCapView = 'home' | 'cap-dashboard' | 'contracts' | 'team-builder' | 'draft' | 'ai' | 'rules'
