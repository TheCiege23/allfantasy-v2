'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trophy } from 'lucide-react';
import { useSportPreset, type LeagueSportOption } from '@/hooks/useSportPreset';
import { getVariantsForSport } from '@/lib/sport-defaults/LeagueVariantRegistry';
import {
  LeagueCreationSportSelector,
  LeagueCreationPresetSelector,
  LeagueSettingsPreviewPanel,
  LeagueCreationModeSelector,
  ImportProviderSelector,
  ImportSourceInputPanel,
  ImportedLeaguePreviewPanel,
  type CreationMode,
} from '@/components/league-creation';
import type { ImportPreviewResponse } from '@/lib/league-import/ImportedLeaguePreviewBuilder';
import type { ImportProvider } from '@/lib/league-import/types';
import { fetchImportPreview, submitImportCreation } from '@/lib/league-import/LeagueCreationImportSubmissionService';

function leagueOptionToSport(opt: LeagueSportOption): 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER' {
  return opt as 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAAF' | 'NCAAB' | 'SOCCER';
}

export default function StartupDynastyForm({ userId }: { userId: string }) {
  const [creationMode, setCreationMode] = useState<CreationMode>('create');
  const [sport, setSport] = useState<LeagueSportOption>('NFL');
  const [leagueVariant, setLeagueVariant] = useState<string>('PPR');
  const [leagueName, setLeagueName] = useState('');
  const [platform, setPlatform] = useState<'sleeper' | 'espn' | 'manual'>('sleeper');
  const [platformLeagueId, setPlatformLeagueId] = useState('');
  const [leagueSize, setLeagueSize] = useState('12');
  const [scoring, setScoring] = useState('ppr');
  const [format, setFormat] = useState<'dynasty' | 'keeper'>('dynasty');
  const [qbFormat, setQbFormat] = useState<'1qb' | 'sf'>('sf');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Import flow (provider-ready: Sleeper first)
  const [importProvider, setImportProvider] = useState<ImportProvider | null>('sleeper');
  const [importSourceInput, setImportSourceInput] = useState('');
  const [importPreview, setImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [importPreviewLoading, setImportPreviewLoading] = useState(false);
  const [createFromImportLoading, setCreateFromImportLoading] = useState(false);

  const sportType = leagueOptionToSport(sport);
  const variantOptions = getVariantsForSport(sportType);
  const { preset, loading: presetLoading } = useSportPreset(
    sport,
    sport === 'NFL' ? leagueVariant : sport === 'SOCCER' ? leagueVariant || 'STANDARD' : undefined
  );

  useEffect(() => {
    if (sport !== 'NFL') setLeagueVariant('STANDARD');
  }, [sport]);

  useEffect(() => {
    if (!preset) return;
    setLeagueSize(String(preset.league.default_team_count));
    if (sport === 'NFL' && !['IDP', 'DYNASTY_IDP'].includes(leagueVariant)) {
      const fmt = (preset.scoring.scoring_format ?? '').toLowerCase();
      if (fmt === 'half ppr' || fmt === 'half_ppr') setScoring('half_ppr');
      else if (fmt === 'standard') setScoring('standard');
      else if (fmt === 'points') setScoring('points');
      else if (fmt === 'ppr') setScoring('ppr');
    }
    if (!leagueName.trim()) setLeagueName(preset.league.default_league_name_pattern || '');
  }, [preset, sport, leagueVariant]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!leagueName.trim()) newErrors.leagueName = 'League name is required';
    if (platform !== 'manual' && !platformLeagueId.trim()) {
      newErrors.platformLeagueId = `${platform === 'sleeper' ? 'Sleeper' : 'ESPN'} League ID is required`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFetchImportPreview = async () => {
    if (!importProvider) {
      toast.error('Select an import platform');
      return;
    }
    setImportPreviewLoading(true);
    setImportPreview(null);
    const result = await fetchImportPreview(importProvider, importSourceInput);
    setImportPreviewLoading(false);
    if (!result.ok) {
      toast.error(result.error ?? 'Failed to load league');
      return;
    }
    setImportPreview(result.data as ImportPreviewResponse);
  };

  const handleCreateFromImport = async () => {
    if (!importProvider || !importSourceInput.trim() || !importPreview) return;
    setCreateFromImportLoading(true);
    const result = await submitImportCreation(importProvider, importSourceInput, userId);
    setCreateFromImportLoading(false);
    if (!result.ok) {
      if (result.status === 409) toast.error('This league already exists in your account');
      else toast.error(result.error ?? 'Failed to create league');
      return;
    }
    toast.success('League imported! Redirecting...');
    const leagueId = (result.data as { league?: { id?: string } })?.league?.id;
    setTimeout(() => {
      window.location.href = leagueId ? `/leagues/${leagueId}` : '/af-legacy';
    }, 1500);
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/league/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: leagueName.trim(),
          platform,
          platformLeagueId: platform !== 'manual' ? platformLeagueId.trim() : undefined,
          leagueSize: Number(leagueSize),
          scoring: sport === 'NFL' ? (scoring === 'half_ppr' ? 'Half PPR' : scoring === 'standard' ? 'Standard' : 'PPR') : (preset?.scoring?.scoring_format ?? scoring),
          isDynasty: format === 'dynasty',
          isSuperflex: qbFormat === 'sf',
          sport,
          leagueVariant: sport === 'NFL' ? leagueVariant : sport === 'SOCCER' ? 'STANDARD' : undefined,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('This league already exists in your account');
        } else {
          toast.error(data.error || 'Failed to create league');
        }
        return;
      }

      toast.success('Dynasty league created! Redirecting...');
      const leagueId = data?.league?.id;
      setTimeout(() => {
        window.location.href = leagueId ? `/leagues/${leagueId}` : '/af-legacy';
      }, 1500);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <Trophy className="h-5 w-5 text-purple-400" />
          League Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <LeagueCreationModeSelector
          value={creationMode}
          onChange={(mode) => {
            setCreationMode(mode);
            if (mode === 'create') setImportPreview(null);
          }}
          disabled={loading || importPreviewLoading || createFromImportLoading}
        />
        {creationMode === 'import' && (
          <>
            <ImportProviderSelector
              value={importProvider}
              onChange={(p) => {
                setImportProvider(p);
                setImportPreview(null);
              }}
              disabled={importPreviewLoading || createFromImportLoading}
            />
            <ImportSourceInputPanel
              provider={importProvider}
              sourceInput={importSourceInput}
              onSourceInputChange={setImportSourceInput}
              onFetchPreview={handleFetchImportPreview}
              loading={importPreviewLoading}
              disabled={createFromImportLoading}
            />
            <ImportedLeaguePreviewPanel
              provider={importProvider}
              preview={importPreview}
              loading={importPreviewLoading}
              onCreateFromImport={handleCreateFromImport}
              createLoading={createFromImportLoading}
              onBack={() => setImportPreview(null)}
            />
          </>
        )}
        {creationMode === 'create' && (
          <>
        <LeagueCreationSportSelector
          value={sport}
          onChange={(v) => setSport(v)}
          disabled={loading}
          showHelper
        />
        {presetLoading && <p className="text-white/50 text-xs mt-1">Loading preset…</p>}
        <LeagueCreationPresetSelector
          sport={sport}
          variantOptions={variantOptions}
          value={leagueVariant}
          onChange={setLeagueVariant}
          disabled={loading}
          showHelper
        />
        {preset && (
          <LeagueSettingsPreviewPanel
            preset={preset}
            sport={sport}
            presetLabel={variantOptions.find((v) => v.value === leagueVariant)?.label}
          />
        )}
        <div>
          <Label htmlFor="league-name">League Name</Label>
          <Input
            id="league-name"
            placeholder="e.g. Dynasty Dawgs"
            value={leagueName}
            onChange={(e) => { setLeagueName(e.target.value); setErrors(prev => { const n = { ...prev }; delete n.leagueName; return n; }); }}
            disabled={loading}
            className={`bg-gray-900 focus:border-purple-500 ${errors.leagueName ? 'border-red-500' : 'border-purple-600/40'}`}
          />
          {errors.leagueName && <p className="text-red-400 text-sm mt-1">{errors.leagueName}</p>}
        </div>

        <div>
          <Label>Platform</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as any)}>
            <SelectTrigger className="bg-gray-900 border-purple-600/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sleeper">Sleeper</SelectItem>
              <SelectItem value="espn">ESPN</SelectItem>
              <SelectItem value="manual">Manual Setup</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {platform !== 'manual' && (
          <div>
            <Label htmlFor="platform-id">{platform === 'sleeper' ? 'Sleeper' : 'ESPN'} League ID</Label>
            <Input
              id="platform-id"
              placeholder={platform === 'sleeper' ? 'e.g. 123456789' : 'e.g. 12345678'}
              value={platformLeagueId}
              onChange={(e) => { setPlatformLeagueId(e.target.value); setErrors(prev => { const n = { ...prev }; delete n.platformLeagueId; return n; }); }}
              disabled={loading}
              className={`bg-gray-900 focus:border-purple-500 ${errors.platformLeagueId ? 'border-red-500' : 'border-purple-600/40'}`}
            />
            {errors.platformLeagueId && <p className="text-red-400 text-sm mt-1">{errors.platformLeagueId}</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>League Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as any)}>
              <SelectTrigger className="bg-gray-900 border-purple-600/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dynasty">Dynasty</SelectItem>
                <SelectItem value="keeper">Keeper</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sport === 'NFL' && !['IDP', 'DYNASTY_IDP'].includes(leagueVariant) && (
            <div>
              <Label>QB Format</Label>
              <Select value={qbFormat} onValueChange={(v) => setQbFormat(v as any)}>
                <SelectTrigger className="bg-gray-900 border-purple-600/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sf">Superflex (2QB)</SelectItem>
                  <SelectItem value="1qb">1QB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {sport === 'SOCCER' && (
            <div className="text-white/60 text-sm flex items-center">
              Standard soccer scoring (goals, assists, clean sheets, etc.)
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>League Size</Label>
            <Select value={leagueSize} onValueChange={setLeagueSize}>
              <SelectTrigger className="bg-gray-900 border-purple-600/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 Teams</SelectItem>
                <SelectItem value="10">10 Teams</SelectItem>
                <SelectItem value="12">12 Teams</SelectItem>
                <SelectItem value="14">14 Teams</SelectItem>
                <SelectItem value="16">16 Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {sport === 'NFL' && !['IDP', 'DYNASTY_IDP'].includes(leagueVariant) && (
            <div>
              <Label>Scoring</Label>
              <Select value={scoring} onValueChange={setScoring}>
                <SelectTrigger className="bg-gray-900 border-purple-600/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ppr">PPR</SelectItem>
                  <SelectItem value="half_ppr">Half PPR</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="te_premium">TE Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {sport === 'NFL' && ['IDP', 'DYNASTY_IDP'].includes(leagueVariant) && (
            <div className="text-white/60 text-sm flex items-center">
              IDP scoring (offensive + defensive stats) applied from preset.
            </div>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
          size="lg"
        >
          {loading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating League...</>
          ) : (
            <><Trophy className="mr-2 h-4 w-4" /> Create Dynasty League</>
          )}
        </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
