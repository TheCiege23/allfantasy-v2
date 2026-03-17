'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export interface WeeklyAdvicePanelProps {
  weeklyAdvice: string | null;
  strategyInsight: string | null;
  rosterMathSummary: string | null;
}

export function WeeklyAdvicePanel({
  weeklyAdvice,
  strategyInsight,
  rosterMathSummary,
}: WeeklyAdvicePanelProps) {
  const hasAny = weeklyAdvice || strategyInsight || rosterMathSummary;

  if (!hasAny) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5" data-audit="weekly-advice-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <GraduationCap className="h-5 w-5 text-amber-400" />
          Weekly advice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weeklyAdvice && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">This week</p>
            <p className="mt-1 text-white/90">{weeklyAdvice}</p>
          </div>
        )}
        {strategyInsight && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Strategy</p>
            <p className="mt-1 text-white/80">{strategyInsight}</p>
          </div>
        )}
        {rosterMathSummary && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Roster math</p>
            <p className="mt-1 text-white/80">{rosterMathSummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
