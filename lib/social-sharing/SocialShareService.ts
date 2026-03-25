/**
 * Builds share URLs for social networks and copy-link (Prompt 121).
 */

import { getShareContent, formatShareText } from './AchievementShareGenerator';
import type { AchievementShareType, AchievementShareContext } from './types';

const ACHIEVEMENT_PATH = '/share/achievements';

function getOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://allfantasy.ai';
}

/**
 * Build the canonical share URL for an achievement (landing page with params).
 */
export function getAchievementShareUrl(
  type: AchievementShareType,
  context: AchievementShareContext = {},
  origin?: string
): string {
  const base = origin ?? getOrigin();
  const params = new URLSearchParams();
  params.set('type', type);
  if (context.leagueName) params.set('league', context.leagueName);
  if (context.leagueId) params.set('leagueId', context.leagueId);
  if (context.score != null) params.set('score', String(context.score));
  if (context.opponentName) params.set('opponent', context.opponentName);
  if (context.week != null) params.set('week', String(context.week));
  if (context.teamName) params.set('team', context.teamName);
  const qs = params.toString();
  return `${base}${ACHIEVEMENT_PATH}${qs ? `?${qs}` : ''}`;
}

/**
 * Twitter/X intent URL.
 */
export function getTwitterShareUrl(
  shareUrl: string,
  text: string,
  maxTextLength: number = 200
): string {
  const params = new URLSearchParams({
    url: shareUrl,
    text: text.slice(0, maxTextLength),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Facebook share URL.
 */
export function getFacebookShareUrl(shareUrl: string): string {
  const params = new URLSearchParams({ u: shareUrl });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/**
 * Reddit share URL.
 */
export function getRedditShareUrl(shareUrl: string, title: string): string {
  const params = new URLSearchParams({
    url: shareUrl,
    title: title.slice(0, 300),
  });
  return `https://www.reddit.com/submit?${params.toString()}`;
}

/**
 * Full payload for copy link (title + URL).
 */
export function getCopyLinkPayload(shareUrl: string, title: string): string {
  return `${title}\n${shareUrl}`;
}

/**
 * One-shot: get share URL and pre-filled text for an achievement.
 */
export function getAchievementSharePayload(
  type: AchievementShareType,
  context: AchievementShareContext = {}
): {
  shareUrl: string;
  title: string;
  text: string;
  twitterUrl: string;
  facebookUrl: string;
  redditUrl: string;
} {
  const shareUrl = getAchievementShareUrl(type, context);
  const content = getShareContent(type, context);
  const text = formatShareText(content);
  return {
    shareUrl,
    title: content.title,
    text,
    twitterUrl: getTwitterShareUrl(shareUrl, content.text),
    facebookUrl: getFacebookShareUrl(shareUrl),
    redditUrl: getRedditShareUrl(shareUrl, content.title),
  };
}
