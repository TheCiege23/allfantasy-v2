import type { RosterLegalityBlockingCode } from './blockingCodes'

export type RosterLegalityBlockingReason = {
  code: RosterLegalityBlockingCode
  message: string
  sourceIssueCode?: string
  playerIds?: string[]
  section?: 'starters' | 'bench' | 'ir' | 'taxi' | 'devy'
}

export type InvalidSlotAssignment = {
  playerId: string
  slotLabel?: string
  reasonCode: RosterLegalityBlockingCode
  message: string
}

/** Unified result for roster page, APIs, notifications, and AI Start/Sit. */
export type RosterLegalityFullResult = {
  isLegal: boolean
  isLineupLocked: boolean
  isRosterLocked: boolean
  blockingReasons: RosterLegalityBlockingReason[]
  warnings: string[]
  requiredMovesCount: number
  highlightedPlayerIds: string[]
  invalidSlotAssignments: InvalidSlotAssignment[]
  irViolations: Array<{ playerId: string; message: string }>
  taxiViolations: Array<{ playerId: string; message: string }>
  devyViolations: Array<{ playerId: string; message: string }>
  rosterOverflowCount: number
  nextAllowedActions: string[]
  canAutoFixWithAI: boolean
  weeklyReminderNeeded: boolean
  /** Raw engine issues (debug / admin) */
  rawIssueCodes: string[]
}
