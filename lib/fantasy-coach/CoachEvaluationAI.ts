/**
 * AI layer for coach evaluation (Prompt 134): DeepSeek (roster math), OpenAI (strategy + coach recommendations).
 */

import { deepseekChat } from '@/lib/deepseek-client';
import OpenAI from 'openai';
import type { CoachEvaluationResult } from './types';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

function buildEvalContext(evalResult: CoachEvaluationResult): string {
  const parts = [
    `Sport: ${evalResult.sport}.`,
    `Strengths: ${evalResult.rosterStrengths.join('; ') || 'None'}.`,
    `Weaknesses: ${evalResult.rosterWeaknesses.join('; ') || 'None'}.`,
    `Waiver opportunities: ${evalResult.waiverOpportunities.length}.`,
    `Trade suggestions: ${evalResult.tradeSuggestions.length}.`,
    `Lineup improvements: ${evalResult.lineupImprovements.join('; ') || 'None'}.`,
  ];
  return parts.join(' ');
}

/** DeepSeek: roster math evaluation. */
export async function evaluateRosterMath(evalResult: CoachEvaluationResult): Promise<string | null> {
  const context = buildEvalContext(evalResult);
  const result = await deepseekChat({
    systemPrompt: 'You are a fantasy sports analyst. In one short paragraph, interpret the roster evaluation in terms of numbers: position strength, depth, value distribution. Be concise.',
    prompt: context,
    temperature: 0.2,
    maxTokens: 200,
  });
  if (result.error || !result.content?.trim()) return null;
  return result.content.trim();
}

/** OpenAI: strategy insight (Grok role). */
export async function buildStrategyInsight(evalResult: CoachEvaluationResult): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildEvalContext(evalResult);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a fantasy coach. In 1-2 sentences, give one strategic insight (e.g. sell high, buy low, prioritize waivers). No bullets.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 120,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('[CoachEvaluationAI] strategy', e);
    return null;
  }
}

/** OpenAI: coach-style weekly advice. */
export async function buildWeeklyAdvice(evalResult: CoachEvaluationResult): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildEvalContext(evalResult);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are the AllFantasy AI Coach. Give one short, actionable piece of weekly advice (1-2 sentences). Motivational but specific.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 100,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('[CoachEvaluationAI] weekly', e);
    return null;
  }
}

export async function enrichCoachEvaluationWithAI(
  evalResult: CoachEvaluationResult
): Promise<CoachEvaluationResult> {
  const [rosterMathSummary, strategyInsight, weeklyAdvice] = await Promise.all([
    evaluateRosterMath(evalResult),
    buildStrategyInsight(evalResult),
    buildWeeklyAdvice(evalResult),
  ]);
  return {
    ...evalResult,
    rosterMathSummary: rosterMathSummary ?? null,
    strategyInsight: strategyInsight ?? null,
    weeklyAdvice: weeklyAdvice ?? null,
  };
}
