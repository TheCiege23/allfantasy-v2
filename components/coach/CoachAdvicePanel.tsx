'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdviceType, CoachAdviceResult } from '@/lib/fantasy-coach/types';

type AdviceTypeOption = {
  id: AdviceType;
  label: string;
};

const ADVICE_TYPE_OPTIONS: AdviceTypeOption[] = [
  { id: 'lineup', label: 'Lineup advice' },
  { id: 'trade', label: 'Trade advice' },
  { id: 'waiver', label: 'Waiver advice' },
];

export type CoachAdviceRequester = (input: {
  type: AdviceType;
  leagueId?: string;
  leagueName?: string;
  week?: number;
  teamName?: string;
  sport?: string;
}) => Promise<CoachAdviceResult>;

export interface CoachAdvicePanelProps {
  leagueId?: string;
  leagueName?: string;
  week?: number;
  teamName?: string;
  sport?: string;
  requestAdvice?: CoachAdviceRequester;
}

async function requestCoachAdvice(input: {
  type: AdviceType;
  leagueId?: string;
  leagueName?: string;
  week?: number;
  teamName?: string;
  sport?: string;
}): Promise<CoachAdviceResult> {
  const res = await fetch('/api/coach/advice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Failed to get coach advice');
  }
  return data as CoachAdviceResult;
}

export function CoachAdvicePanel({
  leagueId,
  leagueName,
  week,
  teamName,
  sport,
  requestAdvice = requestCoachAdvice,
}: CoachAdvicePanelProps) {
  const [type, setType] = useState<AdviceType>('lineup');
  const [advice, setAdvice] = useState<CoachAdviceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSelectType = useCallback((nextType: AdviceType) => {
    setType(nextType);
    setAdvice(null);
    setError(null);
  }, []);

  const onGetAdvice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await requestAdvice({
        type,
        leagueId,
        leagueName,
        week,
        teamName,
        sport,
      });
      setAdvice(result);
    } catch (e) {
      setAdvice(null);
      setError(e instanceof Error ? e.message : 'Failed to get coach advice');
    } finally {
      setLoading(false);
    }
  }, [leagueId, leagueName, requestAdvice, sport, teamName, type, week]);

  const title = useMemo(() => {
    const found = ADVICE_TYPE_OPTIONS.find((option) => option.id === advice?.type);
    return found?.label ?? 'Strategy explanation';
  }, [advice?.type]);

  return (
    <Card className="border-white/10 bg-white/5" data-audit="coach-mode-advice-card">
      <CardHeader>
        <CardTitle className="text-lg text-white">Coach Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {ADVICE_TYPE_OPTIONS.map((option) => {
            const active = type === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectType(option.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? 'border-cyan-400/70 bg-cyan-400/20 text-cyan-200'
                    : 'border-white/15 bg-black/20 text-white/70 hover:bg-white/10'
                }`}
                data-testid={`coach-advice-type-${option.id}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => void onGetAdvice()}
          disabled={loading}
          className="gap-2"
          data-testid="coach-mode-button"
          data-audit="coach-mode-button"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
          Get coach advice
        </Button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {advice && (
          <section
            className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4"
            data-testid="strategy-explanation-panel"
            data-audit="strategy-explanation-panel"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-300/90">{title}</p>
            <p className="mt-2 text-sm font-medium text-white">{advice.summary}</p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-white/80">
              {advice.bullets.map((bullet, index) => (
                <li key={`${bullet}-${index}`}>{bullet}</li>
              ))}
            </ul>
            <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-amber-300">Your challenge</p>
              <p className="mt-1 text-sm text-amber-100/90">{advice.challenge}</p>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
