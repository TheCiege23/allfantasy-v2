'use client';

import { useState, useEffect, useCallback } from 'react';

const LEAGUE_SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const;
export type LeagueSportOption = (typeof LEAGUE_SPORTS)[number];

export interface LeagueCreationPresetPayload {
  sport: LeagueSportOption;
  metadata: { display_name: string; short_name: string; icon: string; logo_strategy: string };
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
    flex_definitions: Array<{ slotName: string; allowedPositions: string[] }>;
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
  scoringTemplate: { templateId: string; name: string; formatType: string; rules: Array<{ statKey: string; pointsValue: number }> };
  defaultLeagueSettings: Record<string, unknown>;
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

  const load = useCallback(async (s: LeagueSportOption, v?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sport: s, load: 'creation' });
      if (v && v.trim()) params.set('variant', v.trim());
      const res = await fetch(`/api/sport-defaults?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load preset');
      }
      const data = await res.json();
      setPreset(data as LeagueCreationPresetPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load preset');
      setPreset(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sport, variant);
  }, [sport, variant, load]);

  return { preset, loading, error, refetch: () => load(sport, variant) };
}

export { LEAGUE_SPORTS };
