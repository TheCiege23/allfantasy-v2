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

export interface DeterministicSourceFlags {
  fantasyCalc: boolean;
  sleeper: boolean;
  espnInjuryFeed: boolean;
  internalAdp: boolean;
  internalProjections: boolean;
  leagueScoringSettings: boolean;
}

export interface InjurySignal {
  status: string | null;
  source: 'espn' | 'none';
  riskScore: number | null;
  note: string | null;
}

export interface LeagueScoringSettings {
  ppr?: number | null;
  tePremium?: number | null;
  superflex?: boolean | null;
  passTdPoints?: number | null;
}

export interface ResolvedPlayerStats {
  name: string;
  position: string | null;
  team: string | null;
  historical: HistoricalSeasonRow[];
  projection: ProjectionRow | null;
  internalAdp: number | null;
  sleeperAdp: number | null;
  internalProjectionPoints: number | null;
  injury: InjurySignal;
  scheduleDifficultyScore: number | null;
  sourceFlags: DeterministicSourceFlags;
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

export interface DeterministicStatComparisonRow {
  metricId: string;
  label: string;
  playerAValue: number | null;
  playerBValue: number | null;
  higherIsBetter: boolean;
  winner: 'playerA' | 'playerB' | 'tie' | 'none';
  edgeScore: number | null;
}

export interface TwoPlayerComparisonDeterministicOutput {
  recommendedSide: 'playerA' | 'playerB' | 'tie';
  recommendedPlayerName: string | null;
  confidencePct: number;
  basedOn: Array<'stats_comparison'>;
  summary: string;
  statComparisons: DeterministicStatComparisonRow[];
}

export interface TwoPlayerComparisonExplanation {
  source: 'deterministic' | 'ai';
  text: string;
}

export interface TwoPlayerComparisonEngineResult {
  sport: string;
  comparison: PlayerComparisonResult;
  deterministic: TwoPlayerComparisonDeterministicOutput;
  explanation: TwoPlayerComparisonExplanation;
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
  leagueScoringSettings?: LeagueScoringSettings | null;
  players: ResolvedPlayerStats[];
  /** Rows = dimensions, columns = players. */
  matrix: ComparisonMatrixRow[];
  categoryWinners: CategoryWinnerHighlight[];
  playerScores: PlayerComparisonScores[];
  summaryLines: string[];
  sourceCoverage: DeterministicSourceFlags;
  /** For charts: same shape as before but with N players. */
  chartSeries?: ComparisonChartSeries[];
}

export interface ComparisonAIInsight {
  finalRecommendation: string;
  deepseekAnalysis: string | null;
  grokNarrative: string | null;
  openaiSummary: string | null;
  finalRecommendationSource?: 'deterministic' | 'ai';
  providerStatus: {
    deepseek: boolean;
    grok: boolean;
    openai: boolean;
  };
}
