/**
 * Fantasy Coach AI — turns strategy recommendations into natural-language advice (Prompt 120).
 */

import { openaiChatText } from '@/lib/openai-client';
import { getStrategyRecommendation } from './StrategyRecommendationEngine';
import type { AdviceType, CoachContext, CoachAdviceResult } from './types';

export async function getCoachAdvice(
  type: AdviceType,
  context: CoachContext = {}
): Promise<CoachAdviceResult> {
  const recommendation = await getStrategyRecommendation(type, context);

  const prompt = `You are the AllFantasy AI Coach. Give strategic advice in 2–4 short bullets and one direct challenge.

Advice type: ${type}
Context: ${recommendation.contextSummary}

Recommendation summary: ${recommendation.summary}
Key points: ${recommendation.bullets.join(' ')}
Suggested actions: ${recommendation.actions.join(' ')}

Respond with JSON only:
{
  "summary": "one sentence overall take",
  "bullets": ["bullet 1", "bullet 2", "bullet 3"],
  "challenge": "one specific action to do this week",
  "tone": "motivational" | "cautious" | "celebration" | "neutral"
}`;

  const result = await openaiChatText({
    messages: [
      { role: 'system', content: 'You are AllFantasy AI Coach. Respond with valid JSON only. No markdown.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    maxTokens: 400,
  });

  if (!result.ok) {
    return {
      type: recommendation.type,
      summary: recommendation.summary,
      bullets: recommendation.bullets,
      challenge: recommendation.actions[0] ?? 'Review your options and make one decisive move this week.',
      tone: 'neutral',
    };
  }

  try {
    const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      type: recommendation.type,
      summary: parsed.summary ?? recommendation.summary,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : recommendation.bullets,
      challenge: parsed.challenge ?? recommendation.actions[0] ?? '',
      tone: ['motivational', 'cautious', 'celebration', 'neutral'].includes(parsed.tone)
        ? parsed.tone
        : 'neutral',
    };
  } catch {
    return {
      type: recommendation.type,
      summary: recommendation.summary,
      bullets: recommendation.bullets,
      challenge: recommendation.actions[0] ?? '',
      tone: 'neutral',
    };
  }
}
