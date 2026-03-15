'use client';

import { useState, useEffect, useCallback } from 'react';

export type LeagueSportFrontend = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER';

const LEAGUE_SPORT_VALUES: LeagueSportFrontend[] = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'];

function toLeagueSportFrontend(s: string | null | undefined): LeagueSportFrontend | null {
  if (s == null || s === '') return null;
  const u = String(s).toUpperCase();
  return (LEAGUE_SPORT_VALUES as readonly string[]).includes(u) ? (u as LeagueSportFrontend) : null;
}

export interface LeagueSportResult {
  sport: LeagueSportFrontend | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolve league sport from API so draft room, waiver wire, roster views can load sport-specific data.
 * Use when you have leagueId and need to pass sport to team logos, player pool, or scoring.
 */
export function useLeagueSport(leagueId: string | null): LeagueSportResult {
  const [sport, setSport] = useState<LeagueSportFrontend | null>(null);
  const [loading, setLoading] = useState(!!leagueId);
  const [error, setError] = useState<string | null>(null);

  const fetchSport = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/league/list').catch(() => null);
      if (!res?.ok) {
        setSport(null);
        return;
      }
      const data = await res.json();
      const leagues = data?.leagues ?? data?.genericLeagues ?? Array.isArray(data) ? data : [];
      const league = leagues.find((l: { id?: string }) => l.id === id);
      setSport(toLeagueSportFrontend(league?.sport));
    } catch {
      setError('Failed to load league');
      setSport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!leagueId) {
      setSport(null);
      setLoading(false);
      return;
    }
    fetchSport(leagueId);
  }, [leagueId, fetchSport]);

  return { sport, loading, error };
}
