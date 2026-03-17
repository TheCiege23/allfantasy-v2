/**
 * Compares two players: builds chart series and summary (Prompt 117).
 */

import { resolvePlayerStats } from './PlayerStatsResolver';
import type { PlayerComparisonResult, ComparisonChartSeries, ResolvedPlayerStats } from './types';

export async function comparePlayers(
  playerAName: string,
  playerBName: string
): Promise<PlayerComparisonResult | null> {
  const [a, b] = await Promise.all([
    resolvePlayerStats(playerAName),
    resolvePlayerStats(playerBName),
  ]);

  if (!a || !b) return null;

  const chartSeries = buildChartSeries(a, b);
  const summaryLines = buildSummaryLines(a, b);

  return {
    playerA: a,
    playerB: b,
    chartSeries,
    summaryLines,
  };
}

function buildChartSeries(a: ResolvedPlayerStats, b: ResolvedPlayerStats): ComparisonChartSeries[] {
  const series: ComparisonChartSeries[] = [];

  // Projection metrics (always useful for comparison)
  if (a.projection || b.projection) {
    series.push({
      label: 'Dynasty value',
      playerA: a.projection?.value ?? null,
      playerB: b.projection?.value ?? null,
      unit: '',
    });
    series.push({
      label: 'Overall rank',
      playerA: a.projection?.rank ?? null,
      playerB: b.projection?.rank ?? null,
      unit: '',
    });
    series.push({
      label: '30-day trend',
      playerA: a.projection?.trend30Day ?? null,
      playerB: b.projection?.trend30Day ?? null,
      unit: '',
    });
  }

  // Historical: last season FP/game
  const aLast = a.historical[0];
  const bLast = b.historical[0];
  if (aLast?.fantasyPointsPerGame != null || bLast?.fantasyPointsPerGame != null) {
    series.push({
      label: `FP/Game (${aLast?.season ?? bLast?.season ?? 'last'})`,
      playerA: aLast?.fantasyPointsPerGame ?? null,
      playerB: bLast?.fantasyPointsPerGame ?? null,
      unit: '',
    });
  }

  // Historical: last season total FP
  if (aLast?.fantasyPoints != null || bLast?.fantasyPoints != null) {
    series.push({
      label: `Total FP (${aLast?.season ?? bLast?.season ?? 'last'})`,
      playerA: aLast?.fantasyPoints ?? null,
      playerB: bLast?.fantasyPoints ?? null,
      unit: '',
    });
  }

  // Average FP/Game over available historical seasons
  const aAvg = averageFPPerGame(a.historical);
  const bAvg = averageFPPerGame(b.historical);
  if (aAvg != null || bAvg != null) {
    series.push({
      label: 'Avg FP/Game (historical)',
      playerA: aAvg,
      playerB: bAvg,
      unit: '',
    });
  }

  return series;
}

function averageFPPerGame(
  seasons: { fantasyPointsPerGame: number | null; fantasyPoints: number | null; gamesPlayed: number | null }[]
): number | null {
  const values = seasons
    .map((s) => s.fantasyPointsPerGame ?? (s.gamesPlayed && s.fantasyPoints ? s.fantasyPoints / s.gamesPlayed : null))
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function buildSummaryLines(a: ResolvedPlayerStats, b: ResolvedPlayerStats): string[] {
  const lines: string[] = [];

  if (a.projection && b.projection) {
    const valueDiff = a.projection.value - b.projection.value;
    const rankDiff = b.projection.rank - a.projection.rank; // lower rank = better
    if (valueDiff !== 0) {
      lines.push(
        `${a.name} has ${valueDiff > 0 ? 'higher' : 'lower'} dynasty value by ${Math.abs(valueDiff).toFixed(0)} points (${a.projection.value} vs ${b.projection.value}).`
      );
    }
    if (rankDiff !== 0) {
      lines.push(
        `${rankDiff > 0 ? a.name : b.name} is ranked ${Math.abs(rankDiff)} spots ${rankDiff > 0 ? 'higher' : 'lower'} overall (#${rankDiff > 0 ? a.projection.rank : b.projection.rank} vs #${rankDiff > 0 ? b.projection.rank : a.projection.rank}).`
      );
    }
    const trendA = a.projection.trend30Day;
    const trendB = b.projection.trend30Day;
    if (trendA != null && trendB != null && trendA !== trendB) {
      const hotter = trendA > trendB ? a.name : b.name;
      lines.push(`${hotter} has stronger 30-day value trend (${trendA > trendB ? trendA : trendB} vs ${trendA > trendB ? trendB : trendA}).`);
    }
  }

  const aLast = a.historical[0];
  const bLast = b.historical[0];
  if (aLast?.fantasyPointsPerGame != null && bLast?.fantasyPointsPerGame != null) {
    const diff = aLast.fantasyPointsPerGame - bLast.fantasyPointsPerGame;
    if (diff !== 0) {
      lines.push(
        `Last season (${aLast.season}): ${diff > 0 ? a.name : b.name} had ${Math.abs(diff).toFixed(1)} more FP/Game (${aLast.fantasyPointsPerGame?.toFixed(1) ?? '-'} vs ${bLast.fantasyPointsPerGame?.toFixed(1) ?? '-'}).`
      );
    }
  }

  if (lines.length === 0) {
    lines.push('Add historical or projection data to see a comparison summary.');
  }

  return lines;
}
