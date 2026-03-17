/**
 * Validate mapped import preview (and optional raw payload). Deterministic, rules-based.
 */

import type { DraftImportPreview, MappedPick } from './DraftImportPreview'
import type { ImportErrorReport } from './types'
import { createEmptyReport, addError, addWarning } from './ImportErrorReport'

export function validatePreview(
  preview: DraftImportPreview,
  existingPickCount: number,
  sessionStatus: string
): ImportErrorReport {
  const report = createEmptyReport()
  const { slotOrder, picks, summary } = preview
  const teamCount = slotOrder.length
  const rounds = preview.metadata?.rounds ?? 15
  const maxOverall = teamCount * rounds

  if (teamCount < 1 || teamCount > 50) {
    addError(report, 'INVALID_TEAM_COUNT', `teamCount must be 1–50, got ${teamCount}`, 'slotOrder')
  }

  const overalls = new Set<number>()
  const playerNamesByRoster = new Map<string, Set<string>>()
  for (const p of picks) {
    if (p.overall < 1 || p.overall > maxOverall) {
      addError(report, 'OVERALL_OUT_OF_RANGE', `Pick overall ${p.overall} is outside 1–${maxOverall}`, `picks.overall`)
    }
    if (overalls.has(p.overall)) {
      addError(report, 'DUPLICATE_OVERALL', `Duplicate overall pick number ${p.overall}`, `picks`)
    }
    overalls.add(p.overall)
    if (!slotOrder.some((s) => s.rosterId === p.rosterId)) {
      addWarning(report, 'ROSTER_NOT_IN_ORDER', `Pick #${p.overall} rosterId "${p.rosterId}" not in draft order`, `picks[${p.overall}]`)
    }
    const key = `${p.rosterId}:${(p.playerName ?? '').trim().toLowerCase()}`
    const rosterSet = playerNamesByRoster.get(p.rosterId) ?? new Set()
    if (rosterSet.has(key)) {
      addError(report, 'DUPLICATE_PLAYER', `Duplicate player "${p.playerName}" for same roster`, `picks[${p.overall}]`)
    }
    rosterSet.add(key)
    playerNamesByRoster.set(p.rosterId, rosterSet)
  }

  if (sessionStatus !== 'pre_draft' && existingPickCount > 0) {
    addWarning(report, 'IMPORT_OVERWRITES', `Session has ${existingPickCount} existing picks; import will replace draft state.`, 'session')
  }

  if (preview.keeperSelections?.length && !preview.keeperConfig?.maxKeepers) {
    addWarning(report, 'KEEPER_CONFIG_MISSING', 'Keeper selections present but keeper config missing; config may be ignored.', 'keeperConfig')
  }

  return report
}

/**
 * Validate raw payload structure (before mapping). Catches obvious format errors.
 */
export function validateRawPayload(payload: unknown): ImportErrorReport {
  const report = createEmptyReport()
  if (payload == null || typeof payload !== 'object') {
    addError(report, 'INVALID_PAYLOAD', 'Payload must be a JSON object')
    return report
  }
  const raw = payload as Record<string, unknown>
  if (raw.picks != null && !Array.isArray(raw.picks)) {
    addError(report, 'INVALID_PICKS', 'picks must be an array', 'picks')
  }
  if (raw.draftOrder != null && !Array.isArray(raw.draftOrder)) {
    addError(report, 'INVALID_DRAFT_ORDER', 'draftOrder must be an array', 'draftOrder')
  }
  if (raw.tradedPicks != null && !Array.isArray(raw.tradedPicks)) {
    addError(report, 'INVALID_TRADED_PICKS', 'tradedPicks must be an array', 'tradedPicks')
  }
  return report
}
