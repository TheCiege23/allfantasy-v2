'use client';

import { useState, useEffect, useCallback } from 'react';
import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope';
import { emitLeagueCreationPerf } from '@/lib/league-creation/perf';

const LEAGUE_SPORTS: readonly SupportedSport[] = SUPPORTED_SPORTS;
export type LeagueSportOption = SupportedSport;

export interface ScheduleTemplatePayload {
  templateId: string;
  name: string;
  formatType: string;
  matchupType: string;
  regularSeasonWeeks: number;
  playoffWeeks: number;
  byeWeekWindow: { start: number; end: number } | null;
  fantasyPlayoffDefault: { startWeek: number; endWeek: number } | null;
  lineupLockMode: string | null;
  scoringMode: string | null;
  regularSeasonStyle: string | null;
  playoffSupport: boolean;
  bracketModeSupported: boolean;
  marchMadnessMode: boolean;
  bowlPlayoffMetadata: boolean;
}

export interface SeasonCalendarPayload {
  calendarId: string;
  name: string;
  formatType: string;
  preseasonPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null;
  regularSeasonPeriod: { monthStart?: number; monthEnd?: number; label?: string };
  playoffsPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null;
  championshipPeriod: { monthStart?: number; monthEnd?: number; label?: string } | null;
  internationalBreaksSupported: boolean;
}

export interface SportFeatureFlagsPayload {
  sportType: string;
  supportsBestBall: boolean;
  supportsSuperflex: boolean;
  supportsTePremium: boolean;
  supportsKickers: boolean;
  supportsTeamDefense: boolean;
  supportsIdp: boolean;
  supportsWeeklyLineups: boolean;
  supportsDailyLineups: boolean;
  supportsBracketMode: boolean;
  supportsDevy: boolean;
  supportsTaxi: boolean;
  supportsIr: boolean;
}

export interface LeagueCreationPresetPayload {
  sport: LeagueSportOption;
  metadata: { display_name: string; short_name: string; icon: string; logo_strategy: string };
  teamMetadata?: {
    sport_type: string;
    teams: Array<{
      team_id: string;
      team_name: string;
      city: string;
      abbreviation: string;
      primary_logo: string | null;
      alternate_logo: string | null;
    }>;
  };
  league: {
    default_league_name_pattern: string;
    default_team_count: number;
    default_playoff_team_count: number;
    default_regular_season_length: number;
    default_matchup_unit: string;
    default_trade_deadline_logic: string;
  };
  roster: {
    starter_slots: Record<string, number>;
    bench_slots: number;
    IR_slots: number;
    flex_definitions?: Array<{ slotName: string; allowedPositions: string[] }>;
  };
  scoring: { scoring_template_id: string; scoring_format: string; category_type: string };
  draft: {
    draft_type: string;
    rounds_default: number;
    timer_seconds_default: number | null;
    pick_order_rules: string;
    snake_or_linear_behavior?: string;
    third_round_reversal?: boolean;
    autopick_behavior?: string;
    queue_size_limit?: number | null;
    pre_draft_ranking_source?: string;
    roster_fill_order?: string;
    position_filter_behavior?: string;
  };
  waiver: {
    waiver_type: string;
    processing_days: number[] | null;
    FAAB_budget_default: number | null;
    processing_time_utc?: string | null;
    faab_enabled?: boolean;
    claim_priority_behavior?: string | null;
    continuous_waivers_behavior?: boolean;
    free_agent_unlock_behavior?: string | null;
    game_lock_behavior?: string | null;
    max_claims_per_period?: number | null;
  };
  rosterTemplate: {
    templateId: string;
    name: string;
    formatType: string;
    slots: Array<{ slotName: string; allowedPositions: string[]; starterCount: number; benchCount: number; isFlexibleSlot: boolean; slotOrder: number }>;
  };
  scoringTemplate: {
    templateId: string;
    name: string;
    formatType: string;
    rules: Array<{ statKey: string; pointsValue: number; multiplier: number; enabled: boolean }>;
  };
  defaultLeagueSettings: Record<string, unknown>;
  scheduleTemplate?: ScheduleTemplatePayload;
  seasonCalendar?: SeasonCalendarPayload;
  featureFlags?: SportFeatureFlagsPayload;
}

const SPORT_PRESET_CACHE_TTL_MS = 5 * 60 * 1000;
const sportPresetCache = new Map<string, { data: LeagueCreationPresetPayload; expiresAt: number }>();
const sportPresetInflight = new Map<string, Promise<LeagueCreationPresetPayload>>();

function buildSportPresetCacheKey(sport: LeagueSportOption, variant?: string | null): string {
  return `${String(sport).trim().toUpperCase()}::${String(variant ?? '').trim().toUpperCase()}`;
}

/**
 * Load sport preset for league creation (roster, scoring, league defaults).
 * When sport changes, fetches GET /api/sport-defaults?sport=X&load=creation.
 * For NFL, optional variant (e.g. IDP, DYNASTY_IDP) can be passed to get IDP roster/scoring.
 */
export function useSportPreset(sport: LeagueSportOption, variant?: string | null) {
  const [preset, setPreset] = useState<LeagueCreationPresetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (s: LeagueSportOption, v?: string | null, opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    const key = buildSportPresetCacheKey(s, v);
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!force) {
      const cached = sportPresetCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        emitLeagueCreationPerf('sport_preset_fetch', {
          sport: s,
          variant: v ?? null,
          source: 'memory_cache',
          forceRefresh: force,
          durationMs: Number(
            ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
          ),
        });
        setPreset(cached.data);
        setError(null);
        setLoading(false);
        return;
      }
    } else {
      sportPresetCache.delete(key);
    }

    setLoading(true);
    setError(null);
    try {
      let inflight = sportPresetInflight.get(key);
      const source = inflight ? 'inflight' : 'network';
      if (!inflight) {
        inflight = (async () => {
          const params = new URLSearchParams({ sport: s, load: 'creation' });
          if (v && v.trim()) params.set('variant', v.trim());
          const res = await fetch(`/api/sport-defaults?${params.toString()}`);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || 'Failed to load preset');
          }
          const data = (await res.json()) as LeagueCreationPresetPayload;
          sportPresetCache.set(key, {
            data,
            expiresAt: Date.now() + SPORT_PRESET_CACHE_TTL_MS,
          });
          return data;
        })().finally(() => {
          sportPresetInflight.delete(key);
        });
        sportPresetInflight.set(key, inflight);
      }
      const data = await inflight;
      emitLeagueCreationPerf('sport_preset_fetch', {
        sport: s,
        variant: v ?? null,
        source,
        forceRefresh: force,
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
        ),
      });
      setPreset(data);
    } catch (e) {
      emitLeagueCreationPerf('sport_preset_fetch_error', {
        sport: s,
        variant: v ?? null,
        forceRefresh: force,
        message: e instanceof Error ? e.message : 'Failed to load preset',
        durationMs: Number(
          ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start).toFixed(1)
        ),
      });
      setError(e instanceof Error ? e.message : 'Failed to load preset');
      setPreset(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sport, variant);
  }, [sport, variant, load]);

  return { preset, loading, error, refetch: () => load(sport, variant, { force: true }) };
}

export { LEAGUE_SPORTS };
