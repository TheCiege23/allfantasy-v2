/**
 * Builds coach evaluation: roster strengths/weaknesses, waiver opportunities,
 * trade targets, lineup improvements, and provider overlays.
 */

import type { CoachContext, CoachEvaluationResult } from './types';
import { buildDeterministicCoachEvaluation } from './DeterministicCoachModeEngine';

export async function getCoachEvaluation(
  context: CoachContext = {}
): Promise<CoachEvaluationResult> {
  const base = await buildDeterministicCoachEvaluation(context);
  const { enrichCoachEvaluationWithAI } = await import('./CoachEvaluationAI');
  return enrichCoachEvaluationWithAI(base);
}
