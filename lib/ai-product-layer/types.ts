/**
 * Master AI Product Layer — types for unified AI entry, routing, and discovery.
 */

import type { ToolAIEntryKey } from '@/lib/unified-ai/types';
import type { LeagueSport } from '@prisma/client';

/** Canonical Chimmy entry: chat surface with optional prefill. */
export interface ChimmyEntry {
  href: string;
  label: string;
  prompt?: string;
}

/** Dashboard AI widget descriptor. */
export interface AIDashboardWidget {
  id: string;
  label: string;
  description: string;
  href: string;
  tabId?: string;
  featureKey: string;
  sportAware: boolean;
}

/** Product route for AI tool (af-legacy tab or standalone page). */
export interface AIProductRoute {
  href: string;
  tabId?: string;
  label: string;
  featureType: string;
}

/** Tool discovery link (tool hub, search, quick action). */
export interface AIToolDiscoveryLink {
  label: string;
  href: string;
  description: string;
  featureKey: ToolAIEntryKey | string;
  category: 'tool' | 'chat' | 'story' | 'media' | 'governance';
}

export type SupportedSport = LeagueSport;
