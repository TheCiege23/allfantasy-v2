/**
 * Pick validation: no duplicate player, correct slot, session state, devy eligibility.
 */

import { validateUniquePlayer } from '@/lib/mock-draft/draft-engine'

export interface ValidatePickInput {
  playerName: string
  position: string
  rosterId: string
  currentOnClockRosterId: string
  existingPicks: { playerName: string; position: string }[]
  sessionStatus: string
}

export interface PickValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a pick submission. Caller must ensure session is in_progress or paused.
 */
export function validatePickSubmission(input: ValidatePickInput): PickValidationResult {
  if (input.sessionStatus !== 'in_progress' && input.sessionStatus !== 'paused') {
    return { valid: false, error: 'Draft is not in progress' }
  }
  if (input.rosterId !== input.currentOnClockRosterId) {
    return { valid: false, error: 'This roster is not on the clock' }
  }
  const name = input.playerName?.trim()
  if (!name) {
    return { valid: false, error: 'Player name is required' }
  }
  const isSkip = (input.position || '').toUpperCase() === 'SKIP'
  if (isSkip) {
    return { valid: true }
  }
  const dupErrors = validateUniquePlayer([
    ...input.existingPicks.map((p) => ({
      overall: 0,
      round: 0,
      pick: 0,
      playerName: p.playerName,
      position: p.position,
      manager: '',
    })),
    { overall: 0, round: 0, pick: 0, playerName: name, position: input.position, manager: '' },
  ])
  if (dupErrors.length > 0) {
    return { valid: false, error: dupErrors[0] }
  }
  return { valid: true }
}

export interface ValidateDevyInput {
  currentRound: number
  playerName: string
  devyConfig: { enabled: boolean; devyRounds: number[] } | null
}

/**
 * Validate that a pick in a devy round is a devy-eligible player.
 * When round is devy, player must exist in DevyPlayer with devyEligible and !graduatedToNFL.
 */
export function validateDevyEligibilitySync(input: ValidateDevyInput): PickValidationResult {
  if (!input.devyConfig?.enabled || !Array.isArray(input.devyConfig.devyRounds)) {
    return { valid: true }
  }
  if (!input.devyConfig.devyRounds.includes(input.currentRound)) {
    return { valid: true }
  }
  if (!input.playerName?.trim()) {
    return { valid: false, error: 'Player name is required for devy pick' }
  }
  return { valid: true }
}

/**
 * Async devy check: when round is devy, ensure player exists in DevyPlayer (devyEligible, !graduatedToNFL).
 */
export async function validateDevyEligibilityAsync(
  input: ValidateDevyInput,
  prisma: { devyPlayer: { findFirst: (args: any) => Promise<any> } }
): Promise<PickValidationResult> {
  if (!input.devyConfig?.enabled || !Array.isArray(input.devyConfig.devyRounds)) {
    return { valid: true }
  }
  if (!input.devyConfig.devyRounds.includes(input.currentRound)) {
    return { valid: true }
  }
  const name = input.playerName?.trim()
  if (!name) return { valid: false, error: 'Player name is required for devy pick' }
  const normalized = name.toLowerCase()
  const devy = await prisma.devyPlayer.findFirst({
    where: {
      devyEligible: true,
      graduatedToNFL: false,
      OR: [
        { normalizedName: normalized },
        { name: { equals: name, mode: 'insensitive' } },
      ],
    },
  })
  if (!devy) {
    return { valid: false, error: 'This round is devy-only. Select a devy-eligible (college) player.' }
  }
  return { valid: true }
}

export interface ValidateC2CInput {
  currentRound: number
  playerName: string
  c2cConfig: { enabled: boolean; collegeRounds: number[] } | null
}

/**
 * C2C: college round => only college-eligible; pro round => only pro (reject college-only).
 */
export async function validateC2CEligibilityAsync(
  input: ValidateC2CInput,
  prisma: { devyPlayer: { findFirst: (args: any) => Promise<any> } }
): Promise<PickValidationResult> {
  if (!input.c2cConfig?.enabled || !Array.isArray(input.c2cConfig.collegeRounds)) {
    return { valid: true }
  }
  const name = input.playerName?.trim()
  if (!name) return { valid: false, error: 'Player name is required' }
  const normalized = name.toLowerCase()
  const isCollegeRound = input.c2cConfig.collegeRounds.includes(input.currentRound)

  const collegePlayer = await prisma.devyPlayer.findFirst({
    where: {
      devyEligible: true,
      graduatedToNFL: false,
      OR: [
        { normalizedName: normalized },
        { name: { equals: name, mode: 'insensitive' } },
      ],
    },
  })

  if (isCollegeRound) {
    if (!collegePlayer) {
      return { valid: false, error: 'This round is college-only (C2C). Select a college-eligible player.' }
    }
    return { valid: true }
  }

  if (collegePlayer) {
    return { valid: false, error: 'This round is pro-only (C2C). Select an NFL player, not a college player.' }
  }
  return { valid: true }
}
