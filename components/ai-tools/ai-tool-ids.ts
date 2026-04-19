/** IDs for `AIToolsGrid` modals and `af-open-ai-tool` deep links */
export type AIToolGridId =
  | 'startSit'
  | 'trade'
  | 'waiver'
  | 'trending'
  | 'power'
  | 'injury'
  | 'warRoom'
  | 'matchupPrep'
  | 'longTermCoach'

export const AI_TOOL_IDS: readonly AIToolGridId[] = [
  'startSit',
  'trade',
  'waiver',
  'trending',
  'power',
  'injury',
  'warRoom',
  'matchupPrep',
  'longTermCoach',
] as const

export function isAiToolGridId(v: string | undefined): v is AIToolGridId {
  return v != null && (AI_TOOL_IDS as readonly string[]).includes(v)
}
