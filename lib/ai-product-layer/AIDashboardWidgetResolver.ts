/**
 * AIDashboardWidgetResolver — which AI widgets to show on dashboard, league, and app surfaces.
 * Keeps AI discovery consistent and sport-aware.
 */

import { getChimmyChatHref } from './UnifiedChimmyEntryResolver';
import type { AIDashboardWidget } from './types';

const AF_LEGACY = '/af-legacy';

const WIDGETS: AIDashboardWidget[] = [
  {
    id: 'trade',
    label: 'AI Trade Analyzer',
    description: 'Context-aware trade evaluations',
    href: `${AF_LEGACY}?tab=trade`,
    tabId: 'trade',
    featureKey: 'trade',
    sportAware: true,
  },
  {
    id: 'waiver',
    label: 'Waiver Engine',
    description: 'Weekly waiver priority and one-move plan',
    href: `${AF_LEGACY}?tab=waiver`,
    tabId: 'waiver',
    featureKey: 'waiver',
    sportAware: true,
  },
  {
    id: 'rankings',
    label: 'Team Direction',
    description: 'Power + luck rankings',
    href: `${AF_LEGACY}?tab=rankings`,
    tabId: 'rankings',
    featureKey: 'rankings',
    sportAware: true,
  },
  {
    id: 'mock-draft',
    label: 'Draft War Room',
    description: 'Real-time draft recommendations',
    href: `${AF_LEGACY}?tab=mock-draft`,
    tabId: 'mock-draft',
    featureKey: 'draft',
    sportAware: true,
  },
  {
    id: 'finder',
    label: 'Trade Review',
    description: 'AI trade finder and matchmaking',
    href: `${AF_LEGACY}?tab=finder`,
    tabId: 'finder',
    featureKey: 'finder',
    sportAware: true,
  },
  {
    id: 'chat',
    label: 'AI Chat',
    description: 'Ask Chimmy anything',
    href: getChimmyChatHref(),
    tabId: 'chat',
    featureKey: 'chimmy',
    sportAware: true,
  },
];

/**
 * All dashboard AI widgets (for app/league/dashboard surfaces).
 */
export function getAIDashboardWidgets(): AIDashboardWidget[] {
  return [...WIDGETS];
}

/**
 * Widgets for a given surface (e.g. league context can filter by leagueId later).
 */
export function getAIDashboardWidgetsForSurface(surface: 'app' | 'league' | 'dashboard'): AIDashboardWidget[] {
  return getAIDashboardWidgets();
}

/**
 * Single widget by feature key (for deep links and handoffs).
 */
export function getAIDashboardWidgetByFeatureKey(featureKey: string): AIDashboardWidget | null {
  return WIDGETS.find((w) => w.featureKey === featureKey) ?? null;
}
