import type { InjuryImpactDashboardResult } from './types'

/** Compact human line from aggregate injury counts (real DB/API feed). */
export function formatInjuryAvailabilitySummary(c: InjuryImpactDashboardResult['summaryCounts']): string {
  const parts: string[] = []
  if (c.outIr > 0) parts.push(`${c.outIr} out/IR`)
  if (c.doubtful > 0) parts.push(`${c.doubtful} doubtful`)
  if (c.questionable > 0) parts.push(`${c.questionable} questionable`)
  if (c.limited > 0) parts.push(`${c.limited} limited`)
  if (parts.length === 0) return 'No flagged availability issues in feed'
  return parts.join(' · ')
}
