/**
 * AIToolDiscoveryBridge — connects tool hub, search, and quick actions to AI tools and Chimmy.
 * Single place for AI discovery links so product feels like one intelligence system.
 */

import { getPrimaryChimmyEntry } from './UnifiedChimmyEntryResolver';
import { ROUTES } from '@/lib/tool-hub';
import type { AIToolDiscoveryLink } from './types';
import type { ToolAIEntryKey } from '@/lib/unified-ai/types';

const LINKS: AIToolDiscoveryLink[] = [
  { label: 'Ask Chimmy', href: '/af-legacy?tab=chat', description: 'AI chat', featureKey: 'chimmy_chat', category: 'chat' },
  { label: 'Trade Analyzer', href: '/af-legacy?tab=trade', description: 'Trade evaluations', featureKey: 'trade_analyzer', category: 'tool' },
  { label: 'Trade Finder', href: '/af-legacy?tab=finder', description: 'Trade matchmaking', featureKey: 'trade_evaluator', category: 'tool' },
  { label: 'Waiver AI', href: '/af-legacy?tab=waiver', description: 'Waiver recommendations', featureKey: 'waiver_ai', category: 'tool' },
  { label: 'Rankings', href: '/af-legacy?tab=rankings', description: 'Power rankings', featureKey: 'rankings', category: 'tool' },
  { label: 'Draft War Room', href: '/af-legacy?tab=mock-draft', description: 'Draft AI', featureKey: 'draft_helper', category: 'tool' },
  { label: 'Chimmy', href: ROUTES.chimmy(), description: 'Meet Chimmy', featureKey: 'chimmy_chat', category: 'chat' },
  { label: 'Social clips', href: '/social-clips', description: 'Grok social generator', featureKey: 'social_clips', category: 'media' },
  { label: 'Clips', href: '/clips', description: 'Shareable graphics', featureKey: 'clips', category: 'media' },
];

/**
 * All AI discovery links (tool hub, search, quick actions).
 */
export function getAIToolDiscoveryLinks(): AIToolDiscoveryLink[] {
  return [...LINKS];
}

/**
 * Links for quick action / top bar "Ask Chimmy" (primary chat entry).
 */
export function getChimmyQuickActionLink(): AIToolDiscoveryLink {
  const entry = getPrimaryChimmyEntry();
  return {
    label: entry.label,
    href: entry.href,
    description: 'Open AI chat',
    featureKey: 'chimmy_chat',
    category: 'chat',
  };
}

/**
 * Links for a given category (tool, chat, story, media, governance).
 */
export function getAIToolDiscoveryLinksByCategory(category: AIToolDiscoveryLink['category']): AIToolDiscoveryLink[] {
  return LINKS.filter((l) => l.category === category);
}

/**
 * Resolve href for a tool key (for handoffs and deep links).
 */
export function getAIDiscoveryHrefForTool(key: ToolAIEntryKey | string): string {
  if (key === 'chimmy_chat') return getPrimaryChimmyEntry().href;
  const w = LINKS.find((l) => l.featureKey === key);
  return w?.href ?? '/af-legacy?tab=chat';
}
