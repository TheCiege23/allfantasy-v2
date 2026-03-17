/**
 * DeepSeek: classify news type (Prompt 131).
 */

import { deepseekChat } from '@/lib/deepseek-client';
import type { NewsFeedItem, NewsType } from './types';

const NEWS_TYPES: NewsType[] = [
  'injury',
  'transaction',
  'performance',
  'roster',
  'coaching',
  'rumor',
  'official_release',
  'other',
];

export async function classifyNewsType(item: NewsFeedItem): Promise<NewsType | null> {
  const text = [item.title, item.description].filter(Boolean).join('\n').slice(0, 800);
  if (!text.trim()) return null;

  const result = await deepseekChat({
    systemPrompt: `You are a fantasy sports news classifier. Respond with exactly one word from this list: ${NEWS_TYPES.join(', ')}. No other text.`,
    prompt: `Classify this news item into exactly one category.\n\n${text}\n\nRespond with only the single category word.`,
    temperature: 0.1,
    maxTokens: 30,
  });

  if (result.error || !result.content) return null;
  const raw = result.content.trim().toLowerCase().replace(/\.$/, '');
  const found = NEWS_TYPES.find((t) => raw === t || raw.startsWith(t));
  return found ?? null;
}
