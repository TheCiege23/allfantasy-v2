/**
 * Commissioner/orphan NPC draft personalities — TypeScript-only (stored in `commissionerAiManagers` JSON).
 */

export const NPC_DRAFT_PERSONALITIES = [
  'BALANCED',
  'NEED_BASED',
  'BEST_PLAYER_AVAILABLE',
  'ADP_VALUE_HUNTER',
  'UPSIDE_SWINGER',
  'FLOOR_SAFE',
  'ZERO_RB',
  'HERO_RB',
  'RB_HEAVY',
  'WR_HEAVY',
  'ELITE_QB',
  'LATE_QB',
  'EARLY_TE',
  'YOUTH_DYNASTY_UPSIDE',
  'WIN_NOW_VETERAN',
  'STACK_TEAM_CORRELATION',
  'BYE_WEEK_DIVERSIFIER',
  'INJURY_AVOIDANT',
  'CONTRARIAN_CHAOS',
  'HOMER_TEAM_FAVORITE',
  'IDP_SPECIALIST',
] as const

export type NpcDraftPersonalityId = (typeof NPC_DRAFT_PERSONALITIES)[number]

export function isNpcDraftPersonalityId(value: unknown): value is NpcDraftPersonalityId {
  return typeof value === 'string' && (NPC_DRAFT_PERSONALITIES as readonly string[]).includes(value)
}
