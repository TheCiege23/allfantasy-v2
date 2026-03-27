/**
 * Fantasy News Aggregator — fetch, dedupe, classify players, importance score, AI enrichment (Prompt 131).
 */

import { getNewsFeedBySport, getPlayerNewsFeed, getTeamNewsFeed } from './NewsAggregationService';
import type { NewsFeedItem, EnrichedNewsItem, NewsType, ConfidenceLevel } from './types';
import { normalizeToSupportedSport } from '@/lib/sport-scope';
import { isDeepSeekAvailable, isOpenAIAvailable, isXaiAvailable } from '@/lib/provider-config';
import { classifyNewsType } from './NewsClassificationAI';
import { summarizeStorylineImpact } from './NewsStorylineAI';
import { explainFantasyImpact } from './NewsFantasyImpactAI';

const DEFAULT_LIMIT = 30;
const MAX_AI_ENRICHED_ITEMS = 12;
const MAX_PLAYERS_MENTIONED = 8;

export interface FetchNewsOptions {
  sport?: string;
  playerQuery?: string;
  teamQuery?: string;
  feedType?: 'sport' | 'player' | 'team';
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
    const titleKey = `${item.source ?? ''}::${(item.title ?? '').trim().toLowerCase()}::${item.publishedAt ?? ''}`;
    const key = normalizeUrl(item.sourceUrl) || titleKey || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const NON_PLAYER_NAME_TOKENS = new Set([
  'breaking',
  'official',
  'league',
  'team',
  'report',
  'reports',
  'coach',
  'head',
  'fantasy',
  'sports',
  'press',
  'release',
  'transaction',
  'transactions',
  'injury',
  'injuries',
  'depth',
  'chart',
  'starter',
  'starters',
  'nfl',
  'nba',
  'nhl',
  'mlb',
  'ncaab',
  'ncaaf',
  'soccer',
]);

function extractLikelyPlayerNames(text: string): string[] {
  if (!text.trim()) return [];
  const out = new Set<string>();
  const pattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,2})\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const candidate = (match[1] ?? '').trim();
    if (!candidate) continue;
    const parts = candidate.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) continue;
    if (parts.some((p) => NON_PLAYER_NAME_TOKENS.has(p.toLowerCase()))) continue;
    if (parts.some((p) => p.length < 2)) continue;
    out.add(candidate);
  }
  return Array.from(out);
}

/** Extract and merge player names from item (title, description, playerName, playerNames). */
function classifyPlayersMentioned(item: NewsFeedItem): string[] {
  const names = new Set<string>();
  if (item.playerName?.trim()) names.add(item.playerName.trim());
  item.playerNames?.forEach((n) => n?.trim() && names.add(n.trim()));

  const fallbackText = `${item.title ?? ''}\n${item.description ?? ''}`;
  for (const inferred of extractLikelyPlayerNames(fallbackText)) {
    names.add(inferred);
    if (names.size >= MAX_PLAYERS_MENTIONED) break;
  }

  return Array.from(names).slice(0, MAX_PLAYERS_MENTIONED);
}

/** Heuristic importance score 0–100: recency, source weight, has URL. */
function assignImportanceScore(item: NewsFeedItem, index: number, playersMentioned: string[]): number {
  let score = 35;
  const age = item.publishedAt ? (Date.now() - new Date(item.publishedAt).getTime()) / (60 * 60 * 1000) : 24;
  if (age < 1) score += 25;
  else if (age < 6) score += 16;
  else if (age < 18) score += 10;

  if (item.sourceUrl) score += 6;

  const sourceLower = (item.source || '').toLowerCase();
  if (sourceLower.includes('espn')) score += 18;
  if (sourceLower.includes('official')) score += 14;
  if (sourceLower.includes('press')) score += 12;
  if (sourceLower.includes('injury')) score += 14;
  if (sourceLower.includes('transaction')) score += 12;
  if (sourceLower.includes('team')) score += 8;

  const body = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  if (/\b(out|ir|injury|questionable|doubtful|suspended|activated|returns?)\b/.test(body)) score += 22;
  if (/\b(trade|traded|waived|released|signed|call[- ]?up|sent down|transaction)\b/.test(body)) score += 18;
  if (/\b(starting|starter|bench|depth chart|lineup|role|snap count|minutes)\b/.test(body)) score += 10;
  if (playersMentioned.length > 0) score += 6;
  if (item.category?.trim()) score += 4;
  if (index < 5) score += 4;

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
  const feedType = options.feedType ?? (options.playerQuery?.trim() ? 'player' : options.teamQuery?.trim() ? 'team' : 'sport');

  let items: NewsFeedItem[];
  if (feedType === 'player' && options.playerQuery?.trim()) {
    items = await getPlayerNewsFeed(options.playerQuery, limit, { refresh, sport });
  } else if (feedType === 'team' && options.teamQuery?.trim()) {
    items = await getTeamNewsFeed(options.teamQuery, limit, { refresh, sport });
  } else {
    items = await getNewsFeedBySport(sport, limit, { refresh });
  }

  return deduplicateStories(items);
}

function heuristicFantasyImpact(item: NewsFeedItem): string | null {
  const body = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
  if (!body.trim()) return null;
  if (/\b(out|ir|injury|questionable|doubtful|suspended)\b/.test(body)) {
    return 'Monitor availability closely; this can reduce short-term lineup reliability and increase replacement value.';
  }
  if (/\b(trade|traded|waived|released|signed|transaction)\b/.test(body)) {
    return 'Role and opportunity may shift quickly; re-check usage, depth chart, and waiver priorities.';
  }
  if (/\b(starting|starter|bench|depth chart|lineup|minutes|snap count)\b/.test(body)) {
    return 'Usage signals suggest lineup value can change; verify role stability before lock.';
  }
  return 'News may influence short-term projection variance; monitor follow-up reports before final lineup decisions.';
}

function heuristicConfidence(item: NewsFeedItem, importanceScore: number): ConfidenceLevel {
  const source = (item.source ?? '').toLowerCase();
  if (source.includes('espn') || source.includes('official') || source.includes('press release')) {
    return 'high';
  }
  if (importanceScore >= 70) return 'medium';
  return 'low';
}

/**
 * Enrich items with headline, summary, fantasy impact, confidence (AI layer).
 * Uses DeepSeek → Grok → OpenAI when keys available; otherwise heuristic defaults.
 */
export async function enrichNewsWithAI(
  items: NewsFeedItem[]
): Promise<EnrichedNewsItem[]> {
  const enriched: EnrichedNewsItem[] = [];
  const deepseekAvailable = isDeepSeekAvailable();
  const grokAvailable = isXaiAvailable();
  const openaiAvailable = isOpenAIAvailable();

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const playersMentioned = classifyPlayersMentioned(item);
    const importanceScore = assignImportanceScore(item, i, playersMentioned);

    let newsType: NewsType | null = null;
    let summary: string | null = item.description?.slice(0, 320) ?? item.title ?? null;
    let fantasyImpact: string | null = heuristicFantasyImpact(item);
    let confidenceLevel: ConfidenceLevel = heuristicConfidence(item, importanceScore);
    const runAi = i < MAX_AI_ENRICHED_ITEMS;

    if (runAi && deepseekAvailable) {
      try {
        newsType = await classifyNewsType(item);
      } catch {
        // Keep null fallback.
      }
    }

    if (runAi && grokAvailable) {
      try {
        const storyline = await summarizeStorylineImpact(item);
        if (storyline) summary = storyline;
      } catch {
        // Keep fallback summary.
      }
    }

    if (runAi && openaiAvailable) {
      try {
        const impact = await explainFantasyImpact(item, summary);
        if (impact?.text) fantasyImpact = impact.text;
        if (impact?.confidence) confidenceLevel = impact.confidence;
      } catch {
        // Keep heuristic impact/confidence.
      }
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
      summary: item.description?.slice(0, 320) ?? item.title ?? null,
      fantasyImpact: heuristicFantasyImpact(item),
      confidenceLevel: heuristicConfidence(item, assignImportanceScore(item, i, classifyPlayersMentioned(item))),
      importanceScore: assignImportanceScore(item, i, classifyPlayersMentioned(item)),
      newsType: null,
      playersMentioned: classifyPlayersMentioned(item),
    }));
  }
  return enrichNewsWithAI(items);
}
