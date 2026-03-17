/**
 * Fantasy News Aggregator — fetch, dedupe, classify players, importance score, AI enrichment (Prompt 131).
 */

import { getNewsFeedBySport, getPlayerNewsFeed } from './NewsAggregationService';
import type { NewsFeedItem, EnrichedNewsItem, NewsType, ConfidenceLevel } from './types';
import { normalizeToSupportedSport } from '@/lib/sport-scope';

const DEFAULT_LIMIT = 30;

export interface FetchNewsOptions {
  sport?: string;
  playerQuery?: string;
  limit?: number;
  refresh?: boolean;
}

/** Normalize URL for dedupe (strip fragments and trailing slash). */
function normalizeUrl(url: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url);
    u.hash = '';
    let p = u.pathname.replace(/\/+$/, '') || '/';
    return u.origin + p + (u.search || '');
  } catch {
    return url;
  }
}

/** Deduplicate by sourceUrl then id; keep first occurrence. */
function deduplicateStories(items: NewsFeedItem[]): NewsFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeUrl(item.sourceUrl) || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Extract and merge player names from item (title, description, playerName, playerNames). */
function classifyPlayersMentioned(item: NewsFeedItem): string[] {
  const names = new Set<string>();
  if (item.playerName?.trim()) names.add(item.playerName.trim());
  item.playerNames?.forEach((n) => n?.trim() && names.add(n.trim()));
  return Array.from(names);
}

/** Heuristic importance score 0–100: recency, source weight, has URL. */
function assignImportanceScore(item: NewsFeedItem, index: number): number {
  let score = 50;
  const age = item.publishedAt ? (Date.now() - new Date(item.publishedAt).getTime()) / (60 * 60 * 1000) : 24;
  if (age < 2) score += 20;
  else if (age < 12) score += 10;
  if (item.sourceUrl) score += 10;
  const sourceLower = (item.source || '').toLowerCase();
  if (sourceLower.includes('espn') || sourceLower.includes('official')) score += 10;
  if (index < 5) score += 5;
  return Math.min(100, Math.max(0, score));
}

/**
 * Fetch news, deduplicate, classify players, assign importance.
 * Returns base items with enrichment fields filled by heuristics; AI enrichment can run separately.
 */
export async function fetchAndPrepareNews(options: FetchNewsOptions = {}): Promise<NewsFeedItem[]> {
  const sport = options.sport ? normalizeToSupportedSport(options.sport) : 'NFL';
  const limit = options.limit ?? DEFAULT_LIMIT;
  const refresh = options.refresh ?? false;

  let items: NewsFeedItem[];
  if (options.playerQuery?.trim()) {
    items = await getPlayerNewsFeed(options.playerQuery, limit, { refresh, sport });
  } else {
    items = await getNewsFeedBySport(sport, limit, { refresh });
  }

  const deduped = deduplicateStories(items);
  return deduped;
}

/**
 * Enrich items with headline, summary, fantasy impact, confidence (AI layer).
 * Uses DeepSeek → Grok → OpenAI when keys available; otherwise heuristic defaults.
 */
export async function enrichNewsWithAI(
  items: NewsFeedItem[]
): Promise<EnrichedNewsItem[]> {
  const { classifyNewsType } = await import('./NewsClassificationAI');
  const { summarizeStorylineImpact } = await import('./NewsStorylineAI');
  const { explainFantasyImpact } = await import('./NewsFantasyImpactAI');

  const enriched: EnrichedNewsItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const playersMentioned = classifyPlayersMentioned(item);
    const importanceScore = assignImportanceScore(item, i);

    let newsType: NewsType | null = null;
    let summary: string | null = item.description?.slice(0, 300) ?? null;
    let fantasyImpact: string | null = null;
    let confidenceLevel: ConfidenceLevel = 'medium';

    try {
      newsType = await classifyNewsType(item);
    } catch {
      // keep null
    }
    try {
      const storyline = await summarizeStorylineImpact(item);
      if (storyline) summary = storyline;
    } catch {
      // keep description slice
    }
    try {
      const impact = await explainFantasyImpact(item, summary);
      if (impact?.text) fantasyImpact = impact.text;
      if (impact?.confidence) confidenceLevel = impact.confidence;
    } catch {
      // keep null
    }

    enriched.push({
      ...item,
      headline: item.title,
      summary,
      fantasyImpact,
      confidenceLevel,
      importanceScore,
      newsType,
      playersMentioned,
    });
  }
  return enriched;
}

/**
 * Full pipeline: fetch, dedupe, then enrich with AI. Returns EnrichedNewsItem[].
 */
export async function getEnrichedNewsFeed(options: FetchNewsOptions & { enrich?: boolean } = {}): Promise<EnrichedNewsItem[]> {
  const items = await fetchAndPrepareNews(options);
  if (items.length === 0) return [];

  const enrich = options.enrich !== false;
  if (!enrich) {
    return items.map((item, i) => ({
      ...item,
      headline: item.title,
      summary: item.description?.slice(0, 300) ?? null,
      fantasyImpact: null,
      confidenceLevel: 'medium' as ConfidenceLevel,
      importanceScore: assignImportanceScore(item, i),
      newsType: null,
      playersMentioned: classifyPlayersMentioned(item),
    }));
  }
  return enrichNewsWithAI(items);
}
