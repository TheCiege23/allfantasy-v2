'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ImportPreviewResponse } from '@/lib/league-import/ImportedLeaguePreviewBuilder';

export interface SleeperImportPreviewPanelProps {
  preview: ImportPreviewResponse | null;
  loading: boolean;
  onCreateFromImport: () => void;
  createLoading: boolean;
}

export function SleeperImportPreviewPanel({
  preview,
  loading,
  onCreateFromImport,
  createLoading,
}: SleeperImportPreviewPanelProps) {
  if (loading) {
    return (
      <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="ml-2 text-white">Fetching Sleeper league…</span>
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const { league, managers, dataQuality } = preview;
  const coverageItems = dataQuality.coverageSummary.slice(0, 5);
  const tierColor =
    dataQuality.tier === 'FULL'
      ? 'text-green-400'
      : dataQuality.tier === 'PARTIAL'
        ? 'text-amber-400'
        : 'text-amber-500';

  return (
    <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          Import preview: {league.name}
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
          <span>{league.sport}</span>
          <span>·</span>
          <span>{league.type}</span>
          <span>·</span>
          <span>{league.teamCount} teams</span>
          {league.season != null && (
            <>
              <span>·</span>
              <span>Season {league.season}</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {dataQuality.tier === 'FULL' ? (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          ) : (
            <AlertCircle className={`h-5 w-5 ${tierColor}`} />
          )}
          <span className={tierColor}>
            Data quality: {dataQuality.tier} ({dataQuality.completenessScore}%)
          </span>
        </div>
        {dataQuality.signals.length > 0 && (
          <ul className="list-inside list-disc text-xs text-white/60">
            {dataQuality.signals.slice(0, 4).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
        {coverageItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {coverageItems.map((item) => {
              const pillClass =
                item.state === 'full'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : item.state === 'partial'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-200';
              return (
                <span
                  key={item.key}
                  className={`rounded-full border px-2 py-1 text-[11px] ${pillClass}`}
                  title={item.note ?? undefined}
                >
                  {item.label}: {item.state}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-white/80">
          <Users className="h-4 w-4" />
          <span>{managers.length} managers</span>
          <span>·</span>
          <span>{preview.draftPickCount} draft picks</span>
          <span>·</span>
          <span>{preview.transactionCount} transactions</span>
          <span>·</span>
          <span>{preview.matchupWeeks} matchup weeks</span>
        </div>
        <div className="max-h-40 overflow-y-auto rounded border border-purple-600/30 bg-gray-900/50 p-2">
          <p className="mb-1 text-xs font-medium text-white/70">Managers</p>
          <ul className="space-y-0.5 text-xs text-white/90">
            {managers.slice(0, 20).map((m) => (
              <li key={m.rosterId}>
                {m.displayName} — {m.wins}-{m.losses}
                {m.ties ? `-${m.ties}` : ''} ({m.pointsFor} pts)
              </li>
            ))}
            {managers.length > 20 && (
              <li className="text-white/50">+{managers.length - 20} more</li>
            )}
          </ul>
        </div>
        <Button
          onClick={onCreateFromImport}
          disabled={createLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
          size="lg"
        >
          {createLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating League…
            </>
          ) : (
            'Create League from Import'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
