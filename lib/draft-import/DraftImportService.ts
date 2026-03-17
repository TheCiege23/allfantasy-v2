/**
 * Draft import service: parse payload, map, validate, produce preview + error report.
 * Deterministic; no AI. Sport-aware (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer).
 */

import type { RawDraftImportPayload } from './types'
import type { DraftImportPreview } from './DraftImportPreview'
import type { ImportErrorReport } from './types'
import type { LeagueImportContext } from './ImportMappingLayer'
import { mapPayloadToPreview } from './ImportMappingLayer'
import { validateRawPayload, validatePreview } from './ImportValidationEngine'
import { mergeReports } from './ImportErrorReport'

export interface DraftImportResult {
  preview: DraftImportPreview
  report: ImportErrorReport
  /** True if dry-run passed (no blocking errors). */
  valid: boolean
}

/**
 * Run dry-run import: parse, map, validate. Does not write to DB.
 */
export function runDraftImportDryRun(
  payload: RawDraftImportPayload,
  ctx: LeagueImportContext,
  options: { existingPickCount?: number; sessionStatus?: string } = {}
): DraftImportResult {
  const existingPickCount = options.existingPickCount ?? 0
  const sessionStatus = options.sessionStatus ?? 'pre_draft'

  const rawReport = validateRawPayload(payload)
  if (!rawReport.canProceed) {
    return {
      preview: {
        slotOrder: [],
        picks: [],
        tradedPicks: [],
        summary: { pickCount: 0, tradedPickCount: 0, keeperCount: 0, slotOrderLength: 0 },
      },
      report: rawReport,
      valid: false,
    }
  }

  const { preview, report: mapReport } = mapPayloadToPreview(payload, ctx)
  const validationReport = validatePreview(preview, existingPickCount, sessionStatus)
  mergeReports(mapReport, validationReport)

  return {
    preview: mapReport.canProceed ? preview : { ...preview, picks: [], tradedPicks: [], keeperSelections: [] },
    report: mapReport,
    valid: mapReport.canProceed,
  }
}

/**
 * Parse JSON string or object into RawDraftImportPayload. Returns null and sets parseError if invalid.
 */
export function parseImportPayload(
  input: string | object
): { payload: RawDraftImportPayload; parseError?: string } {
  if (typeof input === 'object' && input !== null) {
    const p = input as Record<string, unknown>
    if (Array.isArray(p.picks) || Array.isArray(p.draftOrder) || p.metadata) {
      return { payload: input as RawDraftImportPayload }
    }
    return { payload: input as RawDraftImportPayload, parseError: 'Payload must contain picks, draftOrder, or metadata' }
  }
  if (typeof input !== 'string') return { payload: {} as RawDraftImportPayload, parseError: 'Invalid input type' }
  try {
    const parsed = JSON.parse(input) as unknown
    if (parsed != null && typeof parsed === 'object') {
      return { payload: parsed as RawDraftImportPayload }
    }
    return { payload: {} as RawDraftImportPayload, parseError: 'Parsed result is not an object' }
  } catch (e) {
    return { payload: {} as RawDraftImportPayload, parseError: (e as Error).message }
  }
}
