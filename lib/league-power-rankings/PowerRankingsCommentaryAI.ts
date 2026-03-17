/**
 * AI commentary for power rankings (Prompt 132): DeepSeek (math), Grok/narrative (OpenAI), OpenAI (summary).
 */

import { deepseekChat } from '@/lib/deepseek-client';
import OpenAI from 'openai';
import type { PowerRankingsOutput, PowerRankingTeam } from './types';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface PowerRankingsCommentary {
  formulaExplanation: string | null;
  narrativeExplanation: string | null;
  rankingSummary: string | null;
}

function buildContext(data: PowerRankingsOutput): string {
  const top = data.teams.slice(0, 5).map((t, i) => {
    const r = t.record;
    return `${i + 1}. ${t.displayName || t.username || `Team ${t.rosterId}`}: ${r.wins}-${r.losses}${r.ties > 0 ? `-${r.ties}` : ''}, PF ${t.pointsFor.toFixed(0)}, PA ${t.pointsAgainst.toFixed(0)}, PowerScore ${t.powerScore.toFixed(0)}, Composite ${t.composite.toFixed(0)}${t.rankDelta != null ? ` (${t.rankDelta > 0 ? '+' : ''}${t.rankDelta} vs last week)` : ''}`;
  });
  return `League: ${data.leagueName}, Season ${data.season}, Week ${data.week}. Top 5:\n${top.join('\n')}`;
}

/** DeepSeek: interpret ranking math / formula. */
export async function interpretRankingMath(data: PowerRankingsOutput): Promise<string | null> {
  const context = buildContext(data);
  const result = await deepseekChat({
    systemPrompt: 'You explain fantasy league power ranking formulas in one short paragraph. Focus on how record, points for/against, roster strength (power score), and recent performance combine. Be concise.',
    prompt: `Given these power ranking results, explain in 2-3 sentences how the ranking math likely works (record weight, recent performance, roster strength, projection).\n\n${context}`,
    temperature: 0.2,
    maxTokens: 280,
  });
  if (result.error || !result.content?.trim()) return null;
  return result.content.trim();
}

/** Narrative explanation (Grok role — using OpenAI with narrative tone). */
export async function summarizeNarrative(data: PowerRankingsOutput): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildContext(data);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write brief narrative explanations for fantasy league power rankings. Highlight storylines: who is rising, who is underperforming vs roster strength, tight races. No bullet points. 2-3 sentences.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 200,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error('[PowerRankingsCommentaryAI] narrative', e);
    return null;
  }
}

/** OpenAI: clear ranking summary for users. */
export async function buildRankingSummary(data: PowerRankingsOutput): Promise<string | null> {
  if (!openai.apiKey) return null;
  const context = buildContext(data);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write a short, clear summary of fantasy league power rankings for the user. State who is #1 and one or two notable moves or takeaways. One paragraph, friendly tone.',
        },
        { role: 'user', content: context },
      ],
      max_tokens: 180,
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error('[PowerRankingsCommentaryAI] summary', e);
    return null;
  }
}

/** Full commentary pipeline. */
export async function getPowerRankingsCommentary(data: PowerRankingsOutput): Promise<PowerRankingsCommentary> {
  const [formulaExplanation, narrativeExplanation, rankingSummary] = await Promise.all([
    interpretRankingMath(data),
    summarizeNarrative(data),
    buildRankingSummary(data),
  ]);
  return {
    formulaExplanation,
    narrativeExplanation,
    rankingSummary,
  };
}
