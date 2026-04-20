/**
 * Helpers for import review tasks and warning triage — keep logic out of route handlers.
 */

import type { ImportWarningRecord } from '@/lib/league-import/types'

export function partitionWarningsBySeverity(warnings: ImportWarningRecord[]): {
  errors: ImportWarningRecord[]
  warns: ImportWarningRecord[]
  infos: ImportWarningRecord[]
} {
  const errors: ImportWarningRecord[] = []
  const warns: ImportWarningRecord[] = []
  const infos: ImportWarningRecord[] = []
  for (const w of warnings) {
    if (w.severity === 'error') errors.push(w)
    else if (w.severity === 'warn') warns.push(w)
    else infos.push(w)
  }
  return { errors, warns, infos }
}

export function hasBlockingImportWarnings(warnings: ImportWarningRecord[]): boolean {
  return warnings.some((w) => w.severity === 'error')
}

export function summarizeReviewReasons(reasons: string[]): string {
  if (reasons.length === 0) return ''
  const labels: Record<string, string> = {
    concept_inferred: 'Concept was inferred — confirm in settings',
    specialty_concept_external: 'Specialty format — confirm concept rules',
    keeper_settings_confirm: 'Keeper rules — confirm slots and costs',
  }
  return reasons.map((r) => labels[r] ?? r).join('; ')
}
