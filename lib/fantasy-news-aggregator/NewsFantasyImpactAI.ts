/**
 * OpenAI: fantasy impact explanation and confidence (Prompt 131).
 */

import type { NewsFeedItem, ConfidenceLevel } from './types';
import { openaiChatText } from '@/lib/openai-client';
import { isOpenAIAvailable } from '@/lib/provider-config';

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

  if (!isOpenAIAvailable()) return { text: null, confidence: 'low' };

  try {
    const completion = await openaiChatText({
      temperature: 0.3,
      maxTokens: 170,
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
    });
    if (!completion.ok) return { text: null, confidence: 'low' };

    const raw = completion.text.trim();
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
