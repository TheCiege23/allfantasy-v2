import { NextRequest, NextResponse } from 'next/server';
import { runMatchupSimulation } from '@/lib/simulation-engine/MatchupSimulator';
import { getMatchupSimulationInsight } from '@/lib/simulation-engine/MatchupSimulationInsightAI';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: {
    teamA?: { mean: number; stdDev?: number }
    teamB?: { mean: number; stdDev?: number }
    teamAName?: string
    teamBName?: string
    sport?: string
    iterations?: number
  } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {}

  const meanA = Number(body.teamA?.mean ?? 0);
  const meanB = Number(body.teamB?.mean ?? 0);
  if (!Number.isFinite(meanA) || !Number.isFinite(meanB)) {
    return NextResponse.json(
      { error: 'teamA.mean and teamB.mean are required' },
      { status: 400 }
    );
  }

  const sport = body.sport ? normalizeToSupportedSport(body.sport) : 'NFL';
  const teamAName = String(body.teamAName ?? 'Team A').trim();
  const teamBName = String(body.teamBName ?? 'Team B').trim();

  try {
    const out = await runMatchupSimulation({
      sport,
      weekOrPeriod: 1,
      teamA: { mean: meanA, stdDev: body.teamA?.stdDev },
      teamB: { mean: meanB, stdDev: body.teamB?.stdDev },
      iterations: body.iterations,
    });
    const insight = await getMatchupSimulationInsight(out, teamAName, teamBName);
    return NextResponse.json({
      simulation: {
        winProbabilityA: out.winProbabilityA,
        winProbabilityB: out.winProbabilityB,
        expectedScoreA: out.expectedScoreA,
        expectedScoreB: out.expectedScoreB,
        upsideScenario: out.upsideScenario,
        downsideScenario: out.downsideScenario,
        iterations: out.iterations,
      },
      insight,
    });
  } catch (e) {
    console.error('[simulation/matchup/insight]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Insight failed' },
      { status: 500 }
    );
  }
}
