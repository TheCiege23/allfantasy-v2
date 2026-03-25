'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Play, RefreshCw, Loader2, Share2, Check } from 'lucide-react';
import { MatchupShareModal } from '@/components/matchup-sharing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_SPORT } from '@/lib/sport-scope';
import {
  buildMatchupSummaryForAI,
  buildPositionComparisonRows,
  formatScoreRangeLabel,
  getMatchupAIChatUrl,
  getSportOptionsForSimulation,
  getSimulationTeamPresets,
  MATCHUP_SIMULATOR_MESSAGES,
  resolveComparisonSummary,
} from '@/lib/matchup-simulator';
import { WinProbabilityMeter } from './WinProbabilityMeter';
import { SimulationChart } from './SimulationChart';
import { UpsideDownsideCards } from './UpsideDownsideCards';

export type MatchupResult = {
  winProbabilityA: number;
  winProbabilityB: number;
  marginMean: number;
  marginStdDev: number;
  projectedScoreA: number;
  projectedScoreB: number;
  scoreRangeA: [number, number];
  scoreRangeB: [number, number];
  upsetChance: number;
  volatilityTag: 'low' | 'medium' | 'high';
  iterations: number;
  upsideScenario?: { teamA: number; teamB: number; percentile: number } | null;
  downsideScenario?: { teamA: number; teamB: number; percentile: number } | null;
  scoreDistributionA?: number[] | null;
  scoreDistributionB?: number[] | null;
};

export interface MatchupSimulationPageProps {
  teamAName?: string;
  teamBName?: string;
  leagueId?: string;
  /** Initial lineup (projections). When these change, simulation re-runs. */
  initialTeamA?: { mean: number; stdDev?: number };
  initialTeamB?: { mean: number; stdDev?: number };
}

export function MatchupSimulationPage({
  teamAName: initialTeamAName = 'Team A',
  teamBName: initialTeamBName = 'Team B',
  leagueId,
  initialTeamA,
  initialTeamB,
}: MatchupSimulationPageProps) {
  const [sport, setSport] = useState(DEFAULT_SPORT);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const sportOptions = useMemo(() => getSportOptionsForSimulation(), []);
  const sportPresets = useMemo(() => getSimulationTeamPresets(sport), [sport]);
  const defaultPresetA = sportPresets[0];
  const defaultPresetB = sportPresets[1] ?? sportPresets[0];
  const [selectedPresetA, setSelectedPresetA] = useState<string>(defaultPresetA?.id ?? 'custom-a');
  const [selectedPresetB, setSelectedPresetB] = useState<string>(defaultPresetB?.id ?? 'custom-b');
  const [teamAName, setTeamAName] = useState(initialTeamAName);
  const [teamBName, setTeamBName] = useState(initialTeamBName);
  const [weekOrPeriod, setWeekOrPeriod] = useState(1);
  const [teamA, setTeamA] = useState({ mean: initialTeamA?.mean ?? 100, stdDev: initialTeamA?.stdDev ?? 15 });
  const [teamB, setTeamB] = useState({ mean: initialTeamB?.mean ?? 95, stdDev: initialTeamB?.stdDev ?? 15 });
  const [result, setResult] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [chartMode, setChartMode] = useState<'distribution' | 'scoreRanges'>('distribution');
  const [positionTab, setPositionTab] = useState<'all' | 'edges'>('all');

  useEffect(() => {
    const presetA = sportPresets[0];
    const presetB = sportPresets[1] ?? sportPresets[0];
    if (!presetA || !presetB) return;
    setSelectedPresetA(presetA.id);
    setSelectedPresetB(presetB.id);
    setTeamAName(presetA.name);
    setTeamBName(presetB.name);
    setTeamA({ mean: presetA.mean, stdDev: presetA.stdDev });
    setTeamB({ mean: presetB.mean, stdDev: presetB.stdDev });
    setResult(null);
    setError(null);
  }, [sport, sportPresets]);

  const applyPreset = useCallback(
    (team: 'A' | 'B', presetId: string) => {
      const selected = sportPresets.find((preset) => preset.id === presetId);
      if (!selected) return;
      if (team === 'A') {
        setSelectedPresetA(presetId);
        setTeamAName(selected.name);
        setTeamA({ mean: selected.mean, stdDev: selected.stdDev });
      } else {
        setSelectedPresetB(presetId);
        setTeamBName(selected.name);
        setTeamB({ mean: selected.mean, stdDev: selected.stdDev });
      }
      setResult(null);
      setError(null);
    },
    [sportPresets]
  );

  const clearSimulation = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const resetSimulator = useCallback(() => {
    const presetA = sportPresets[0];
    const presetB = sportPresets[1] ?? sportPresets[0];
    if (!presetA || !presetB) return;
    setSelectedPresetA(presetA.id);
    setSelectedPresetB(presetB.id);
    setTeamAName(presetA.name);
    setTeamBName(presetB.name);
    setTeamA({ mean: presetA.mean, stdDev: presetA.stdDev });
    setTeamB({ mean: presetB.mean, stdDev: presetB.stdDev });
    setWeekOrPeriod(1);
    setChartMode('distribution');
    setPositionTab('all');
    setResult(null);
    setError(null);
  }, [sportPresets]);

  const runSimulation = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch('/api/simulation/matchup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport,
        weekOrPeriod,
        teamA: { mean: teamA.mean, stdDev: teamA.stdDev },
        teamB: { mean: teamB.mean, stdDev: teamB.stdDev },
        iterations: 1500,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.error ?? 'Simulation failed'); });
        return r.json();
      })
      .then((data) => {
        setResult({
          winProbabilityA: data.winProbabilityA,
          winProbabilityB: data.winProbabilityB,
          marginMean: data.marginMean ?? 0,
          marginStdDev: data.marginStdDev ?? 0,
          projectedScoreA: data.projectedScoreA,
          projectedScoreB: data.projectedScoreB,
          scoreRangeA: data.scoreRangeA,
          scoreRangeB: data.scoreRangeB,
          upsetChance: data.upsetChance,
          volatilityTag: data.volatilityTag,
          iterations: data.iterations,
          upsideScenario: data.upsideScenario ?? null,
          downsideScenario: data.downsideScenario ?? null,
          scoreDistributionA: data.scoreDistributionA ?? null,
          scoreDistributionB: data.scoreDistributionB ?? null,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  }, [sport, teamA.mean, teamA.stdDev, teamB.mean, teamB.stdDev, weekOrPeriod]);

  // Lineup change updates simulation when user clicks Simulate or Rerun (same handler).

  const comparisonSummary = useMemo(
    () => (result ? resolveComparisonSummary(teamAName, teamBName, result) : null),
    [result, teamAName, teamBName]
  );

  const positionRows = useMemo(() => {
    if (!result) return [];
    return buildPositionComparisonRows({
      sport,
      teamAMean: result.projectedScoreA,
      teamBMean: result.projectedScoreB,
      teamAStdDev: teamA.stdDev,
      teamBStdDev: teamB.stdDev,
      maxRows: 8,
    });
  }, [result, sport, teamA.stdDev, teamB.stdDev]);

  const visiblePositionRows =
    positionTab === 'edges'
      ? positionRows.filter((row) => row.advantage !== 'even')
      : positionRows;

  const chimmyUrl = result
    ? getMatchupAIChatUrl(
        buildMatchupSummaryForAI({
          teamAName,
          teamBName,
          projectedScoreA: result.projectedScoreA,
          projectedScoreB: result.projectedScoreB,
          scoreRangeA: result.scoreRangeA,
          scoreRangeB: result.scoreRangeB,
          winProbA: result.winProbabilityA * 100,
          winProbB: result.winProbabilityB * 100,
          upsetChance: result.upsetChance,
          volatilityTag: result.volatilityTag,
          sport,
          strengths: comparisonSummary?.strengthBullets,
          weaknesses: comparisonSummary?.weaknessBullets,
          positionEdgeSummary: positionRows
            .filter((row) => row.advantage !== 'even')
            .slice(0, 3)
            .map((row) => `${row.slotLabel}: ${row.edgeLabel}`)
            .join(', '),
        }),
        {
          leagueId,
          insightType: 'matchup',
          sport,
          week: weekOrPeriod,
        }
      )
    : getMatchupAIChatUrl(undefined, {
        leagueId,
        insightType: 'matchup',
        sport,
        week: weekOrPeriod,
      });

  const shareMatchupResult = useCallback(async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/share/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareType: 'winning_matchup',
          sport,
          teamName: teamAName,
          opponentName: teamBName,
          score: Math.round(result.projectedScoreA),
          week: weekOrPeriod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const caption = data.caption || data.headline || `${teamAName} vs ${teamBName}: ${(result.winProbabilityA * 100).toFixed(0)}% win probability for ${teamAName}. Simulated on AllFantasy.`;
      await navigator.clipboard.writeText(caption);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      const fallback = `${teamAName} vs ${teamBName}: ${(result.winProbabilityA * 100).toFixed(0)}% win probability. Simulated on AllFantasy.`;
      await navigator.clipboard.writeText(fallback);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [result, sport, teamAName, teamBName, weekOrPeriod]);

  if (!simulatorOpen) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-lg text-white">Matchup Simulator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/70">
              Compare two teams, run Monte Carlo outcomes, inspect score ranges, and jump straight into AI matchup explanation.
            </p>
            <Button
              onClick={() => setSimulatorOpen(true)}
              data-testid="matchup-open-simulator"
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Open simulator
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
        <h1 className="text-2xl font-semibold text-white">Matchup simulation</h1>
        <p className="text-sm text-white/60 mt-1">
            Deterministic 1,000+ sims with projections and variance. Win probability, score ranges, position edges, and AI-ready context.
        </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setSimulatorOpen(false)}
          data-testid="matchup-back-button"
          className="border-white/20"
        >
          Back
        </Button>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Team comparison setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Sport</label>
            <Select value={sport} onValueChange={(v) => setSport(v as typeof sport)}>
              <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30 text-white" data-testid="matchup-sport-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sportOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-white/70">Week / period</label>
            <input
              type="number"
              min={1}
              value={weekOrPeriod}
              onChange={(e) => setWeekOrPeriod(Math.max(1, Number(e.target.value) || 1))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              data-testid="matchup-week-period-input"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/70">Team A selector</label>
              <Select value={selectedPresetA} onValueChange={(value) => applyPreset('A', value)}>
                <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30 text-white" data-testid="matchup-team-a-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-sm text-white/70">Team A name</label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-a-name-input"
              />
              <label className="mt-2 block text-sm text-white/70">Projected points (mean)</label>
              <input
                type="number"
                value={teamA.mean}
                onChange={(e) => setTeamA((p) => ({ ...p, mean: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-a-mean-input"
              />
              <label className="mt-2 block text-sm text-white/70">Std dev (variance)</label>
              <input
                type="number"
                value={teamA.stdDev ?? 15}
                onChange={(e) => setTeamA((p) => ({ ...p, stdDev: Number(e.target.value) || (p.stdDev ?? 15) }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-a-stddev-input"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Team B selector</label>
              <Select value={selectedPresetB} onValueChange={(value) => applyPreset('B', value)}>
                <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30 text-white" data-testid="matchup-team-b-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sportPresets.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-sm text-white/70">Team B name</label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-b-name-input"
              />
              <label className="mt-2 block text-sm text-white/70">Projected points (mean)</label>
              <input
                type="number"
                value={teamB.mean}
                onChange={(e) => setTeamB((p) => ({ ...p, mean: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-b-mean-input"
              />
              <label className="mt-2 block text-sm text-white/70">Std dev (variance)</label>
              <input
                type="number"
                value={teamB.stdDev ?? 15}
                onChange={(e) => setTeamB((p) => ({ ...p, stdDev: Number(e.target.value) || (p.stdDev ?? 15) }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
                data-testid="matchup-team-b-stddev-input"
              />
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/65" data-testid="matchup-current-detection">
            Current matchup detection: {teamAName} vs {teamBName}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runSimulation}
              disabled={loading}
              className="gap-2"
              data-audit="simulate-button-works"
              data-testid="matchup-compare-button"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Compare teams
            </Button>
            <Button
              variant="outline"
              onClick={runSimulation}
              disabled={loading}
              className="gap-2 border-white/20"
              data-audit="rerun-simulation-works"
              data-testid="matchup-rerun-button"
            >
              <RefreshCw className="h-4 w-4" />
              Rerun simulation
            </Button>
            <Button
              variant="outline"
              onClick={resetSimulator}
              className="border-white/20"
              data-testid="matchup-reset-button"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              onClick={clearSimulation}
              className="border-white/20"
              data-testid="matchup-clear-button"
            >
              Clear
            </Button>
          </div>
          {!result && !loading && !error && (
            <p className="text-sm text-white/55">{MATCHUP_SIMULATOR_MESSAGES.empty}</p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Win probability</CardTitle>
            </CardHeader>
            <CardContent>
              <WinProbabilityMeter
                winProbabilityA={result.winProbabilityA}
                winProbabilityB={result.winProbabilityB}
                teamAName={teamAName}
                teamBName={teamBName}
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Simulation output</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="matchup-chart-toggle-distribution"
                  onClick={() => setChartMode('distribution')}
                  className={`rounded px-3 py-1 text-xs ${
                    chartMode === 'distribution'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Distribution chart
                </button>
                <button
                  type="button"
                  data-testid="matchup-chart-toggle-scorerange"
                  onClick={() => setChartMode('scoreRanges')}
                  className={`rounded px-3 py-1 text-xs ${
                    chartMode === 'scoreRanges'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Score ranges
                </button>
              </div>
              {chartMode === 'distribution' ? (
                <SimulationChart
                  expectedScoreA={result.projectedScoreA}
                  expectedScoreB={result.projectedScoreB}
                  scoreDistributionA={result.scoreDistributionA}
                  scoreDistributionB={result.scoreDistributionB}
                  teamAName={teamAName}
                  teamBName={teamBName}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="matchup-score-range-display">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80">
                    <p className="text-xs text-white/60">{teamAName} likely range</p>
                    <p className="text-lg font-semibold text-cyan-300">
                      {formatScoreRangeLabel(result.scoreRangeA)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80">
                    <p className="text-xs text-white/60">{teamBName} likely range</p>
                    <p className="text-lg font-semibold text-amber-300">
                      {formatScoreRangeLabel(result.scoreRangeB)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {comparisonSummary && (
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-lg text-white">Strengths and weaknesses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-emerald-300">{comparisonSummary.strengthSummary}</p>
                <p className="text-sm text-amber-300">{comparisonSummary.weaknessSummary}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ul className="space-y-1 text-xs text-emerald-100/90">
                    {comparisonSummary.strengthBullets.map((bullet) => (
                      <li key={bullet}>- {bullet}</li>
                    ))}
                  </ul>
                  <ul className="space-y-1 text-xs text-amber-100/90">
                    {comparisonSummary.weaknessBullets.map((bullet) => (
                      <li key={bullet}>- {bullet}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <UpsideDownsideCards
            upsideScenario={result.upsideScenario ?? null}
            downsideScenario={result.downsideScenario ?? null}
            teamAName={teamAName}
            teamBName={teamBName}
          />

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white">Position-by-position comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="matchup-position-tab-all"
                  onClick={() => setPositionTab('all')}
                  className={`rounded px-3 py-1 text-xs ${
                    positionTab === 'all'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                >
                  All positions
                </button>
                <button
                  type="button"
                  data-testid="matchup-position-tab-edges"
                  onClick={() => setPositionTab('edges')}
                  className={`rounded px-3 py-1 text-xs ${
                    positionTab === 'edges'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'border border-white/20 text-white/70 hover:bg-white/10'
                  }`}
                >
                  Advantage only
                </button>
              </div>
              {visiblePositionRows.length > 0 ? (
                <div className="space-y-2" data-testid="matchup-position-comparison-list">
                  {visiblePositionRows.map((row) => (
                    <div
                      key={row.slotId}
                      className="grid grid-cols-[56px_1fr_1fr_88px] items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs"
                    >
                      <span className="text-white/60">{row.slotLabel}</span>
                      <span className="text-cyan-200">{teamAName}: {row.teamAScore.toFixed(1)}</span>
                      <span className="text-amber-200">{teamBName}: {row.teamBScore.toFixed(1)}</span>
                      <span
                        className={
                          row.advantage === 'even'
                            ? 'text-white/50'
                            : row.advantage === 'A'
                              ? 'text-cyan-300'
                              : 'text-amber-300'
                        }
                      >
                        {row.edgeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/55">No clear position edge at current projection spread.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-4 space-y-3">
              <a
                href={chimmyUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="matchup-ai-explanation-button"
                className="text-sm text-cyan-400 hover:underline"
              >
                Ask Chimmy to explain this matchup →
              </a>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  data-testid="matchup-share-button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-500/30"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share matchup
                </button>
                <button
                  type="button"
                  onClick={shareMatchupResult}
                  data-testid="matchup-copy-caption-button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
                >
                  {shareCopied ? <Check className="h-3.5 w-3.5" /> : null}
                  {shareCopied ? 'Copied to clipboard' : 'Copy caption'}
                </button>
              </div>
              {result.iterations > 0 && (
                <p className="text-xs text-white/40">{result.iterations.toLocaleString()} simulations</p>
              )}
            </CardContent>
          </Card>
          {shareModalOpen && result && (
            <MatchupShareModal
              team1Name={teamAName}
              team2Name={teamBName}
              projectedScore1={result.projectedScoreA}
              projectedScore2={result.projectedScoreB}
              winProbabilityA={result.winProbabilityA}
              winProbabilityB={result.winProbabilityB}
              sport={sport}
              onClose={() => setShareModalOpen(false)}
            />
          )}
        </>
      )}
    </main>
  );
}
