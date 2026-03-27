/**
 * Ranks teams within a league for weekly power rankings (Prompt 119).
 * Prompt 132 upgrade: deterministic PowerScore uses weighted record/recent/roster/projection.
 */

import { computeLeagueRankingsV2 } from '@/lib/rankings-engine/league-rankings-v2';
import type { PowerRankingsOutput, PowerRankingTeam } from './types';

const POWER_SCORE_FORMULA = {
  recordWeight: 0.35,
  recentPerformanceWeight: 0.25,
  rosterStrengthWeight: 0.25,
  projectionStrengthWeight: 0.15,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function percentileRank(value: number, values: number[]): number {
  if (values.length < 2) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const allSame = sorted[0] === sorted[sorted.length - 1];
  if (allSame) return 0.5;
  let below = 0;
  let equal = 0;
  for (const candidate of sorted) {
    if (candidate < value) below += 1;
    else if (candidate === value) equal += 1;
  }
  return clamp((below + 0.5 * equal) / sorted.length, 0, 1);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function computePowerRankings(
  leagueId: string,
  week?: number
): Promise<PowerRankingsOutput | null> {
  const v2 = await computeLeagueRankingsV2(leagueId, week);
  if (!v2 || v2.teams.length === 0) return null;

  const weeklyByRoster = new Map<number, number[]>(
    (v2.weeklyPointsDistribution ?? []).map((row) => [row.rosterId, row.weeklyPoints ?? []]),
  );

  const recentAverages = v2.teams.map((team) => {
    const weekly = weeklyByRoster.get(team.rosterId) ?? [];
    const recentWeeks = weekly.slice(-4).filter((points) => Number.isFinite(points));
    return average(recentWeeks);
  });

  const withScores: Array<
    Omit<PowerRankingTeam, 'rank' | 'prevRank' | 'rankDelta'> & {
      previousRank: number | null;
      tieBreakerComposite: number;
      tieBreakerPointsFor: number;
    }
  > = v2.teams.map((team) => {
    const wins = toFiniteNumber(team.record?.wins, 0);
    const losses = toFiniteNumber(team.record?.losses, 0);
    const ties = toFiniteNumber(team.record?.ties, 0);
    const pointsFor = toFiniteNumber(team.pointsFor, 0);
    const pointsAgainst = toFiniteNumber(team.pointsAgainst, 0);
    const totalGames = Math.max(1, wins + losses + ties);
    const winPct = wins / totalGames;
    const pointsDiffPerGame = (pointsFor - pointsAgainst) / totalGames;
    const sos = clamp(toFiniteNumber((team as { strengthOfSchedule?: number }).strengthOfSchedule, 0.5), 0, 1);
    const sosMultiplier = 1 + (sos - 0.5) * 0.3;
    const recordRaw = clamp(winPct * 100 + clamp(pointsDiffPerGame / 3, -10, 10), 0, 100);
    const recordScore = clamp(recordRaw * sosMultiplier, 0, 100);

    const weekly = weeklyByRoster.get(team.rosterId) ?? [];
    const recentWeeks = weekly.slice(-4).filter((points) => Number.isFinite(points));
    const recentAverage = average(recentWeeks);
    const recentScore = percentileRank(recentAverage, recentAverages) * 100;

    const rosterStrengthScore = clamp(
      toFiniteNumber(team.powerScore, 50) * 0.65 + toFiniteNumber((team as { marketValueScore?: number }).marketValueScore, 50) * 0.35,
      0,
      100,
    );
    const expectedWins = toFiniteNumber((team as { expectedWins?: number }).expectedWins, wins);
    const projectionStrengthScore = clamp((expectedWins / totalGames) * 100, 0, 100);
    const weightedScore =
      POWER_SCORE_FORMULA.recordWeight * recordScore +
      POWER_SCORE_FORMULA.recentPerformanceWeight * recentScore +
      POWER_SCORE_FORMULA.rosterStrengthWeight * rosterStrengthScore +
      POWER_SCORE_FORMULA.projectionStrengthWeight * projectionStrengthScore;

    return {
      rosterId: team.rosterId,
      ownerId: team.ownerId,
      displayName: team.displayName ?? null,
      username: team.username ?? null,
      record: { wins, losses, ties },
      pointsFor,
      pointsAgainst,
      strengthOfSchedule: sos,
      recentPerformanceScore: Math.round(recentScore * 10) / 10,
      rosterStrengthScore: Math.round(rosterStrengthScore * 10) / 10,
      projectionStrengthScore: Math.round(projectionStrengthScore * 10) / 10,
      rosterValue: toFiniteNumber((team as { totalRosterValue?: number }).totalRosterValue, 0),
      expectedWins: Math.round(expectedWins * 100) / 100,
      composite: toFiniteNumber(team.composite, 0),
      powerScore: Math.round(weightedScore * 10) / 10,
      powerScoreBreakdown: {
        record: Math.round(recordScore * 10) / 10,
        recentPerformance: Math.round(recentScore * 10) / 10,
        rosterStrength: Math.round(rosterStrengthScore * 10) / 10,
        projectionStrength: Math.round(projectionStrengthScore * 10) / 10,
        weightedScore: Math.round(weightedScore * 10) / 10,
      },
      previousRank: team.prevRank ?? null,
      tieBreakerComposite: toFiniteNumber(team.composite, 0),
      tieBreakerPointsFor: pointsFor,
    };
  });

  withScores.sort((a, b) => {
    if (b.powerScore !== a.powerScore) return b.powerScore - a.powerScore;
    if (b.tieBreakerComposite !== a.tieBreakerComposite) return b.tieBreakerComposite - a.tieBreakerComposite;
    return b.tieBreakerPointsFor - a.tieBreakerPointsFor;
  });

  const teams: PowerRankingTeam[] = withScores.map((team, index) => {
    const rank = index + 1;
    return {
      rosterId: team.rosterId,
      ownerId: team.ownerId,
      displayName: team.displayName,
      username: team.username,
      rank,
      prevRank: team.previousRank,
      rankDelta: team.previousRank != null ? team.previousRank - rank : null,
      record: team.record,
      pointsFor: team.pointsFor,
      pointsAgainst: team.pointsAgainst,
      strengthOfSchedule: team.strengthOfSchedule,
      recentPerformanceScore: team.recentPerformanceScore,
      rosterStrengthScore: team.rosterStrengthScore,
      projectionStrengthScore: team.projectionStrengthScore,
      rosterValue: team.rosterValue,
      expectedWins: team.expectedWins,
      composite: team.composite,
      powerScore: team.powerScore,
      powerScoreBreakdown: team.powerScoreBreakdown,
    };
  });

  return {
    leagueId: v2.leagueId,
    leagueName: v2.leagueName,
    season: v2.season,
    week: v2.week,
    teams,
    computedAt: v2.computedAt,
    formula: POWER_SCORE_FORMULA,
  };
}
