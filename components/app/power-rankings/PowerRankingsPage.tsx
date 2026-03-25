'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import TabDataState from '@/components/app/tabs/TabDataState';
import type { PowerRankingsOutput } from '@/lib/league-power-rankings/types';
import { RankingTable } from './RankingTable';
import { AICommentary } from './AICommentary';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const MAX_WEEK = 18;
const WEEK_OPTIONS = Array.from({ length: MAX_WEEK }, (_, i) => i + 1);

export interface PowerRankingsPageProps {
  leagueId: string;
}

export function PowerRankingsPage({ leagueId }: PowerRankingsPageProps) {
  const [data, setData] = useState<PowerRankingsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState<string>('');

  const load = useCallback(() => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (weekFilter) params.set('week', weekFilter);
    fetch(`/api/leagues/${encodeURIComponent(leagueId)}/power-rankings?${params.toString()}`, {
      cache: 'no-store',
    })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'No rankings data' : 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [leagueId, weekFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <TabDataState
      title="Rankings"
      loading={loading}
      error={error}
      onReload={() => void load()}
    >
      {data && (
        <div
          className="space-y-4"
          data-audit="rankings-tab-content"
          data-testid="power-rankings-content"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              Week {data.week} Power Rankings
            </h2>
            <span className="text-xs text-white/50">
              {data.leagueName} · {data.season}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={weekFilter || 'current'}
              onValueChange={(v) => {
                setWeekFilter(v === 'current' ? '' : v);
              }}
              data-audit="ranking-filters"
            >
              <SelectTrigger className="w-[120px] border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                {WEEK_OPTIONS.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Week {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="gap-2 border-white/20"
              data-audit="refresh-rankings-button-works"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          <RankingTable leagueId={leagueId} teams={data.teams} />
          <AICommentary
            leagueId={leagueId}
            leagueName={data.leagueName}
            season={data.season}
            week={data.week}
            teams={data.teams}
          />
        </div>
      )}
    </TabDataState>
  );
}
