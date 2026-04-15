import { z } from 'zod'

export const MAX_AI_MANAGERS_PER_DRAFT = 4

export const AiDraftStyleSchema = z.enum([
  'BPA',
  'NEEDS',
  'BALANCED',
  'UPSIDE',
  'SAFE',
  'STARS_AND_SCRUBS',
  'YOUTH',
])

export const TradeAggressionSchema = z.enum(['none', 'low', 'medium', 'high'])

export type AiDraftStyle = z.infer<typeof AiDraftStyleSchema>
export type TradeAggression = z.infer<typeof TradeAggressionSchema>

export interface CommissionerAiTeamAssignment {
  teamId: string
  aiStyle: AiDraftStyle
  tradeAggression: TradeAggression
  active: boolean
  /** Distinct flavor — maps to brain mode + tie-break jitter */
  personalityId?: 'value_discipline' | 'youth_first' | 'positional_run' | 'ceiling_chaser'
}

export function validateAiAssignments(assignments: CommissionerAiTeamAssignment[]): { ok: boolean; error?: string } {
  const active = assignments.filter((a) => a.active)
  if (active.length > MAX_AI_MANAGERS_PER_DRAFT) {
    return { ok: false, error: `At most ${MAX_AI_MANAGERS_PER_DRAFT} AI-managed teams per draft.` }
  }
  const teamIds = new Set(active.map((a) => a.teamId))
  if (teamIds.size !== active.length) {
    return { ok: false, error: 'Duplicate AI team assignment.' }
  }
  return { ok: true }
}
