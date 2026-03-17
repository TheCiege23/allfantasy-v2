/**
 * Build and aggregate import error reports. Deterministic; no AI.
 */

import type { ImportErrorItem, ImportErrorReport } from './types'

export function createEmptyReport(): ImportErrorReport {
  return { errors: [], warnings: [], canProceed: true }
}

export function addError(
  report: ImportErrorReport,
  code: string,
  message: string,
  field?: string
): void {
  report.errors.push({ code, message, field, severity: 'error' })
  report.canProceed = false
}

export function addWarning(
  report: ImportErrorReport,
  code: string,
  message: string,
  field?: string
): void {
  report.warnings.push({ code, message, field, severity: 'warning' })
}

export function mergeReports(target: ImportErrorReport, source: ImportErrorReport): void {
  target.errors.push(...source.errors)
  target.warnings.push(...source.warnings)
  if (!source.canProceed) target.canProceed = false
}

export function reportToJson(report: ImportErrorReport): { errors: ImportErrorItem[]; warnings: ImportErrorItem[]; canProceed: boolean } {
  return {
    errors: [...report.errors],
    warnings: [...report.warnings],
    canProceed: report.canProceed,
  }
}
