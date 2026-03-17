/**
 * Player Comparison Lab — types (Prompt 117 + Prompt 130).
 */

export interface HistoricalSeasonRow {
  season: string;
  gamesPlayed: number | null;
  fantasyPoints: number | null;
  fantasyPointsPerGame: number | null;
  passingYards?: number | null;
  rushingYards?: number | null;
  receivingYards?: number | null;
  receptions?: number | null;
}

export interface ProjectionRow {
  value: number;
  rank: number;
  positionRank: number;
  trend30Day: number;
  redraftValue: number | null;
  source: string;
  position?: string | null;
  team?: string | null;
  /** Volatility (e.g. moving std dev); lower = more stable (Prompt 130). */
  volatility?: number | null;
}

export interface ResolvedPlayerStats {
  name: string;
  position: string | null;
  team: string | null;
  historical: HistoricalSeasonRow[];
  projection: ProjectionRow | null;
}

export type ChartMode = 'historical' | 'projections' | 'both';

export interface ComparisonChartSeries {
  label: string;
  playerA: number | null;
  playerB: number | null;
  unit?: string;
}

export interface PlayerComparisonResult {
  playerA: ResolvedPlayerStats;
  playerB: ResolvedPlayerStats;
  chartSeries: ComparisonChartSeries[];
  summaryLines: string[];
}

// ——— Prompt 130: Multi-player comparison lab ———

export type ScoringFormat = 'ppr' | 'half_ppr' | 'non_ppr';

export type ComparisonDimensionId =
  | 'market_value'
  | 'fantasy_production'
  | 'projection'
  | 'volatility'
  | 'consistency'
  | 'schedule_difficulty'
  | 'injury_risk'
  | 'trend_momentum';

export interface ComparisonMatrixRow {
  dimensionId: ComparisonDimensionId;
  label: string;
  /** Keyed by player name; value is numeric for this dimension (higher = better unless inverted). */
  valuesByPlayer: Record<string, number | null>;
  /** Player name that wins this category (best value); null if tie or no data. */
  winnerName: string | null;
  /** When higher is worse (e.g. volatility, injury_risk), winner is the one with lower value. */
  higherIsBetter: boolean;
}

export interface CategoryWinnerHighlight {
  dimensionId: ComparisonDimensionId;
  label: string;
  winnerName: string;
  value: number | null;
}

/** Per-player deterministic scores for display. */
export interface PlayerComparisonScores {
  playerName: string;
  /** Value Over Replacement proxy: value delta vs baseline (e.g. position replacement). */
  vorpDifference: number | null;
  /** Projected fantasy points or value delta. */
  projectionDelta: number | null;
  /** 0–100 or similar; higher = more consistent. */
  consistencyScore: number | null;
  /** Lower = less volatile (prefer for safety). */
  volatilityScore: number | null;
}

export interface MultiPlayerComparisonResult {
  sport: string;
  scoringFormat: ScoringFormat;
  players: ResolvedPlayerStats[];
  /** Rows = dimensions, columns = players. */
  matrix: ComparisonMatrixRow[];
  categoryWinners: CategoryWinnerHighlight[];
  playerScores: PlayerComparisonScores[];
  summaryLines: string[];
  /** For charts: same shape as before but with N players. */
  chartSeries?: ComparisonChartSeries[];
}
