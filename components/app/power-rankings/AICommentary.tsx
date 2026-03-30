'use client';

import { useState, useCallback } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver';
import type { PowerRankingsOutput } from '@/lib/league-power-rankings/types';

export interface AICommentaryProps {
  leagueId: string;
  leagueName: string;
  season: string;
  week: number;
  teams: PowerRankingsOutput['teams'];
  /** Pre-loaded commentary (e.g. from parent fetch). */
  initialCommentary?: {
    formulaExplanation: string | null;
    narrativeExplanation: string | null;
    rankingSummary: string | null;
    providerStatus?: {
      deepseek: boolean;
      grok: boolean;
      openai: boolean;
    };
  } | null;
}

export function AICommentary({
  leagueId,
  leagueName,
  season,
  week,
  teams,
  initialCommentary = null,
}: AICommentaryProps) {
  const [commentary, setCommentary] = useState(initialCommentary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradePath, setUpgradePath] = useState<string | null>(null);

  const fetchCommentary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpgradePath(null);
    try {
      const res = await fetch(
        `/api/leagues/${encodeURIComponent(leagueId)}/power-rankings/commentary?week=${week}`,
        { method: 'POST' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data?.message === 'string' && data.message.trim().length > 0
          ? data.message
          : typeof data?.error === 'string' && data.error.trim().length > 0
            ? data.error
            : 'Failed to load commentary';
        setUpgradePath(typeof data?.upgradePath === 'string' ? data.upgradePath : null);
        throw new Error(message);
      }
      setCommentary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [leagueId, week]);

  const prompt = `Explain the power rankings for ${leagueName}, ${season} Week ${week}. Top teams: ${teams.slice(0, 5).map((t) => `${t.rank}. ${t.displayName || t.username || 'Team'}`).join(', ')}.`;
  const chimmyHref = getChimmyChatHrefWithPrompt(prompt);

  const showSummary = commentary?.rankingSummary ?? commentary?.narrativeExplanation ?? commentary?.formulaExplanation;

  return (
    <Card className="border-white/10 bg-white/5" data-audit="ai-commentary">
      <CardHeader>
        <CardTitle className="text-lg text-white">AI commentary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!commentary && !loading && (
          <Button onClick={fetchCommentary} className="gap-2" size="sm" data-testid="power-rankings-generate-commentary">
            Generate commentary
          </Button>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-400/35 bg-red-500/10 px-3 py-2">
            <p className="text-sm text-red-200">{error}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <a
                href={upgradePath || '/commissioner-upgrade?feature=league_rankings'}
                className="inline-flex rounded border border-amber-400/35 bg-amber-500/10 px-2 py-1 text-amber-100 hover:bg-amber-500/20"
              >
                View plans
              </a>
              <a
                href="/tokens?ruleCode=ai_league_rankings_explanation"
                className="inline-flex rounded border border-cyan-400/35 bg-cyan-500/10 px-2 py-1 text-cyan-100 hover:bg-cyan-500/20"
              >
                Buy tokens
              </a>
            </div>
          </div>
        )}
        {showSummary && commentary && (
          <div className="space-y-3 text-sm text-white/85">
            {commentary.rankingSummary && (
              <p><strong>Summary:</strong> {commentary.rankingSummary}</p>
            )}
            {commentary.narrativeExplanation && (
              <p><strong>Narrative:</strong> {commentary.narrativeExplanation}</p>
            )}
            {commentary.formulaExplanation && (
              <p><strong>Formula:</strong> {commentary.formulaExplanation}</p>
            )}
            {commentary.providerStatus && (
              <p className="text-xs text-white/60" data-testid="power-rankings-provider-status">
                Providers - DeepSeek: {commentary.providerStatus.deepseek ? 'on' : 'off'}, Grok: {commentary.providerStatus.grok ? 'on' : 'off'}, OpenAI: {commentary.providerStatus.openai ? 'on' : 'off'}
              </p>
            )}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-white/20"
          asChild
        >
          <a
            href={chimmyHref}
            data-audit="chimmy-explanation-opens"
            data-testid="power-rankings-chimmy-explanation-link"
          >
            <MessageCircle className="h-4 w-4" />
            Chimmy explanation
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
