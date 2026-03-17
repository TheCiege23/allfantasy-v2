'use client';

import { useCallback, useState } from 'react';
import { Play, RefreshCw, Loader2 } from 'lucide-react';
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
import { getMatchupAIChatUrl, buildMatchupSummaryForAI } from '@/lib/matchup-simulator';
import { WinProbabilityMeter } from './WinProbabilityMeter';
import { SimulationChart } from './SimulationChart';
import { UpsideDownsideCards } from './UpsideDownsideCards';

export type MatchupResult = {
  winProbabilityA: number;
  winProbabilityB: number;
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
  /** Initial lineup (projections). When these change, simulation re-runs. */
  initialTeamA?: { mean: number; stdDev?: number };
  initialTeamB?: { mean: number; stdDev?: number };
}

export function MatchupSimulationPage({
  teamAName: initialTeamAName = 'Team A',
  teamBName: initialTeamBName = 'Team B',
  initialTeamA,
  initialTeamB,
}: MatchupSimulationPageProps) {
  const [sport, setSport] = useState(SUPPORTED_SPORTS[0]);
  const [teamAName, setTeamAName] = useState(initialTeamAName);
  const [teamBName, setTeamBName] = useState(initialTeamBName);
  const [teamA, setTeamA] = useState({ mean: initialTeamA?.mean ?? 100, stdDev: initialTeamA?.stdDev ?? 15 });
  const [teamB, setTeamB] = useState({ mean: initialTeamB?.mean ?? 95, stdDev: initialTeamB?.stdDev ?? 15 });
  const [result, setResult] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch('/api/simulation/matchup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sport,
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
  }, [sport, teamA.mean, teamA.stdDev, teamB.mean, teamB.stdDev]);

  // Lineup change updates simulation when user clicks Simulate or Rerun (same handler).

  const chimmyUrl = result
    ? getMatchupAIChatUrl(
        buildMatchupSummaryForAI({
          teamAName,
          teamBName,
          projectedScoreA: result.projectedScoreA,
          projectedScoreB: result.projectedScoreB,
          winProbA: result.winProbabilityA * 100,
          winProbB: result.winProbabilityB * 100,
          upsetChance: result.upsetChance,
          volatilityTag: result.volatilityTag,
          sport,
        })
      )
    : getMatchupAIChatUrl();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Matchup simulation</h1>
        <p className="text-sm text-white/60 mt-1">
          Deterministic 1,000+ sims with projections and variance. Win probability, expected score, upside and downside scenarios.
        </p>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-lg text-white">Lineup (projections)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Sport</label>
            <Select value={sport} onValueChange={(v) => setSport(v as typeof sport)}>
              <SelectTrigger className="mt-1 w-full border-white/10 bg-black/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_SPORTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/70">Team A name</label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
              <label className="mt-2 block text-sm text-white/70">Projected points (mean)</label>
              <input
                type="number"
                value={teamA.mean}
                onChange={(e) => setTeamA((p) => ({ ...p, mean: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
              <label className="mt-2 block text-sm text-white/70">Std dev (variance)</label>
              <input
                type="number"
                value={teamA.stdDev ?? 15}
                onChange={(e) => setTeamA((p) => ({ ...p, stdDev: Number(e.target.value) || (p.stdDev ?? 15) }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Team B name</label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
              <label className="mt-2 block text-sm text-white/70">Projected points (mean)</label>
              <input
                type="number"
                value={teamB.mean}
                onChange={(e) => setTeamB((p) => ({ ...p, mean: Number(e.target.value) || 0 }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
              <label className="mt-2 block text-sm text-white/70">Std dev (variance)</label>
              <input
                type="number"
                value={teamB.stdDev ?? 15}
                onChange={(e) => setTeamB((p) => ({ ...p, stdDev: Number(e.target.value) || (p.stdDev ?? 15) }))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runSimulation}
              disabled={loading}
              className="gap-2"
              data-audit="simulate-button-works"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Simulate
            </Button>
            <Button
              variant="outline"
              onClick={runSimulation}
              disabled={loading}
              className="gap-2 border-white/20"
              data-audit="rerun-simulation-works"
            >
              <RefreshCw className="h-4 w-4" />
              Rerun simulation
            </Button>
          </div>
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

          <SimulationChart
            expectedScoreA={result.projectedScoreA}
            expectedScoreB={result.projectedScoreB}
            scoreDistributionA={result.scoreDistributionA}
            scoreDistributionB={result.scoreDistributionB}
            teamAName={teamAName}
            teamBName={teamBName}
          />

          <UpsideDownsideCards
            upsideScenario={result.upsideScenario ?? null}
            downsideScenario={result.downsideScenario ?? null}
            teamAName={teamAName}
            teamBName={teamBName}
          />

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-4">
              <a
                href={chimmyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:underline"
              >
                Ask Chimmy to explain this matchup →
              </a>
              {result.iterations > 0 && (
                <p className="mt-2 text-xs text-white/40">{result.iterations.toLocaleString()} simulations</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
