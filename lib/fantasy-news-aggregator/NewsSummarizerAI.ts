/**
 * AI-summarized headlines for fantasy news (Prompt 118).
 * Batches titles and returns short summarized headlines.
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

const MAX_BATCH = 15;
const SUMMARIZE_PROMPT = `You are a fantasy sports editor. For each news headline below, output a very short summarized headline (one line, under 80 chars) that keeps the fantasy-relevant takeaway. Keep player/team names and key facts. Output only the summarized headlines, one per line, in the same order as the input. No numbering or bullets.`;

export interface ItemForSummary {
  id: string;
  title: string;
}

/**
 * Returns a map of item id -> summarized headline. Missing or failed entries fall back to original title.
 */
export async function summarizeHeadlines(
  items: ItemForSummary[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  if (items.length === 0) return result;

  const batch = items.slice(0, MAX_BATCH);
  const titles = batch.map((i) => i.title);
  const byId = new Map(batch.map((i) => [i.id, i.title]));

  for (const item of items) {
    result[item.id] = item.title;
  }

  if (!openai.apiKey) {
    return result;
  }

  try {
    const inputText = titles.join('\n');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: `${SUMMARIZE_PROMPT}\n\nInput headlines:\n${inputText}` },
      ],
      max_tokens: 1024,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return result;

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    batch.forEach((item, idx) => {
      const summarized = lines[idx];
      if (summarized) {
        result[item.id] = summarized.length > 120 ? summarized.slice(0, 117) + '...' : summarized;
      }
    });
  } catch (e) {
    console.error('[NewsSummarizerAI]', e);
  }

  return result;
}
