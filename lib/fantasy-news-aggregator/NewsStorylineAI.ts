/**
 * Grok (or OpenAI fallback): summarize storyline impact (Prompt 131).
 */

import OpenAI from 'openai';
import type { NewsFeedItem } from './types';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

/** Summarize the storyline/impact of the news in 1-2 sentences. Used for narrative context (Grok role). */
export async function summarizeStorylineImpact(item: NewsFeedItem): Promise<string | null> {
  const text = [item.title, item.description].filter(Boolean).join('\n').slice(0, 600);
  if (!text.trim()) return null;

  if (!openai.apiKey) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You summarize sports news storylines for fantasy managers. Output 1-2 short sentences: what happened and why it matters. No bullet points, no instructions.',
        },
        {
          role: 'user',
          content: `Summarize this news storyline:\n\n${text}`,
        },
      ],
      max_tokens: 120,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    return content || null;
  } catch (e) {
    console.error('[NewsStorylineAI]', e);
    return null;
  }
}
