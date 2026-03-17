/**
 * AIProductRouteResolver — resolve product route from context (league, tab, sport).
 * Ensures cross-product AI navigation lands on the correct tab/page.
 */

import type { AIProductRoute } from './types';

const AF_LEGACY = '/af-legacy';

/** Map tabId to full href (no leagueId in path; af-legacy is user-scoped). */
const TAB_ROUTES: Record<string, string> = {
  overview: `${AF_LEGACY}?tab=overview`,
  trade: `${AF_LEGACY}?tab=trade`,
  finder: `${AF_LEGACY}?tab=finder`,
  waiver: `${AF_LEGACY}?tab=waiver`,
  rankings: `${AF_LEGACY}?tab=rankings`,
  'mock-draft': `${AF_LEGACY}?tab=mock-draft`,
  chat: `${AF_LEGACY}?tab=chat`,
  strategy: `${AF_LEGACY}?tab=strategy`,
  pulse: `${AF_LEGACY}?tab=pulse`,
  compare: `${AF_LEGACY}?tab=compare`,
  share: `${AF_LEGACY}?tab=share`,
  transfer: `${AF_LEGACY}?tab=transfer`,
  'player-finder': `${AF_LEGACY}?tab=player-finder`,
};

/**
 * Resolve href for af-legacy tab (and optional leagueId query if needed later).
 */
export function getAIProductRouteForTab(tabId: string, _leagueId?: string | null): AIProductRoute {
  const href = TAB_ROUTES[tabId] ?? `${AF_LEGACY}?tab=overview`;
  return {
    href,
    tabId,
    label: tabId,
    featureType: tabId,
  };
}

/**
 * All known AI product tab routes.
 */
export function getAllAIProductTabRoutes(): AIProductRoute[] {
  return Object.entries(TAB_ROUTES).map(([tabId, href]) => ({
    href,
    tabId,
    label: tabId,
    featureType: tabId,
  }));
}

/** AI Hub (unified AI command center). */
export const AI_HUB_HREF = '/ai';

/**
 * Standalone AI pages (not af-legacy tabs).
 */
export function getStandaloneAIRoutes(): AIProductRoute[] {
  return [
    { href: AI_HUB_HREF, label: 'AI Hub', featureType: 'ai_hub' },
    { href: '/chimmy', label: 'Chimmy', featureType: 'chimmy_chat' },
    { href: '/waiver-ai', label: 'Waiver AI', featureType: 'waiver_ai' },
    { href: '/social-clips', label: 'Social clips', featureType: 'social_clips' },
    { href: '/clips', label: 'Clips', featureType: 'clips' },
    { href: '/tools-hub', label: 'Tools Hub', featureType: 'tools_hub' },
  ];
}
