/**
 * Ensures a league has draft config in settings (sport- and variant-aware).
 * Idempotent: merges default draft keys only when missing so commissioner overrides are preserved.
 */
import { prisma } from '@/lib/prisma'
import { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface LeagueDraftBootstrapResult {
  leagueId: string
  draftConfigApplied: boolean
  sport: string
  variant: string | null
}

/**
 * Ensure league has draft config in League.settings. If any draft_* key is missing,
 * merge in sport/variant defaults without overwriting existing keys.
 */
export async function bootstrapLeagueDraftConfig(leagueId: string): Promise<LeagueDraftBootstrapResult> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { id: true, sport: true, leagueVariant: true, settings: true },
  })
  if (!league) {
    return { leagueId, draftConfigApplied: false, sport: '', variant: null }
  }

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const draft = getDraftDefaults(sportType, variant ?? undefined)

  const draftBlock = {
    draft_type: draft.draft_type,
    draft_rounds: draft.rounds_default,
    draft_timer_seconds: draft.timer_seconds_default,
    draft_pick_order_rules: draft.pick_order_rules,
    draft_snake_or_linear: draft.snake_or_linear_behavior ?? draft.pick_order_rules,
    draft_third_round_reversal: draft.third_round_reversal ?? false,
    draft_autopick_behavior: draft.autopick_behavior ?? 'queue-first',
    draft_queue_size_limit: draft.queue_size_limit ?? null,
    draft_pre_draft_ranking_source: draft.pre_draft_ranking_source ?? 'adp',
    draft_roster_fill_order: draft.roster_fill_order ?? 'starter_first',
    draft_position_filter_behavior: draft.position_filter_behavior ?? 'by_eligibility',
  }

  const mergeOnlyMissing: Record<string, unknown> = { ...settings }
  let applied = false
  for (const [key, value] of Object.entries(draftBlock)) {
    if (mergeOnlyMissing[key] === undefined || mergeOnlyMissing[key] === null) {
      mergeOnlyMissing[key] = value
      applied = true
    }
  }

  if (!applied) {
    return { leagueId, draftConfigApplied: false, sport, variant }
  }

  await (prisma as any).league.update({
    where: { id: leagueId },
    data: { settings: mergeOnlyMissing },
  })

  return { leagueId, draftConfigApplied: true, sport, variant }
}
