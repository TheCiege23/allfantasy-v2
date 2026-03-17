'use client';

import { useState, useCallback } from 'react';
import { FlaskConical, Search, Loader2, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_SPORTS } from '@/lib/sport-scope';
import type { MultiPlayerComparisonResult, ScoringFormat } from '@/lib/player-comparison-lab/types';
import { ComparisonMatrix } from './ComparisonMatrix';
import { PlayerStatCards } from './PlayerStatCards';
import { CategoryWinnerHighlights } from './CategoryWinnerHighlights';
import { AIExplanationPanel } from './AIExplanationPanel';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

const SCORING_OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: 'ppr', label: 'PPR' },
  { value: 'half_ppr', label: 'Half-PPR' },
  { value: 'non_ppr', label: 'Non-PPR' },
];

type SearchHit = { name: string; position?: string; team?: string };

export function PlayerComparisonPage() {
  const [sport, setSport] = useState<string>(SUPPORTED_SPORTS[0]);
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('ppr');
  const [playerSlots, setPlayerSlots] = useState<{ query: string; selected: SearchHit | null }[]>([
    { query: '', selected: null },
    { query: '', selected: null },
  ]);
  const [searchResults, setSearchResults] = useState<Map<number, SearchHit[]>>(new Map());
  const [comparison, setComparison] = useState<MultiPlayerComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlayers = useCallback(async (query: string, slotIndex: number) => {
    if (query.length < 2) {
      setSearchResults((prev) => {
        const next = new Map(prev);
        next.delete(slotIndex);
        return next;
      });
      return;
    }
    const res = await fetch(`/api/instant/player-search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const data = await res.json();
    const hits = Array.isArray(data)
      ? data.map((p: { name: string; position?: string; team?: string }) => ({
          name: p.name,
          position: p.position,
          team: p.team,
        }))
      : [];
    setSearchResults((prev) => new Map(prev).set(slotIndex, hits));
  }, []);

  const setSlot = useCallback((index: number, query: string, selected: SearchHit | null) => {
    setPlayerSlots((prev) => {
      const next = [...prev];
      next[index] = { query, selected };
      return next;
    });
    setSearchResults((prev) => {
      const next = new Map(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const addPlayer = useCallback(() => {
    setPlayerSlots((prev) => (prev.length >= MAX_PLAYERS ? prev : [...prev, { query: '', selected: null }]));
    setComparison(null);
  }, []);

  const removePlayer = useCallback((index: number) => {
    setPlayerSlots((prev) => {
      if (prev.length <= MIN_PLAYERS) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setSearchResults(new Map());
    setComparison(null);
  }, []);

  const moveSlot = useCallback((index: number, direction: 'up' | 'down') => {
    setPlayerSlots((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSearchResults(new Map());
    setComparison(null);
  }, []);

  const runComparison = useCallback(async () => {
    const names = playerSlots.map((s) => s.selected?.name ?? s.query.trim()).filter(Boolean);
    if (names.length < MIN_PLAYERS) {
      setError('Add at least 2 players');
      return;
    }
    setError(null);
    setComparison(null);
    setLoading(true);
    try {
      const res = await fetch('/api/player-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: names, sport, scoringFormat }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? 'Comparison failed');
        return;
      }
      const data: MultiPlayerComparisonResult = await res.json();
      setComparison(data);
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }, [playerSlots, sport, scoringFormat]);

  const fetchAiInsight = useCallback(async (): Promise<string | null> => {
    if (!comparison) return null;
    const res = await fetch('/api/player-comparison/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        players: comparison.players.map((p) => p.name),
        summaryLines: comparison.summaryLines,
      }),
    });
    const data = await res.json();
    return data.recommendation ?? data.error ?? null;
  }, [comparison]);

  const playerNames = comparison?.players.map((p) => p.name) ?? [];
  const summaryLines = comparison?.summaryLines ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-6 w-6 text-violet-400" />
        <h1 className="text-2xl font-semibold text-white">Player Comparison Lab</h1>
      </div>
      <p className="text-sm text-white/60">
        Compare 2–6 players using market value, projections, consistency, and AI insights.
      </p>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Players & settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Sport</label>
              <Select value={sport} onValueChange={(v) => { setSport(v); setComparison(null); }}>
                <SelectTrigger className="w-[140px] border-white/10 bg-black/30 text-white">
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
            <div>
              <label className="mb-1 block text-sm text-white/70">Scoring format</label>
              <Select
                value={scoringFormat}
                onValueChange={(v) => { setScoringFormat(v as ScoringFormat); setComparison(null); }}
              >
                <SelectTrigger className="w-[140px] border-white/10 bg-black/30 text-white" data-audit="scoring-format-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORING_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {playerSlots.map((slot, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1">
                  <label className="mb-1 block text-sm text-white/70">Player {index + 1}</label>
                  <input
                    type="text"
                    value={slot.query}
                    onChange={(e) => {
                      const q = e.target.value;
                      setPlayerSlots((prev) => {
                        const n = [...prev];
                        n[index] = { ...n[index], query: q };
                        return n;
                      });
                      searchPlayers(q, index);
                    }}
                    onFocus={() => searchPlayers(slot.query, index)}
                    placeholder="Search by name..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40"
                  />
                  {searchResults.get(index) && searchResults.get(index)!.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-auto rounded border border-white/10 bg-black/40">
                      {searchResults.get(index)!.slice(0, 6).map((p) => (
                        <li key={p.name}>
                          <button
                            type="button"
                            onClick={() => setSlot(index, p.name, p)}
                            className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-white/10"
                          >
                            {p.name}
                            {(p.position || p.team) && (
                              <span className="ml-2 text-white/50">
                                {p.position}
                                {p.team ? ` · ${p.team}` : ''}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-white/20"
                    onClick={() => moveSlot(index, 'up')}
                    disabled={index === 0}
                    data-audit="swap-order-up"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-white/20"
                    onClick={() => moveSlot(index, 'down')}
                    disabled={index === playerSlots.length - 1}
                    data-audit="swap-order-down"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-white/20"
                    onClick={() => removePlayer(index)}
                    disabled={playerSlots.length <= MIN_PLAYERS}
                    data-audit="remove-player-button"
                    aria-label="Remove player"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {playerSlots.length < MAX_PLAYERS && (
            <Button
              type="button"
              variant="outline"
              onClick={addPlayer}
              className="gap-2 border-white/20"
              data-audit="add-player-button"
            >
              <Plus className="h-4 w-4" />
              Add player
            </Button>
          )}

          <Button
            onClick={runComparison}
            disabled={loading}
            className="gap-2"
            data-audit="compare-players-button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Compare players
          </Button>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {comparison && (
        <>
          <ComparisonMatrix matrix={comparison.matrix} players={comparison.players} />
          <CategoryWinnerHighlights highlights={comparison.categoryWinners} />
          <PlayerStatCards players={comparison.players} scores={comparison.playerScores} />
          <AIExplanationPanel
            playerNames={playerNames}
            summaryLines={summaryLines}
            onRetryAnalysis={fetchAiInsight}
          />
        </>
      )}
    </main>
  );
}
