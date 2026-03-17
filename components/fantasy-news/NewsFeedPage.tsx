'use client';

import { useState, useCallback, useEffect } from 'react';
import { Newspaper, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_SPORTS } from '@/lib/sport-scope';
import type { EnrichedNewsItem } from '@/lib/fantasy-news-aggregator/types';
import { BreakingNewsBanner } from './BreakingNewsBanner';
import { PlayerNewsPanel } from './PlayerNewsPanel';

const BREAKING_TOP_N = 3;

export function NewsFeedPage() {
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0]);
  const [items, setItems] = useState<EnrichedNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sport,
        limit: '25',
        enrich: 'true',
      });
      if (refresh) params.set('refresh', 'true');
      const res = await fetch(`/api/fantasy-news/feed?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load news');
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sport]);

  const handleRefresh = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  // Initial load and when sport changes
  const loadOnce = useCallback(() => {
    if (items.length === 0 && !loading) fetchNews(false);
  }, [fetchNews, items.length, loading]);

  const breaking = items
    .filter((i) => (i.importanceScore ?? 0) >= 60)
    .slice(0, BREAKING_TOP_N);
  const rest = items.filter((i) => !breaking.includes(i));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-cyan-400" />
        <h1 className="text-2xl font-semibold text-white">Fantasy News</h1>
      </div>
      <p className="text-sm text-white/60">
        Aggregated player and team news with fantasy impact. Data: ESPN, team reports, injury reports, league feeds.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Sport</label>
          <Select value={sport} onValueChange={(v) => { setSport(v); setItems([]); setError(null); }}>
            <SelectTrigger className="w-[160px] border-white/10 bg-black/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_SPORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Button
            onClick={() => fetchNews(false)}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
            Load news
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2 border-white/20"
            data-audit="refresh-news-button-works"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {items.length > 0 && (
        <>
          <BreakingNewsBanner items={breaking} />
          <PlayerNewsPanel items={rest.length > 0 ? rest : items} title="Feed" />
        </>
      )}
    </main>
  );
}
