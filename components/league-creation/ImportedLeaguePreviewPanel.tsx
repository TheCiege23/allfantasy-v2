'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, CheckCircle2, AlertCircle, Settings, Trophy, Calendar, History, ArrowLeft } from 'lucide-react';
import type { ImportPreviewResponse } from '@/lib/league-import/ImportedLeaguePreviewBuilder';
import { getImportProviderLabel } from '@/lib/league-import/provider-ui-config';
import type { ImportProvider } from '@/lib/league-import/types';

export interface ImportedLeaguePreviewPanelProps {
  /** Current import provider (e.g. sleeper). */
  provider: ImportProvider | null;
  preview: ImportPreviewResponse | null;
  loading: boolean;
  onCreateFromImport: () => void;
  createLoading: boolean;
  /** Optional: clear preview so user can enter a different league ID. */
  onBack?: () => void;
}

export function ImportedLeaguePreviewPanel({
  provider,
  preview,
  loading,
  onCreateFromImport,
  createLoading,
  onBack,
}: ImportedLeaguePreviewPanelProps) {
  if (loading) {
    return (
      <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          <span className="ml-2 text-white">Fetching league…</span>
        </CardContent>
      </Card>
    );
  }

  if (!preview) return null;

  const { league, managers, dataQuality } = preview;
  const tierColor =
    dataQuality.tier === 'FULL'
      ? 'text-green-400'
      : dataQuality.tier === 'PARTIAL'
        ? 'text-amber-400'
        : 'text-amber-500';
  const sourceLabel = provider ? getImportProviderLabel(provider) : preview.source?.source_provider ?? 'Import';

  return (
    <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          {league.avatar && (
            <img
              src={league.avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover border border-purple-600/40"
            />
          )}
          <div>
            <CardTitle className="text-lg text-white">Import preview: {league.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/70 mt-0.5">
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
              <span>·</span>
              <span className="text-purple-300">Source: {sourceLabel}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Data quality */}
        <div className="flex items-center gap-2">
          {dataQuality.tier === 'FULL' ? (
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
          ) : (
            <AlertCircle className={`h-5 w-5 shrink-0 ${tierColor}`} />
          )}
          <span className={tierColor}>
            Data quality: {dataQuality.tier} ({dataQuality.completenessScore}%)
          </span>
        </div>
        {dataQuality.signals.length > 0 && (
          <ul className="list-inside list-disc text-xs text-white/60">
            {dataQuality.signals.slice(0, 5).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}

        {/* Settings summary: roster, scoring, playoff, draft */}
        <div className="rounded border border-purple-600/30 bg-gray-900/50 p-3 space-y-2">
          <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/90">
            <span className="text-white/60">Roster</span>
            <span>{preview.rosterPositions?.length ? preview.rosterPositions.join(', ') : '—'}</span>
            <span className="text-white/60">Scoring</span>
            <span>
              {[
                league.settings?.ppr && 'PPR',
                league.settings?.superflex && 'Superflex',
                league.settings?.tep && 'TEP',
              ]
                .filter(Boolean)
                .join(', ') || 'Standard'}
            </span>
            <span className="text-white/60">Playoff teams</span>
            <span>{league.playoffTeams ?? '—'}</span>
            <span className="text-white/60">Draft</span>
            <span>{preview.draftPickCount} picks imported</span>
          </div>
        </div>

        {/* Historical data */}
        <div className="flex items-center gap-2 text-xs text-white/70">
          <History className="h-4 w-4 shrink-0" />
          <span>
            Historical data: {dataQuality.sources.history ? 'Previous seasons available' : 'No previous seasons'}
          </span>
        </div>

        {/* Managers / teams with logos */}
        <div>
          <p className="text-xs font-medium text-white/70 flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5" />
            Managers & teams ({managers.length})
          </p>
          <div className="max-h-44 overflow-y-auto rounded border border-purple-600/30 bg-gray-900/50 p-2 space-y-1.5">
            {managers.slice(0, 24).map((m) => (
              <div
                key={m.rosterId}
                className="flex items-center gap-2 text-xs text-white/90"
              >
                {m.avatar ? (
                  <img
                    src={m.avatar}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-white/10 shrink-0" />
                )}
                <span className="truncate">{m.displayName}</span>
                <span className="text-white/50 shrink-0">
                  {m.wins}-{m.losses}
                  {m.ties ? `-${m.ties}` : ''} · {m.pointsFor} pts
                </span>
              </div>
            ))}
            {managers.length > 24 && (
              <p className="text-white/50 text-xs">+{managers.length - 24} more</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-white/80">
          <Trophy className="h-4 w-4" />
          <span>{preview.draftPickCount} draft picks</span>
          <span>·</span>
          <span>{preview.transactionCount} transactions</span>
          <span>·</span>
          <Calendar className="h-4 w-4" />
          <span>{preview.matchupWeeks} matchup weeks</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onCreateFromImport}
            disabled={createLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
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
          {onBack && (
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={createLoading}
              className="border-purple-600/40 text-purple-300 shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Try different league ID
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
