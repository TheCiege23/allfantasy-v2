/**
 * Resolves draft room config for a league: rounds, timer, order, filters.
 * Reads from League.settings when present; falls back to sport/variant draft defaults.
 */
import { prisma } from '@/lib/prisma'
import { getDraftDefaults } from '@/lib/sport-defaults/SportDefaultsRegistry'
import type { SportType } from '@/lib/sport-defaults/types'
import { toSportType } from '@/lib/sport-defaults/sport-type-utils'

export interface DraftRoomConfig {
  draft_type: 'snake' | 'linear' | 'auction'
  rounds: number
  timer_seconds: number | null
  pick_order_rules: string
  snake_or_linear: string
  third_round_reversal: boolean
  autopick_behavior: string
  queue_size_limit: number | null
  pre_draft_ranking_source: string
  roster_fill_order: string
  position_filter_behavior: string
  sport: string
  variant: string | null
}

/**
 * Get draft config for a league (for draft room UI and mock draft).
 * Uses League.settings when draft_rounds is set; otherwise uses sport/variant defaults.
 */
export async function getDraftConfigForLeague(leagueId: string): Promise<DraftRoomConfig | null> {
  const league = await (prisma as any).league.findUnique({
    where: { id: leagueId },
    select: { sport: true, leagueVariant: true, settings: true },
  })
  if (!league) return null

  const settings = (league.settings as Record<string, unknown>) ?? {}
  const sport = (league.sport as string) || 'NFL'
  const variant = league.leagueVariant ?? null
  const sportType = toSportType(sport) as SportType
  const defaults = getDraftDefaults(sportType, variant ?? undefined)

  const hasStoredDraft = settings.draft_rounds !== undefined && settings.draft_rounds !== null

  return {
    draft_type: (hasStoredDraft ? settings.draft_type : defaults.draft_type) as DraftRoomConfig['draft_type'],
    rounds: (hasStoredDraft ? settings.draft_rounds : defaults.rounds_default) as number,
    timer_seconds: (hasStoredDraft ? settings.draft_timer_seconds : defaults.timer_seconds_default) as number | null,
    pick_order_rules: (hasStoredDraft ? settings.draft_pick_order_rules : defaults.pick_order_rules) as string,
    snake_or_linear: (hasStoredDraft ? settings.draft_snake_or_linear : (defaults.snake_or_linear_behavior ?? defaults.pick_order_rules)) as string,
    third_round_reversal: (hasStoredDraft ? settings.draft_third_round_reversal : (defaults.third_round_reversal ?? false)) as boolean,
    autopick_behavior: (hasStoredDraft ? settings.draft_autopick_behavior : (defaults.autopick_behavior ?? 'queue-first')) as string,
    queue_size_limit: (hasStoredDraft ? settings.draft_queue_size_limit : (defaults.queue_size_limit ?? null)) as number | null,
    pre_draft_ranking_source: (hasStoredDraft ? settings.draft_pre_draft_ranking_source : (defaults.pre_draft_ranking_source ?? 'adp')) as string,
    roster_fill_order: (hasStoredDraft ? settings.draft_roster_fill_order : (defaults.roster_fill_order ?? 'starter_first')) as string,
    position_filter_behavior: (hasStoredDraft ? settings.draft_position_filter_behavior : (defaults.position_filter_behavior ?? 'by_eligibility')) as string,
    sport,
    variant,
  }
}
