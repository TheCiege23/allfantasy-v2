/**
 * AI Mock Draft Simulator — platform-wide mock drafts with real user data and meta trends.
 */

import type { LeagueSport } from '@prisma/client'

export type DraftType = 'snake' | 'linear'

export interface DraftPlayer {
  name: string
  position: string
  team?: string | null
  adp?: number | null
  value?: number | null
  playerId?: string | null
}

export interface MockDraftConfig {
  sport: LeagueSport | string
  numTeams: number
  rounds: number
  draftType: DraftType
  teamNames: string[]
  /** 0-based slot for the human user; if null, all picks are AI */
  userSlot?: number | null
  /** Optional: pre-selected picks for user (in order of user's picks) */
  userPicks?: DraftPlayer[]
  isSuperflex?: boolean
  isTEP?: boolean
}

export interface DraftPickResult {
  overall: number
  round: number
  slot: number
  manager: string
  playerName: string
  position: string
  team?: string | null
  isUser: boolean
  adp?: number | null
}

export interface MetaDraftInput {
  sport: string
  available: DraftPlayer[]
  round: number
}

export interface MetaDraftOutput {
  /** Same order as available, with adjusted score (higher = more likely to be drafted here by meta) */
  playerScores: Array<{ name: string; position: string; adjustedScore: number; metaBoost: number }>
}
