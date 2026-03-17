/**
 * Builds coach evaluation: roster strengths/weaknesses, waiver opportunities, trade targets, lineup improvements (Prompt 134).
 */

import { getStrategyRecommendation } from './StrategyRecommendationEngine';
import type {
  CoachContext,
  CoachEvaluationResult,
  WaiverOpportunity,
  TradeSuggestion,
  ActionRecommendation,
} from './types';
import { getTradeAnalyzerHref, getWaiverToolHref, getRankingsToolHref, getPlayerPageHref } from './CoachToolResolver';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

export async function getCoachEvaluation(context: CoachContext = {}): Promise<CoachEvaluationResult> {
  const sport = context.sport ? normalizeToSupportedSport(context.sport) : 'NFL';
  const leagueId = context.leagueId as string | undefined;

  const [lineupRec, tradeRec, waiverRec] = await Promise.all([
    getStrategyRecommendation('lineup', context),
    getStrategyRecommendation('trade', context),
    getStrategyRecommendation('waiver', context),
  ]);

  const rosterStrengths = [
    'Starting lineup has solid projected floor from top options.',
    'Bench depth provides flexibility for bye weeks and injuries.',
  ];
  const rosterWeaknesses = [
    'One position group could use an upgrade for playoff push.',
    'Consider adding a handcuff or high-upside stash.',
  ];

  const waiverOpportunities: WaiverOpportunity[] = [
    {
      playerName: 'Waiver wire',
      reason: waiverRec.summary,
      playerHref: getWaiverToolHref(leagueId),
    },
    {
      playerName: 'Top available RB',
      position: 'RB',
      reason: 'Prioritize RB depth; use Waiver AI for your league list.',
      playerHref: getPlayerPageHref('Top available RB'),
    },
  ];

  const tradeSuggestions: TradeSuggestion[] = [
    {
      summary: tradeRec.summary,
      tradeAnalyzerHref: getTradeAnalyzerHref(leagueId),
      targetHint: 'Use Trade Analyzer to find fair deals.',
    },
  ];

  const lineupImprovements = lineupRec.bullets.slice(0, 3);

  const actionRecommendations: ActionRecommendation[] = [
    {
      id: 'waiver',
      type: 'waiver',
      label: 'Waiver AI',
      summary: waiverRec.summary,
      toolHref: getWaiverToolHref(leagueId),
    },
    {
      id: 'trade',
      type: 'trade',
      label: 'Trade Analyzer',
      summary: tradeRec.summary,
      toolHref: getTradeAnalyzerHref(leagueId),
    },
    {
      id: 'lineup',
      type: 'lineup',
      label: 'Rankings & lineups',
      summary: lineupRec.summary,
      toolHref: getRankingsToolHref(leagueId),
    },
  ];

  const base: CoachEvaluationResult = {
    sport,
    rosterStrengths,
    rosterWeaknesses,
    waiverOpportunities,
    tradeSuggestions,
    lineupImprovements,
    actionRecommendations,
    rosterMathSummary: null,
    strategyInsight: null,
    weeklyAdvice: null,
  };

  const { enrichCoachEvaluationWithAI } = await import('./CoachEvaluationAI');
  return enrichCoachEvaluationWithAI(base);
}
