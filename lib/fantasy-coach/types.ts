/**
 * Fantasy Coach Mode — types (Prompt 120 + Prompt 134).
 */

export type AdviceType = 'lineup' | 'trade' | 'waiver';

export interface CoachContext {
  leagueId?: string;
  leagueName?: string;
  week?: number;
  teamName?: string;
  sport?: string;
  [key: string]: unknown;
}

export interface StrategyRecommendation {
  type: AdviceType;
  summary: string;
  bullets: string[];
  actions: string[];
  contextSummary: string;
}

export interface CoachAdviceResult {
  type: AdviceType;
  summary: string;
  bullets: string[];
  challenge: string;
  tone: 'motivational' | 'cautious' | 'celebration' | 'neutral';
}

// ——— Prompt 134: Coach Dashboard evaluation ———

export interface WaiverOpportunity {
  playerName: string;
  position?: string;
  reason: string;
  /** Opens player page (e.g. /af-legacy?tab=players&q=...) */
  playerHref: string;
}

export interface TradeSuggestion {
  summary: string;
  /** Opens trade analyzer (e.g. /af-legacy?tab=trade) */
  tradeAnalyzerHref: string;
  targetHint?: string;
}

export interface ActionRecommendation {
  id: string;
  type: 'lineup' | 'trade' | 'waiver' | 'tool';
  label: string;
  summary: string;
  /** Opens the relevant tool (waiver, trade, rankings, etc.) */
  toolHref: string;
}

export interface CoachEvaluationResult {
  sport: string;
  rosterStrengths: string[];
  rosterWeaknesses: string[];
  waiverOpportunities: WaiverOpportunity[];
  tradeSuggestions: TradeSuggestion[];
  lineupImprovements: string[];
  actionRecommendations: ActionRecommendation[];
  rosterMathSummary: string | null;
  strategyInsight: string | null;
  weeklyAdvice: string | null;
}
