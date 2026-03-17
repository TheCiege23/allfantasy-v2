'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver';

export interface AIExplanationPanelProps {
  playerNames: string[];
  summaryLines: string[];
  /** Callback to trigger AI analysis (e.g. POST /api/player-comparison/insight). */
  onRetryAnalysis: () => Promise<string | null>;
  /** Initial recommendation if already loaded. */
  initialRecommendation?: string | null;
}

export function AIExplanationPanel({
  playerNames,
  summaryLines,
  onRetryAnalysis,
  initialRecommendation = null,
}: AIExplanationPanelProps) {
  const [recommendation, setRecommendation] = useState<string | null>(initialRecommendation ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    try {
      const text = await onRetryAnalysis();
      setRecommendation(text);
    } catch {
      setError('Failed to load AI analysis');
    } finally {
      setLoading(false);
    }
  };

  const chimmyPrompt = `Compare these players and give a recommendation: ${playerNames.join(', ')}. Summary: ${summaryLines.slice(0, 3).join(' ')}`;
  const chimmyHref = getChimmyChatHrefWithPrompt(chimmyPrompt);

  return (
    <Card className="border-white/10 bg-white/5" data-audit="ai-explanation-panel">
      <CardHeader>
        <CardTitle className="text-lg text-white">AI explanation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRetry}
            disabled={loading}
            className="gap-2 border-white/20"
            data-audit="retry-analysis-button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry analysis
          </Button>
          <Button variant="outline" className="gap-2 border-white/20" asChild>
            <a href={chimmyHref} data-audit="open-in-chimmy-link">
              <ExternalLink className="h-4 w-4" />
              Open in Chimmy
            </a>
          </Button>
        </div>
        {!recommendation && !loading && (
          <Button
            onClick={handleRetry}
            disabled={loading}
            className="gap-2"
            data-audit="get-ai-insight-button"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Get AI insight
          </Button>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {recommendation && (
          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/90">
            {recommendation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
