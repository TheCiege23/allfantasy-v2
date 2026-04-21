import type { LineupValidationContext } from '@/lib/roster-lineup-engine/types'
import { validateCanonicalRosterPayload } from '@/lib/roster-lineup-engine/rosterValidationService'
import { resolveFullLineupLockContext, type LineupLockResolveArgs } from '@/lib/roster-lineup-engine/lineupLockService'
import { getNormalizedLineupSections, getSlotLimitsFromTemplate } from '@/lib/roster/LineupTemplateValidation'
import { mapIssueCodeToBlockingCode, type RosterLegalityBlockingCode } from './blockingCodes'
import type { RosterLegalityFullResult, RosterLegalityBlockingReason, InvalidSlotAssignment } from './types'

function uniq(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

/**
 * Async full evaluation: validation + lineup lock context + mapped blocking surface for UI/notifications.
 */
export async function evaluateFullRosterLegalityAsync(input: {
  playerData: unknown
  ctx: LineupValidationContext
  lockArgs: LineupLockResolveArgs
}): Promise<RosterLegalityFullResult> {
  const validation = validateCanonicalRosterPayload(input.playerData, input.ctx)
  const lockCtx = await resolveFullLineupLockContext(input.lockArgs)

  const blockingReasons: RosterLegalityBlockingReason[] = []
  const irViolations: RosterLegalityFullResult['irViolations'] = []
  const taxiViolations: RosterLegalityFullResult['taxiViolations'] = []
  const devyViolations: RosterLegalityFullResult['devyViolations'] = []
  const invalidSlotAssignments: InvalidSlotAssignment[] = []
  const highlightedPlayerIds: string[] = []
  let rosterOverflowCount = 0

  const rawIssueCodes: string[] = []

  for (const issue of validation.issues) {
    rawIssueCodes.push(issue.code)
    const blocking = mapIssueCodeToBlockingCode(issue.code) as RosterLegalityBlockingCode
    blockingReasons.push({
      code: blocking,
      message: issue.message,
      sourceIssueCode: issue.code,
      playerIds: issue.playerId ? [issue.playerId] : undefined,
      section: issue.section,
    })
    if (issue.playerId) highlightedPlayerIds.push(issue.playerId)
    if (issue.code === 'ir_ineligible_status' && issue.playerId) {
      irViolations.push({ playerId: issue.playerId, message: issue.message })
    }
    if ((issue.code === 'taxi_too_experienced' || issue.code === 'taxi_non_rookie_disallowed') && issue.playerId) {
      taxiViolations.push({ playerId: issue.playerId, message: issue.message })
    }
    if (issue.code === 'devy_ineligible' && issue.playerId) {
      devyViolations.push({ playerId: issue.playerId, message: issue.message })
    }
    if (issue.code === 'section_overflow' || issue.code === 'roster_total_over_limit') {
      rosterOverflowCount += 1
    }
    if (
      issue.code === 'starter_position_ineligible' ||
      issue.code === 'STARTER_POSITION_INELIGIBLE' ||
      issue.code?.toLowerCase() === 'starter_position_ineligible'
    ) {
      if (issue.playerId) {
        invalidSlotAssignments.push({
          playerId: issue.playerId,
          reasonCode: 'INVALID_POSITION_ASSIGNMENT',
          message: issue.message,
        })
      }
    }
  }

  const sections = getNormalizedLineupSections(input.playerData)
  const starterCount = sections.starters.length
  const limits = getSlotLimitsFromTemplate(input.ctx.template)
  const starterRequired = limits.starters
  if (starterRequired > 0 && starterCount < starterRequired) {
    blockingReasons.push({
      code: 'STARTER_SLOT_EMPTY_WHEN_REQUIRED',
      message: `Not enough starters (${starterCount}/${starterRequired}).`,
    })
  }

  for (const pid of lockCtx.lockedPlayerIds) {
    highlightedPlayerIds.push(pid)
    invalidSlotAssignments.push({
      playerId: pid,
      reasonCode: 'SLOT_LOCKED_BY_GAME_START',
      message: lockCtx.perPlayerReasons[pid] ?? 'Player is locked.',
    })
  }

  if (lockCtx.locked && lockCtx.policy !== 'kickoff') {
    blockingReasons.push({
      code: 'LEAGUE_LINEUP_LOCK_ACTIVE',
      message: lockCtx.reason ?? 'Lineup is locked for this period.',
    })
  }

  const isLineupLocked = lockCtx.locked
  const isRosterLocked = Boolean(input.ctx.league.lockAllMoves) || isLineupLocked

  const requiredMovesCount = validation.issues.filter((i) =>
    [
      'section_overflow',
      'roster_total_over_limit',
      'ir_ineligible_status',
      'duplicate_player',
      'taxi_too_experienced',
      'taxi_non_rookie_disallowed',
      'devy_ineligible',
    ].includes(i.code),
  ).length

  const isLegal =
    validation.ok && !isLineupLocked && (starterRequired === 0 || starterCount >= starterRequired)

  const nextAllowedActions: string[] = []
  if (!isLegal) {
    nextAllowedActions.push('review_starters_bench')
    if (irViolations.length) nextAllowedActions.push('fix_ir')
    if (taxiViolations.length) nextAllowedActions.push('fix_taxi')
    if (devyViolations.length) nextAllowedActions.push('fix_devy')
  }

  return {
    isLegal,
    isLineupLocked,
    isRosterLocked,
    blockingReasons,
    warnings: [],
    requiredMovesCount,
    highlightedPlayerIds: uniq(highlightedPlayerIds),
    invalidSlotAssignments,
    irViolations,
    taxiViolations,
    devyViolations,
    rosterOverflowCount,
    nextAllowedActions,
    canAutoFixWithAI: false,
    weeklyReminderNeeded: !isLegal,
    rawIssueCodes,
  }
}
