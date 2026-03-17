/**
 * Calls Grok API to generate social content (Prompt 116).
 * Server-only; uses XAI_API_KEY or GROK_API_KEY from env.
 */

import OpenAI from 'openai';
import { buildSocialSystemPrompt, buildSocialUserPrompt } from './SocialPromptBuilder';
import type { SocialPromptBuildInput, GrokSocialOutput } from './types';

const GROK_BASE = 'https://api.x.ai/v1';
const GROK_MODEL = 'grok-4-0709';

function getApiKey(): string | null {
  const key = process.env.XAI_API_KEY ?? process.env.GROK_API_KEY;
  return key?.trim() || null;
}

function getClient(): OpenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: GROK_BASE,
  });
}

export function isGrokConfigured(): boolean {
  return !!getApiKey();
}

export async function generateSocialContent(
  input: SocialPromptBuildInput
): Promise<GrokSocialOutput | null> {
  const client = getClient();
  if (!client) {
    console.error('[GrokSocialContent] XAI_API_KEY/GROK_API_KEY not set');
    return null;
  }

  const systemPrompt = buildSocialSystemPrompt(input);
  const userPrompt = buildSocialUserPrompt(input);

  try {
    const response = await client.chat.completions.create({
      model: GROK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const parsed = parseJsonContent(content);
    if (!parsed) return null;

    return normalizeGrokOutput(parsed);
  } catch (err) {
    console.error('[GrokSocialContent] Grok request failed', err);
    return null;
  }
}

function parseJsonContent(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeGrokOutput(parsed: Record<string, unknown>): GrokSocialOutput {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 10) : [];
  const str = (v: unknown, fallback: string): string =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, 500) : fallback;

  const platformVariants: Record<string, { caption: string; hashtags: string[] }> = {};
  const pv = parsed.platformVariants;
  if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
    for (const [k, v] of Object.entries(pv)) {
      if (v && typeof v === 'object' && v !== null && 'caption' in v) {
        const cap = typeof (v as any).caption === 'string' ? (v as any).caption : '';
        const tags = arr((v as any).hashtags);
        platformVariants[k] = { caption: cap.slice(0, 300), hashtags: tags };
      }
    }
  }

  return {
    shortCaption: str(parsed.shortCaption, 'Fantasy recap from AllFantasy.'),
    headline: str(parsed.headline, 'Fantasy Recap'),
    ctaText: str(parsed.ctaText, 'Get more at AllFantasy'),
    hashtags: arr(parsed.hashtags),
    socialCardCopy: str(parsed.socialCardCopy, 'AllFantasy'),
    clipTitle: str(parsed.clipTitle, 'Fantasy Clip'),
    platformVariants: Object.keys(platformVariants).length > 0 ? platformVariants : undefined,
  };
}
