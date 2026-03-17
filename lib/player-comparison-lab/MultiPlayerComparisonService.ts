/**
 * Multi-player comparison (2–6 players): matrix, category winners, VORP, consistency, volatility (Prompt 130).
 */

import { resolvePlayerStats } from './PlayerStatsResolver';
import type {
  ResolvedPlayerStats,
  MultiPlayerComparisonResult,
  ComparisonMatrixRow,
  CategoryWinnerHighlight,
  PlayerComparisonScores,
  ComparisonDimensionId,
  ScoringFormat,
} from './types';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

export interface ComparePlayersMultiOptions {
  sport?: string | null;
  scoringFormat?: ScoringFormat;
}

export async function comparePlayersMulti(
  playerNames: string[],
  options?: ComparePlayersMultiOptions
): Promise<MultiPlayerComparisonResult | null> {
  const trimmed = playerNames.map((n) => n.trim()).filter(Boolean);
  if (trimmed.length < MIN_PLAYERS || trimmed.length > MAX_PLAYERS) return null;

  const sport = options?.sport ? normalizeToSupportedSport(options.sport) : 'NFL';
  const scoringFormat = options?.scoringFormat ?? 'ppr';

  const resolved = await Promise.all(
    trimmed.map((name) => resolvePlayerStats(name, { sport, scoringFormat }))
  );

  const players: ResolvedPlayerStats[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    if (resolved[i]) players.push(resolved[i]!);
  }
  if (players.length < MIN_PLAYERS) return null;

  const matrix = buildMatrix(players);
  const categoryWinners = buildCategoryWinners(matrix);
  const playerScores = buildPlayerScores(players);
  const summaryLines = buildSummaryLines(players, matrix);

  return {
    sport,
    scoringFormat,
    players,
    matrix,
    categoryWinners,
    playerScores,
    summaryLines,
  };
}

function buildMatrix(players: ResolvedPlayerStats[]): ComparisonMatrixRow[] {
  const rows: ComparisonMatrixRow[] = [];
  const names = players.map((p) => p.name);

  // Market value (dynasty value)
  const marketValues: Record<string, number | null> = {};
  players.forEach((p) => {
    marketValues[p.name] = p.projection?.value ?? null;
  });
  rows.push(buildRow('market_value', 'Market value', marketValues, true));

  // Fantasy production (last season FP/game or avg)
  const production: Record<string, number | null> = {};
  players.forEach((p) => {
    const last = p.historical[0];
    const fp = last?.fantasyPointsPerGame ?? (last?.fantasyPoints && last?.gamesPlayed ? last.fantasyPoints / last.gamesPlayed : null);
    production[p.name] = fp != null ? Math.round(fp * 10) / 10 : null;
  });
  rows.push(buildRow('fantasy_production', 'Fantasy production', production, true));

  // Projection (same as value for now, or redraft)
  const projection: Record<string, number | null> = {};
  players.forEach((p) => {
    projection[p.name] = p.projection?.redraftValue ?? p.projection?.value ?? null;
  });
  rows.push(buildRow('projection', 'Projection', projection, true));

  // Volatility (lower = better)
  const volatility: Record<string, number | null> = {};
  players.forEach((p) => {
    volatility[p.name] = p.projection?.volatility ?? null;
  });
  rows.push(buildRow('volatility', 'Volatility', volatility, false));

  // Consistency (higher = better; from historical variance inverse)
  const consistency: Record<string, number | null> = {};
  players.forEach((p) => {
    consistency[p.name] = computeConsistencyScore(p);
  });
  rows.push(buildRow('consistency', 'Consistency', consistency, true));

  // Schedule difficulty (stub: null for all; higher = harder schedule)
  const schedule: Record<string, number | null> = {};
  names.forEach((n) => (schedule[n] = null));
  rows.push(buildRow('schedule_difficulty', 'Schedule difficulty', schedule, false));

  // Injury risk (stub: null)
  const injury: Record<string, number | null> = {};
  names.forEach((n) => (injury[n] = null));
  rows.push(buildRow('injury_risk', 'Injury risk', injury, false));

  // Trend momentum (30-day trend)
  const trend: Record<string, number | null> = {};
  players.forEach((p) => {
    trend[p.name] = p.projection?.trend30Day ?? null;
  });
  rows.push(buildRow('trend_momentum', 'Trend momentum', trend, true));

  return rows;
}

function buildRow(
  dimensionId: ComparisonDimensionId,
  label: string,
  valuesByPlayer: Record<string, number | null>,
  higherIsBetter: boolean
): ComparisonMatrixRow {
  const entries = Object.entries(valuesByPlayer).filter(
    ([, v]) => v != null && Number.isFinite(v)
  ) as [string, number][];
  let winnerName: string | null = null;
  if (entries.length > 0) {
    const sorted = [...entries].sort((a, b) => (higherIsBetter ? b[1] - a[1] : a[1] - b[1]));
    winnerName = sorted[0][0];
  }
  return {
    dimensionId,
    label,
    valuesByPlayer,
    winnerName,
    higherIsBetter,
  };
}

function computeConsistencyScore(p: ResolvedPlayerStats): number | null {
  const fps = p.historical
    .map((h) => h.fantasyPointsPerGame ?? (h.gamesPlayed && h.fantasyPoints ? h.fantasyPoints / h.gamesPlayed : null))
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (fps.length < 2) return null;
  const mean = fps.reduce((s, v) => s + v, 0) / fps.length;
  const variance = fps.reduce((s, v) => s + (v - mean) ** 2, 0) / fps.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 100;
  // Lower std = higher consistency; scale to 0–100 (inverse of coefficient of variation)
  const cv = mean !== 0 ? std / Math.abs(mean) : 1;
  return Math.round(Math.min(100, Math.max(0, 100 - cv * 100)));
}

function buildCategoryWinners(matrix: ComparisonMatrixRow[]): CategoryWinnerHighlight[] {
  return matrix
    .filter((r) => r.winnerName != null)
    .map((r) => ({
      dimensionId: r.dimensionId,
      label: r.label,
      winnerName: r.winnerName!,
      value: r.valuesByPlayer[r.winnerName!] ?? null,
    }));
}

function buildPlayerScores(players: ResolvedPlayerStats[]): PlayerComparisonScores[] {
  const values = players.map((p) => p.projection?.value ?? 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  return players.map((p) => {
    const value = p.projection?.value ?? null;
    const vorpDifference = value != null ? value - minVal : null;
    const projectionDelta = p.projection?.redraftValue ?? p.projection?.value ?? null;
    const consistencyScore = computeConsistencyScore(p);
    const volatilityScore = p.projection?.volatility ?? null;
    return {
      playerName: p.name,
      vorpDifference,
      projectionDelta,
      consistencyScore,
      volatilityScore,
    };
  });
}

function buildSummaryLines(players: ResolvedPlayerStats[], matrix: ComparisonMatrixRow[]): string[] {
  const lines: string[] = [];
  const winners = matrix.filter((r) => r.winnerName);
  winners.forEach((r) => {
    const v = r.valuesByPlayer[r.winnerName!];
    const valStr = v != null ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : '—';
    lines.push(`${r.label}: ${r.winnerName} (${valStr}).`);
  });
  if (lines.length === 0) {
    lines.push('Add projection or historical data to see comparison summary.');
  }
  return lines;
}
