/**
 * Grok: summarize storyline impact (Prompt 131).
 * Falls back to OpenAI when Grok is unavailable.
 */

import type { NewsFeedItem } from './types';
import { xaiChatJson, parseTextFromXaiChatCompletion } from '@/lib/xai-client';
import { openaiChatText } from '@/lib/openai-client';
import { isOpenAIAvailable, isXaiAvailable } from '@/lib/provider-config';

/** Summarize the storyline/impact of the news in 1-2 sentences. Used for narrative context (Grok role). */
export async function summarizeStorylineImpact(item: NewsFeedItem): Promise<string | null> {
  const text = [item.title, item.description].filter(Boolean).join('\n').slice(0, 600);
  if (!text.trim()) return null;

  try {
    if (isXaiAvailable()) {
      const grok = await xaiChatJson({
        model: process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-2-latest',
        temperature: 0.3,
        maxTokens: 140,
        messages: [
          {
            role: 'system',
            content:
              'You are Grok writing fantasy sports storyline context. Return 1-2 concise sentences about what changed and why managers should care. No bullet points.',
          },
          {
            role: 'user',
            content: `Summarize the storyline impact for this news:\n\n${text}`,
          },
        ],
      });
      if (grok.ok) {
        const content = parseTextFromXaiChatCompletion(grok.json)?.trim();
        if (content) return content;
      }
    }

    if (isOpenAIAvailable()) {
      const fallback = await openaiChatText({
        temperature: 0.3,
        maxTokens: 140,
        messages: [
          {
            role: 'system',
            content:
              'Summarize sports news storyline impact in 1-2 concise sentences for fantasy managers. No bullet points.',
          },
          {
            role: 'user',
            content: `Summarize this storyline:\n\n${text}`,
          },
        ],
      });
      if (fallback.ok) {
        const content = fallback.text.trim();
        if (content) return content;
      }
    }

    return null;
  } catch (e) {
    console.error('[NewsStorylineAI]', e);
    return null;
  }
}
