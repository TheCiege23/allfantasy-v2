/**
 * Single entry point for "load all defaults needed for league creation by sport (and optional variant)".
 * Used by league creation API and UI. Supports Soccer and NFL IDP variant.
 */
import type { LeagueSport } from '@prisma/client'
import { getFullLeaguePreset } from './SportLeaguePresetService'
import { resolveLeaguePreset } from './LeaguePresetResolver'
import { getDefaultLeagueSettingsForVariant } from './LeagueDefaultSettingsService'
import { getLeagueDefaults, getDraftDefaults, getWaiverDefaults, getTeamMetadataDefaults } from './SportDefaultsRegistry'
import { getSportMetadata } from './SportMetadataRegistry'
import { getScheduleTemplate } from './ScheduleTemplateResolver'
import { getSeasonCalendar } from './SeasonCalendarResolver'
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
    default_season_type: string
    player_pool_source: string
    display_labels: Record<string, string>
  }
  /** Team metadata defaults (abbrev + logos) for sport-aware branding and selectors. */
  teamMetadata: {
    sport_type: string
    teams: Array<{
      team_id: string
      team_name: string
      city: string
      abbreviation: string
      primary_logo: string | null
      alternate_logo: string | null
    }>
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
  /** Draft defaults (sport- and variant-aware) */
  draft: {
    draft_type: string
    rounds_default: number
    timer_seconds_default: number | null
    pick_order_rules: string
    snake_or_linear_behavior?: string
    third_round_reversal?: boolean
    autopick_behavior?: string
    queue_size_limit?: number | null
    draft_order_rules?: string
    pre_draft_ranking_source?: string
    roster_fill_order?: string
    position_filter_behavior?: string
  }
  /** Waiver defaults (sport- and variant-aware) */
  waiver: {
    waiver_type: string
    processing_days: number[] | null
    FAAB_budget_default: number | null
    processing_time_utc?: string | null
    faab_enabled?: boolean
    faab_reset_rules?: string | null
    claim_priority_behavior?: string | null
    continuous_waivers_behavior?: boolean
    free_agent_unlock_behavior?: string | null
    game_lock_behavior?: string | null
    drop_lock_behavior?: string
    same_day_add_drop_rules?: string
    max_claims_per_period?: number | null
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
  /** Fantasy schedule template (matchup type, regular/playoff weeks, lock mode) — PROMPT 3/4 */
  scheduleTemplate: {
    templateId: string
    name: string
    formatType: string
    matchupType: string
    regularSeasonWeeks: number
    playoffWeeks: number
    byeWeekWindow: { start: number; end: number } | null
    fantasyPlayoffDefault: { startWeek: number; endWeek: number } | null
    lineupLockMode: string | null
    scoringMode: string | null
    regularSeasonStyle: string | null
    playoffSupport: boolean
    bracketModeSupported: boolean
    marchMadnessMode: boolean
    bowlPlayoffMetadata: boolean
  }
  /** Real-world season calendar (preseason, regular season, playoffs) — PROMPT 3/4 */
  seasonCalendar: {
    calendarId: string
    name: string
    formatType: string
    preseasonPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null
    regularSeasonPeriod: { monthStart?: number; monthEnd?: number; label?: string }
    playoffsPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null
    championshipPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null
    internationalBreaksSupported: boolean
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

  if (variant) {
    const [resolved, scheduleTemplate, seasonCalendar] = await Promise.all([
      resolveLeaguePreset(leagueSport, variant),
      getScheduleTemplate(sportType, 'DEFAULT'),
      getSeasonCalendar(sportType, 'DEFAULT'),
    ])
    const defaults = getLeagueDefaults(sportType)
    const draftDef = getDraftDefaults(sportType, variant ?? undefined)
    const waiverDef = getWaiverDefaults(sportType, variant ?? undefined)
    const defaultLeagueSettings = getDefaultLeagueSettingsForVariant(sportType, variant ?? undefined)
    const metadata = getSportMetadata(sportType)
    const teamMetadata = getTeamMetadataDefaults(sportType)
    return {
      sport: leagueSport,
      leagueVariant: variant,
      metadata: {
        display_name: metadata.display_name,
        short_name: metadata.short_name,
        icon: metadata.icon,
        logo_strategy: metadata.logo_strategy,
        default_season_type: metadata.default_season_type,
        player_pool_source: metadata.player_pool_source ?? 'sports_player',
        display_labels: metadata.display_labels ?? {},
      },
      teamMetadata,
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
        snake_or_linear_behavior: draftDef.snake_or_linear_behavior ?? draftDef.pick_order_rules,
        third_round_reversal: draftDef.third_round_reversal ?? false,
        autopick_behavior: draftDef.autopick_behavior ?? 'queue-first',
        queue_size_limit: draftDef.queue_size_limit ?? null,
        draft_order_rules: draftDef.draft_order_rules ?? draftDef.pick_order_rules,
        pre_draft_ranking_source: draftDef.pre_draft_ranking_source ?? 'adp',
        roster_fill_order: draftDef.roster_fill_order ?? 'starter_first',
        position_filter_behavior: draftDef.position_filter_behavior ?? 'by_eligibility',
      },
      waiver: {
        waiver_type: waiverDef.waiver_type,
        processing_days: waiverDef.processing_days,
        FAAB_budget_default: waiverDef.FAAB_budget_default,
        processing_time_utc: waiverDef.processing_time_utc ?? null,
        faab_enabled: waiverDef.waiver_type === 'faab',
        faab_reset_rules: waiverDef.faab_reset_rules ?? null,
        claim_priority_behavior: (waiverDef.claim_priority_behavior as string) ?? null,
        continuous_waivers_behavior: waiverDef.continuous_waivers_behavior ?? false,
        free_agent_unlock_behavior: (waiverDef.free_agent_unlock_behavior as string) ?? 'after_waiver_run',
        game_lock_behavior: (waiverDef.game_lock_behavior as string) ?? null,
        drop_lock_behavior: waiverDef.drop_lock_behavior ?? 'lock_with_game',
        same_day_add_drop_rules: waiverDef.same_day_add_drop_rules ?? 'allow_if_not_played',
        max_claims_per_period: waiverDef.max_claims_per_period ?? null,
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
      scheduleTemplate: {
        templateId: scheduleTemplate.templateId,
        name: scheduleTemplate.name,
        formatType: scheduleTemplate.formatType,
        matchupType: scheduleTemplate.matchupType,
        regularSeasonWeeks: scheduleTemplate.regularSeasonWeeks,
        playoffWeeks: scheduleTemplate.playoffWeeks,
        byeWeekWindow: scheduleTemplate.byeWeekWindow,
        fantasyPlayoffDefault: scheduleTemplate.fantasyPlayoffDefault,
        lineupLockMode: scheduleTemplate.lineupLockMode,
        scoringMode: scheduleTemplate.scoringMode,
        regularSeasonStyle: scheduleTemplate.regularSeasonStyle,
        playoffSupport: scheduleTemplate.playoffSupport,
        bracketModeSupported: scheduleTemplate.bracketModeSupported,
        marchMadnessMode: scheduleTemplate.marchMadnessMode,
        bowlPlayoffMetadata: scheduleTemplate.bowlPlayoffMetadata,
      },
      seasonCalendar: {
        calendarId: seasonCalendar.calendarId,
        name: seasonCalendar.name,
        formatType: seasonCalendar.formatType,
        preseasonPeriod: seasonCalendar.preseasonPeriod,
        regularSeasonPeriod: seasonCalendar.regularSeasonPeriod,
        playoffsPeriod: seasonCalendar.playoffsPeriod,
        championshipPeriod: seasonCalendar.championshipPeriod,
        internationalBreaksSupported: seasonCalendar.internationalBreaksSupported,
      },
    }
  }

  const [fullPreset, scheduleTemplate, seasonCalendar] = await Promise.all([
    getFullLeaguePreset(leagueSport),
    getScheduleTemplate(sportType, 'DEFAULT'),
    getSeasonCalendar(sportType, 'DEFAULT'),
  ])
  const { defaults, preset } = fullPreset
  const defaultLeagueSettings = getDefaultLeagueSettingsForVariant(defaults.metadata.sport_type, variant ?? undefined)

  return {
    sport: leagueSport,
    leagueVariant: variant ?? undefined,
    metadata: {
      display_name: defaults.metadata.display_name,
      short_name: defaults.metadata.short_name,
      icon: defaults.metadata.icon,
      logo_strategy: defaults.metadata.logo_strategy,
      default_season_type: defaults.metadata.default_season_type,
      player_pool_source: defaults.metadata.player_pool_source ?? 'sports_player',
      display_labels: defaults.metadata.display_labels ?? {},
    },
    teamMetadata: defaults.teamMetadata ?? getTeamMetadataDefaults(sportType),
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
    draft: (() => {
      const d = getDraftDefaults(sportType, variant ?? undefined)
      return {
        draft_type: d.draft_type,
        rounds_default: d.rounds_default,
        timer_seconds_default: d.timer_seconds_default,
        pick_order_rules: d.pick_order_rules,
        snake_or_linear_behavior: d.snake_or_linear_behavior ?? d.pick_order_rules,
        third_round_reversal: d.third_round_reversal ?? false,
        autopick_behavior: d.autopick_behavior ?? 'queue-first',
        queue_size_limit: d.queue_size_limit ?? null,
        draft_order_rules: d.draft_order_rules ?? d.pick_order_rules,
        pre_draft_ranking_source: d.pre_draft_ranking_source ?? 'adp',
        roster_fill_order: d.roster_fill_order ?? 'starter_first',
        position_filter_behavior: d.position_filter_behavior ?? 'by_eligibility',
      }
    })(),
      waiver: (() => {
        const w = getWaiverDefaults(sportType, variant ?? undefined)
        return {
          waiver_type: w.waiver_type,
          processing_days: w.processing_days,
          FAAB_budget_default: w.FAAB_budget_default,
          processing_time_utc: w.processing_time_utc ?? null,
          faab_enabled: w.waiver_type === 'faab',
          faab_reset_rules: w.faab_reset_rules ?? null,
          claim_priority_behavior: (w.claim_priority_behavior as string) ?? null,
          continuous_waivers_behavior: w.continuous_waivers_behavior ?? false,
          free_agent_unlock_behavior: (w.free_agent_unlock_behavior as string) ?? 'after_waiver_run',
          game_lock_behavior: (w.game_lock_behavior as string) ?? null,
          drop_lock_behavior: w.drop_lock_behavior ?? 'lock_with_game',
          same_day_add_drop_rules: w.same_day_add_drop_rules ?? 'allow_if_not_played',
          max_claims_per_period: w.max_claims_per_period ?? null,
        }
      })(),
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
    scheduleTemplate: {
      templateId: scheduleTemplate.templateId,
      name: scheduleTemplate.name,
      formatType: scheduleTemplate.formatType,
      matchupType: scheduleTemplate.matchupType,
      regularSeasonWeeks: scheduleTemplate.regularSeasonWeeks,
      playoffWeeks: scheduleTemplate.playoffWeeks,
      byeWeekWindow: scheduleTemplate.byeWeekWindow,
      fantasyPlayoffDefault: scheduleTemplate.fantasyPlayoffDefault,
      lineupLockMode: scheduleTemplate.lineupLockMode,
      scoringMode: scheduleTemplate.scoringMode,
      regularSeasonStyle: scheduleTemplate.regularSeasonStyle,
      playoffSupport: scheduleTemplate.playoffSupport,
      bracketModeSupported: scheduleTemplate.bracketModeSupported,
      marchMadnessMode: scheduleTemplate.marchMadnessMode,
      bowlPlayoffMetadata: scheduleTemplate.bowlPlayoffMetadata,
    },
    seasonCalendar: {
      calendarId: seasonCalendar.calendarId,
      name: seasonCalendar.name,
      formatType: seasonCalendar.formatType,
      preseasonPeriod: seasonCalendar.preseasonPeriod,
      regularSeasonPeriod: seasonCalendar.regularSeasonPeriod,
      playoffsPeriod: seasonCalendar.playoffsPeriod,
      championshipPeriod: seasonCalendar.championshipPeriod,
      internationalBreaksSupported: seasonCalendar.internationalBreaksSupported,
    },
  }
}
