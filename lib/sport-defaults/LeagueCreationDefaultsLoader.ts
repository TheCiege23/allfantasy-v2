/**
 * Single entry point for "load all defaults needed for league creation by sport (and optional variant)".
 * Used by league creation API and UI. Supports Soccer and NFL IDP variant.
 */
import type { LeagueSport } from '@prisma/client'
import { getFullLeaguePreset } from './SportLeaguePresetService'
import { resolveLeaguePreset } from './LeaguePresetResolver'
import { getDefaultLeagueSettings } from './LeagueDefaultSettingsService'
import { getLeagueDefaults, getDraftDefaults, getWaiverDefaults } from './SportDefaultsRegistry'
import type { SportType } from './types'
import { leagueSportToSportType } from '@/lib/multi-sport/SportConfigResolver'

export interface LeagueCreationDefaultsPayload {
  sport: LeagueSport
  leagueVariant?: string | null
  /** Display metadata */
  metadata: {
    display_name: string
    short_name: string
    icon: string
    logo_strategy: string
  }
  /** League settings to prefill */
  league: {
    default_league_name_pattern: string
    default_team_count: number
    default_playoff_team_count: number
    default_regular_season_length: number
    default_matchup_unit: string
    default_trade_deadline_logic: string
  }
  /** Roster slot config (starter counts, bench, IR, taxi, devy, flex) */
  roster: {
    starter_slots: Record<string, number>
    bench_slots: number
    IR_slots: number
    taxi_slots: number
    devy_slots: number
    flex_definitions: Array<{ slotName: string; allowedPositions: string[] }>
  }
  /** Scoring template id and format */
  scoring: {
    scoring_template_id: string
    scoring_format: string
    category_type: string
  }
  /** Draft defaults */
  draft: {
    draft_type: string
    rounds_default: number
    timer_seconds_default: number | null
    pick_order_rules: string
  }
  /** Waiver defaults */
  waiver: {
    waiver_type: string
    processing_days: number[] | null
    FAAB_budget_default: number | null
  }
  /** Resolved roster template (slots from DB or in-memory default) */
  rosterTemplate: {
    templateId: string
    name: string
    formatType: string
    slots: Array<{
      slotName: string
      allowedPositions: string[]
      starterCount: number
      benchCount: number
      isFlexibleSlot: boolean
      slotOrder: number
    }>
  }
  /** Resolved scoring template (rules from DB or in-memory default) */
  scoringTemplate: {
    templateId: string
    name: string
    formatType: string
    rules: Array<{ statKey: string; pointsValue: number; multiplier: number; enabled: boolean }>
  }
  /** Default league settings (playoff, schedule, waiver mode, tiebreakers, lock behavior) */
  defaultLeagueSettings: {
    playoff_team_count: number
    playoff_structure: Record<string, unknown>
    regular_season_length: number
    matchup_frequency: string
    season_labeling: string
    schedule_unit: string
    waiver_mode: string
    trade_review_mode: string
    standings_tiebreakers: string[]
    injury_slot_behavior: string
    lock_time_behavior: string
  }
}

/**
 * Load everything needed to create a league for the given sport and optional variant.
 * When leagueVariant is provided (e.g. NFL IDP), uses LeaguePresetResolver for roster/scoring.
 */
export async function loadLeagueCreationDefaults(
  leagueSport: LeagueSport,
  leagueVariant?: string | null
): Promise<LeagueCreationDefaultsPayload> {
  const sportType = leagueSportToSportType(leagueSport) as SportType
  const variant = leagueVariant ?? null

  if (variant && (variant.toUpperCase() === 'IDP' || variant.toUpperCase() === 'DYNASTY_IDP') && leagueSport === 'NFL') {
    const resolved = await resolveLeaguePreset(leagueSport, variant)
    const defaults = getLeagueDefaults(sportType)
    const draftDef = getDraftDefaults(sportType)
    const waiverDef = getWaiverDefaults(sportType)
    const defaultLeagueSettings = getDefaultLeagueSettings(sportType)
    return {
      sport: leagueSport,
      leagueVariant: variant,
      metadata: {
        display_name: 'NFL',
        short_name: 'NFL',
        icon: '🏈',
        logo_strategy: 'sleeper',
      },
      league: {
        default_league_name_pattern: defaults.default_league_name_pattern,
        default_team_count: defaults.default_team_count,
        default_playoff_team_count: defaults.default_playoff_team_count,
        default_regular_season_length: defaults.default_regular_season_length,
        default_matchup_unit: defaults.default_matchup_unit,
        default_trade_deadline_logic: defaults.default_trade_deadline_logic,
      },
      roster: {
        starter_slots: resolved.rosterDefaults.starter_slots,
        bench_slots: resolved.rosterDefaults.bench_slots,
        IR_slots: resolved.rosterDefaults.IR_slots,
        taxi_slots: resolved.rosterDefaults.taxi_slots,
        devy_slots: resolved.rosterDefaults.devy_slots,
        flex_definitions: resolved.rosterDefaults.flex_definitions,
      },
      scoring: {
        scoring_template_id: resolved.scoringTemplate.templateId,
        scoring_format: resolved.scoringTemplate.formatType,
        category_type: 'points',
      },
      draft: {
        draft_type: draftDef.draft_type,
        rounds_default: draftDef.rounds_default,
        timer_seconds_default: draftDef.timer_seconds_default,
        pick_order_rules: draftDef.pick_order_rules,
      },
      waiver: {
        waiver_type: waiverDef.waiver_type,
        processing_days: waiverDef.processing_days,
        FAAB_budget_default: waiverDef.FAAB_budget_default,
      },
      rosterTemplate: {
        templateId: resolved.rosterTemplate.templateId,
        name: resolved.rosterTemplate.name,
        formatType: resolved.rosterTemplate.formatType,
        slots: resolved.rosterTemplate.slots.map((s) => ({
          slotName: s.slotName,
          allowedPositions: s.allowedPositions,
          starterCount: s.starterCount,
          benchCount: s.benchCount,
          isFlexibleSlot: s.isFlexibleSlot,
          slotOrder: s.slotOrder,
        })),
      },
      scoringTemplate: {
        templateId: resolved.scoringTemplate.templateId,
        name: resolved.scoringTemplate.name,
        formatType: resolved.scoringTemplate.formatType,
        rules: resolved.scoringTemplate.rules.map((r) => ({
          statKey: r.statKey,
          pointsValue: r.pointsValue,
          multiplier: r.multiplier,
          enabled: r.enabled,
        })),
      },
      defaultLeagueSettings: {
        playoff_team_count: defaultLeagueSettings.playoff_team_count,
        playoff_structure: defaultLeagueSettings.playoff_structure,
        regular_season_length: defaultLeagueSettings.regular_season_length,
        matchup_frequency: defaultLeagueSettings.matchup_frequency,
        season_labeling: defaultLeagueSettings.season_labeling,
        schedule_unit: defaultLeagueSettings.schedule_unit,
        waiver_mode: defaultLeagueSettings.waiver_mode,
        trade_review_mode: defaultLeagueSettings.trade_review_mode,
        standings_tiebreakers: defaultLeagueSettings.standings_tiebreakers,
        injury_slot_behavior: defaultLeagueSettings.injury_slot_behavior,
        lock_time_behavior: defaultLeagueSettings.lock_time_behavior,
      },
    }
  }

  const { defaults, preset } = await getFullLeaguePreset(leagueSport)
  const defaultLeagueSettings = getDefaultLeagueSettings(defaults.metadata.sport_type)

  return {
    sport: leagueSport,
    leagueVariant: variant ?? undefined,
    metadata: {
      display_name: defaults.metadata.display_name,
      short_name: defaults.metadata.short_name,
      icon: defaults.metadata.icon,
      logo_strategy: defaults.metadata.logo_strategy,
    },
    league: {
      default_league_name_pattern: defaults.league.default_league_name_pattern,
      default_team_count: defaults.league.default_team_count,
      default_playoff_team_count: defaults.league.default_playoff_team_count,
      default_regular_season_length: defaults.league.default_regular_season_length,
      default_matchup_unit: defaults.league.default_matchup_unit,
      default_trade_deadline_logic: defaults.league.default_trade_deadline_logic,
    },
    roster: {
      starter_slots: defaults.roster.starter_slots,
      bench_slots: defaults.roster.bench_slots,
      IR_slots: defaults.roster.IR_slots,
      taxi_slots: defaults.roster.taxi_slots,
      devy_slots: defaults.roster.devy_slots,
      flex_definitions: defaults.roster.flex_definitions,
    },
    scoring: {
      scoring_template_id: defaults.scoring.scoring_template_id,
      scoring_format: defaults.scoring.scoring_format,
      category_type: defaults.scoring.category_type,
    },
    draft: {
      draft_type: defaults.draft.draft_type,
      rounds_default: defaults.draft.rounds_default,
      timer_seconds_default: defaults.draft.timer_seconds_default,
      pick_order_rules: defaults.draft.pick_order_rules,
    },
    waiver: {
      waiver_type: defaults.waiver.waiver_type,
      processing_days: defaults.waiver.processing_days,
      FAAB_budget_default: defaults.waiver.FAAB_budget_default,
    },
    rosterTemplate: {
      templateId: preset.rosterTemplate.templateId,
      name: preset.rosterTemplate.name,
      formatType: preset.rosterTemplate.formatType,
      slots: preset.rosterTemplate.slots.map((s) => ({
        slotName: s.slotName,
        allowedPositions: s.allowedPositions,
        starterCount: s.starterCount,
        benchCount: s.benchCount,
        isFlexibleSlot: s.isFlexibleSlot,
        slotOrder: s.slotOrder,
      })),
    },
    scoringTemplate: {
      templateId: preset.scoringTemplate.templateId,
      name: preset.scoringTemplate.name,
      formatType: preset.scoringTemplate.formatType,
      rules: preset.scoringTemplate.rules.map((r) => ({
        statKey: r.statKey,
        pointsValue: r.pointsValue,
        multiplier: r.multiplier,
        enabled: r.enabled,
      })),
    },
    defaultLeagueSettings: {
      playoff_team_count: defaultLeagueSettings.playoff_team_count,
      playoff_structure: defaultLeagueSettings.playoff_structure,
      regular_season_length: defaultLeagueSettings.regular_season_length,
      matchup_frequency: defaultLeagueSettings.matchup_frequency,
      season_labeling: defaultLeagueSettings.season_labeling,
      schedule_unit: defaultLeagueSettings.schedule_unit,
      waiver_mode: defaultLeagueSettings.waiver_mode,
      trade_review_mode: defaultLeagueSettings.trade_review_mode,
      standings_tiebreakers: defaultLeagueSettings.standings_tiebreakers,
      injury_slot_behavior: defaultLeagueSettings.injury_slot_behavior,
      lock_time_behavior: defaultLeagueSettings.lock_time_behavior,
    },
  }
}
