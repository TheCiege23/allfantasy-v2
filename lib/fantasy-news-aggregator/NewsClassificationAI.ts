/**
 * DeepSeek: classify news type (Prompt 131).
 */

import { deepseekChat } from '@/lib/deepseek-client';
import type { NewsFeedItem, NewsType } from './types';
import { isDeepSeekAvailable } from '@/lib/provider-config';

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
  const lower = text.toLowerCase();

  const heuristic = (): NewsType => {
    if (/\b(injury|out|ir|questionable|doubtful|suspended|activated)\b/.test(lower)) return 'injury';
    if (/\b(trade|traded|waived|released|signed|transaction|extension)\b/.test(lower)) return 'transaction';
    if (/\b(depth chart|lineup|starter|bench|promoted|demoted|rotation)\b/.test(lower)) return 'roster';
    if (/\b(coach|coordinator|scheme|play-caller)\b/.test(lower)) return 'coaching';
    if (/\b(rumor|reportedly|expected to|linked to)\b/.test(lower)) return 'rumor';
    if (/\b(official|press release|announced)\b/.test(lower)) return 'official_release';
    if (/\b(career-high|breakout|dominant|performance)\b/.test(lower)) return 'performance';
    return 'other';
  };

  if (!isDeepSeekAvailable()) return heuristic();

  const result = await deepseekChat({
    systemPrompt: `You are a fantasy sports news classifier. Respond with exactly one word from this list: ${NEWS_TYPES.join(', ')}. No other text.`,
    prompt: `Classify this news item into exactly one category.\n\n${text}\n\nRespond with only the single category word.`,
    temperature: 0.1,
    maxTokens: 30,
  });

  if (result.error || !result.content) return heuristic();
  const raw = result.content.trim().toLowerCase().replace(/\.$/, '');
  const found = NEWS_TYPES.find((t) => raw === t || raw.startsWith(t));
  return found ?? heuristic();
}
