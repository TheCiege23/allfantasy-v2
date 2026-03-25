/**
 * Produces structured strategy recommendations for lineup, trade, and waiver (Prompt 120).
 */

import type { AdviceType, CoachContext, StrategyRecommendation } from './types';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

export async function getStrategyRecommendation(
  type: AdviceType,
  context: CoachContext
): Promise<StrategyRecommendation> {
  const contextSummary = buildContextSummary(context);

  switch (type) {
    case 'lineup':
      return getLineupRecommendation(contextSummary, context);
    case 'trade':
      return getTradeRecommendation(contextSummary, context);
    case 'waiver':
      return getWaiverRecommendation(contextSummary, context);
    default:
      return getGenericRecommendation(type, contextSummary);
  }
}

function buildContextSummary(ctx: CoachContext): string {
  const parts: string[] = [];
  if (ctx.leagueName) parts.push(`League: ${ctx.leagueName}`);
  if (ctx.sport) parts.push(`Sport: ${normalizeToSupportedSport(String(ctx.sport))}`);
  if (ctx.week != null) parts.push(`Week ${ctx.week}`);
  if (ctx.teamName) parts.push(`Team: ${ctx.teamName}`);
  if (ctx.leagueId) parts.push(`(ID: ${ctx.leagueId})`);
  return parts.length > 0 ? parts.join('. ') : 'No league context.';
}

function getLineupRecommendation(contextSummary: string, _ctx: CoachContext): StrategyRecommendation {
  return {
    type: 'lineup',
    summary: 'Start your highest-projected players at each position, then optimize for matchups and injury news.',
    bullets: [
      'Set your lineup based on projected points and matchup strength.',
      'Check injury reports and game-time decisions before lock.',
      'In flex, prefer the player with the higher floor unless you need a ceiling play.',
    ],
    actions: [
      'Review Thursday/Saturday games first and lock those spots.',
      'Use rankings or projections to compare same-position options.',
      'Consider game script (trailing teams throw more; leading teams run more).',
    ],
    contextSummary,
  };
}

function getTradeRecommendation(contextSummary: string, _ctx: CoachContext): StrategyRecommendation {
  return {
    type: 'trade',
    summary: 'Identify needs and surplus by position, then target fair-value deals that improve your starting lineup or future capital.',
    bullets: [
      'Sell high on players with unsustainable usage or touchdown rate.',
      'Buy low on proven producers in slumps or coming off injury.',
      'Match with teams that have opposite needs (your strength for theirs).',
    ],
    actions: [
      'List your weakest starter and your best bench piece; look for upgrades.',
      'Use trade calculators to avoid overpaying or underselling.',
      'In dynasty, consider age and contract when valuing picks vs players.',
    ],
    contextSummary,
  };
}

function getWaiverRecommendation(contextSummary: string, _ctx: CoachContext): StrategyRecommendation {
  return {
    type: 'waiver',
    summary: 'Prioritize immediate starters and handcuffs; then add upside stashes that fit your team timeline.',
    bullets: [
      'Spend FAAB or priority on players who can start for you within 1–2 weeks.',
      'Add handcuffs for your own RBs and high-upside backups elsewhere.',
      'Avoid chasing one-week spikes unless the role is clearly growing.',
    ],
    actions: [
      'Tier the wire: must-add, nice-to-add, watch list.',
      'Plan drops before placing claims (worst bench piece or redundant depth).',
      'In FAAB, save some budget for late-season emergencies unless you are all-in.',
    ],
    contextSummary,
  };
}

function getGenericRecommendation(type: AdviceType, contextSummary: string): StrategyRecommendation {
  return {
    type,
    summary: 'Apply data-driven decisions: projections, matchups, and roster needs.',
    bullets: ['Review the latest rankings and injury news.', 'Align moves with your team\'s win-now vs rebuild timeline.'],
    actions: ['Check your league\'s scoring and roster settings.', 'Compare your options side by side before committing.'],
    contextSummary,
  };
}
