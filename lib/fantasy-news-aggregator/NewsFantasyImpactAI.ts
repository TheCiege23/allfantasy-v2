/**
 * OpenAI: fantasy impact explanation and confidence (Prompt 131).
 */

import OpenAI from 'openai';
import type { NewsFeedItem, ConfidenceLevel } from './types';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export interface FantasyImpactResult {
  text: string | null;
  confidence: ConfidenceLevel;
}

/** Explain fantasy impact and return confidence level. */
export async function explainFantasyImpact(
  item: NewsFeedItem,
  summaryOrDescription?: string | null
): Promise<FantasyImpactResult> {
  const body = [item.title, summaryOrDescription ?? item.description].filter(Boolean).join('\n').slice(0, 600);
  if (!body.trim()) return { text: null, confidence: 'low' };

  if (!openai.apiKey) return { text: null, confidence: 'low' };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a fantasy sports analyst. In 1-2 sentences, explain the fantasy impact of the news. Then on a new line write exactly one word: high, medium, or low (confidence in your impact assessment). No other formatting.`,
        },
        {
          role: 'user',
          content: body,
        },
      ],
      max_tokens: 150,
    });
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return { text: null, confidence: 'medium' };
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1]?.toLowerCase();
    const confidence: ConfidenceLevel =
      last === 'high' || last === 'medium' || last === 'low' ? last : 'medium';
    const text = lines.length > 1 ? lines.slice(0, -1).join(' ').trim() : (last === 'high' || last === 'medium' || last === 'low' ? '' : raw);
    return { text: text || null, confidence };
  } catch (e) {
    console.error('[NewsFantasyImpactAI]', e);
    return { text: null, confidence: 'low' };
  }
}
