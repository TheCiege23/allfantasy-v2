'use client';

import { ArrowRight, UserPlus, ArrowLeftRight, LayoutList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActionRecommendation, WaiverOpportunity, TradeSuggestion } from '@/lib/fantasy-coach/types';

export interface ActionRecommendationCardsProps {
  actionRecommendations: ActionRecommendation[];
  waiverOpportunities: WaiverOpportunity[];
  tradeSuggestions: TradeSuggestion[];
}

export function ActionRecommendationCards({
  actionRecommendations,
  waiverOpportunities,
  tradeSuggestions,
}: ActionRecommendationCardsProps) {
  return (
    <div className="space-y-4" data-audit="action-recommendation-cards">
      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionRecommendations.map((action) => (
            <a
              key={action.id}
              href={action.toolHref}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-white/10"
              data-audit="recommendation-opens-tool"
            >
              <div className="flex items-center gap-3">
                {action.type === 'waiver' && <UserPlus className="h-5 w-5 text-cyan-400" />}
                {action.type === 'trade' && <ArrowLeftRight className="h-5 w-5 text-amber-400" />}
                {action.type === 'lineup' && <LayoutList className="h-5 w-5 text-emerald-400" />}
                <div>
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="text-sm text-white/60">{action.summary}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/50" />
            </a>
          ))}
        </CardContent>
      </Card>

      {waiverOpportunities.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white">Waiver opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {waiverOpportunities.map((w, i) => (
              <a
                key={i}
                href={w.playerHref}
                className="block rounded-lg border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10"
                data-audit="waiver-target-opens-player-page"
              >
                <p className="font-medium text-white">
                  {w.playerName}
                  {w.position && <span className="ml-2 text-white/50">({w.position})</span>}
                </p>
                <p className="text-sm text-white/60">{w.reason}</p>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      {tradeSuggestions.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white">Trade suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tradeSuggestions.map((t, i) => (
              <a
                key={i}
                href={t.tradeAnalyzerHref}
                className="block rounded-lg border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-white/10"
                data-audit="trade-suggestion-opens-trade-analyzer"
              >
                <p className="font-medium text-white">{t.summary}</p>
                {t.targetHint && <p className="text-sm text-white/60">{t.targetHint}</p>}
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
