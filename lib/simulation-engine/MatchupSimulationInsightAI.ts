/**
 * AI insight for matchup simulation (Prompt 133): DeepSeek (distribution), Grok/narrative (OpenAI), OpenAI (explanation).
 */

import { deepseekChat } from '@/lib/deepseek-client';
import OpenAI from 'openai';
import type { MatchupSimulationOutput } from './types';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface MatchupInsightResult {
  distributionInterpretation: string | null;
  storylineFraming: string | null;
  matchupExplanation: string | null;
}

function buildContext(out: MatchupSimulationOutput, teamAName: string, teamBName: string): string {
  const lines = [
    `Sport: ${out.sport}. ${teamAName} vs ${teamBName}.`,
    `Expected: ${out.expectedScoreA.toFixed(1)} - ${out.expectedScoreB.toFixed(1)}.`,
    `Win probability: ${(out.winProbabilityA * 100).toFixed(1)}% - ${(out.winProbabilityB * 100).toFixed(1)}%.`,
    `Upset chance: ${out.upsetChance}%. Volatility: ${out.volatilityTag}.`,
    `Iterations: ${out.iterations}.`,
  ];
  if (out.upsideScenario) {
    lines.push(`Upside (90th %): ${out.upsideScenario.teamA.toFixed(1)} - ${out.upsideScenario.teamB.toFixed(1)}.`);
  }
  if (out.downsideScenario) {
    lines.push(`Downside (10th %): ${out.downsideScenario.teamA.toFixed(1)} - ${out.downsideScenario.teamB.toFixed(1)}.`);
  }
  return lines.join(' ');
}

/** DeepSeek: interpret simulation distribution. */
export async function interpretSimulationDistribution(
  out: MatchupSimulationOutput,
  teamAName: string,
  teamBName: string
): Promise<string | null> {
  const context = buildContext(out, teamAName, teamBName);
  const result = await deepseekChat({
    systemPrompt: 'You interpret fantasy matchup simulation outputs. Explain what the win probability and score distributions mean in one short paragraph. Mention upside/downside scenarios if present.',
    prompt: context,
    temperature: 0.2,
    maxTokens: 220,
  });
  if (result.error || !result.content?.trim()) return null;
  return result.content.trim();
}

/** Storyline framing (Grok role — OpenAI). */
export async function buildStorylineFraming(
  out: MatchupSimulationOutput,
  teamAName: string,
  teamBName: string
): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildContext(out, teamAName, teamBName);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write one short narrative sentence framing the matchup (e.g. "A slight favorite with real upset potential" or "A coin flip"). No numbers. One sentence.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 80,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('[MatchupSimulationInsightAI] storyline', e);
    return null;
  }
}

/** OpenAI: clear matchup explanation. */
export async function buildMatchupExplanation(
  out: MatchupSimulationOutput,
  teamAName: string,
  teamBName: string
): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildContext(out, teamAName, teamBName);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You explain this fantasy matchup simulation in 2-3 clear sentences for the user: who is favored, by how much, and what upside/downside looks like.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 150,
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error('[MatchupSimulationInsightAI] explanation', e);
    return null;
  }
}

export async function getMatchupSimulationInsight(
  out: MatchupSimulationOutput,
  teamAName: string,
  teamBName: string
): Promise<MatchupInsightResult> {
  const [distributionInterpretation, storylineFraming, matchupExplanation] = await Promise.all([
    interpretSimulationDistribution(out, teamAName, teamBName),
    buildStorylineFraming(out, teamAName, teamBName),
    buildMatchupExplanation(out, teamAName, teamBName),
  ]);
  return {
    distributionInterpretation,
    storylineFraming,
    matchupExplanation,
  };
}
