'use client';

import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
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
import type { CoachEvaluationResult } from '@/lib/fantasy-coach/types';
import { ActionRecommendationCards } from './ActionRecommendationCards';
import { WeeklyAdvicePanel } from './WeeklyAdvicePanel';

export interface CoachDashboardProps {
  leagueId?: string;
  leagueName?: string;
}

export function CoachDashboard({ leagueId, leagueName }: CoachDashboardProps) {
  const [sport, setSport] = useState(SUPPORTED_SPORTS[0]);
  const [data, setData] = useState<CoachEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('sport', sport);
    if (leagueId) params.set('leagueId', leagueId);
    if (leagueName) params.set('leagueName', leagueName);
    fetch(`/api/coach/evaluation?${params.toString()}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.error ?? 'Failed to load'); });
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [sport, leagueId, leagueName]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-amber-400" />
        <h1 className="text-2xl font-semibold text-white">Coach Mode</h1>
      </div>
      <p className="text-sm text-white/60">
        AI Coach evaluates your roster: strengths, weaknesses, waiver opportunities, trade targets, and lineup improvements.
      </p>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Sport</label>
            <Select value={sport} onValueChange={(v) => setSport(v as typeof sport)}>
              <SelectTrigger className="w-[140px] border-white/10 bg-black/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_SPORTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
            Evaluate team
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <>
          <WeeklyAdvicePanel
            weeklyAdvice={data.weeklyAdvice}
            strategyInsight={data.strategyInsight}
            rosterMathSummary={data.rosterMathSummary}
          />

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase text-emerald-400/90">Strengths</p>
                <ul className="mt-1 list-inside list-disc text-sm text-white/80">
                  {data.rosterStrengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-rose-400/90">Weaknesses</p>
                <ul className="mt-1 list-inside list-disc text-sm text-white/80">
                  {data.rosterWeaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-cyan-400/90">Lineup improvements</p>
                <ul className="mt-1 list-inside list-disc text-sm text-white/80">
                  {data.lineupImprovements.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <ActionRecommendationCards
            actionRecommendations={data.actionRecommendations}
            waiverOpportunities={data.waiverOpportunities}
            tradeSuggestions={data.tradeSuggestions}
          />
        </>
      )}
    </main>
  );
}
