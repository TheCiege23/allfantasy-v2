/**
 * AIProductLayerOrchestrator — single entry for the master AI product layer.
 * Connects all AI surfaces into one coherent AllFantasy intelligence system.
 */

import { getUnifiedChimmyEntries, getPrimaryChimmyEntry, getChimmyChatHrefWithPrompt } from './UnifiedChimmyEntryResolver';
import { getAIDashboardWidgets, getAIDashboardWidgetsForSurface, getAIDashboardWidgetByFeatureKey } from './AIDashboardWidgetResolver';
import {
  getAIToolDiscoveryLinks,
  getChimmyQuickActionLink,
  getAIToolDiscoveryLinksByCategory,
  getAIDiscoveryHrefForTool,
} from './AIToolDiscoveryBridge';
import { getAIProductRouteForTab, getAllAIProductTabRoutes, getStandaloneAIRoutes } from './AIProductRouteResolver';
import { getAIConsistencyPreamble, shouldEnforceDeterministicFirst } from './AIConsistencyGuard';
import { getSupportedSportsForAI, isSportSupportedForAI, getSportLabelForAI, getSportOptionsForAI } from './SportAIProductResolver';

export const AIProductLayer = {
  /** Chimmy as the face of the AI layer */
  chimmy: {
    getChatHref: () => '/af-legacy?tab=chat',
    getChatHrefWithPrompt: getChimmyChatHrefWithPrompt,
    getPrimaryEntry: getPrimaryChimmyEntry,
    getEntries: getUnifiedChimmyEntries,
  },

  /** Dashboard AI widgets */
  dashboard: {
    getWidgets: getAIDashboardWidgets,
    getWidgetsForSurface: getAIDashboardWidgetsForSurface,
    getWidgetByFeatureKey: getAIDashboardWidgetByFeatureKey,
  },

  /** Tool hub / search / quick action discovery */
  discovery: {
    getLinks: getAIToolDiscoveryLinks,
    getChimmyQuickAction: getChimmyQuickActionLink,
    getLinksByCategory: getAIToolDiscoveryLinksByCategory,
    getHrefForTool: getAIDiscoveryHrefForTool,
  },

  /** Product routes (tabs, standalone pages) */
  routes: {
    getRouteForTab: getAIProductRouteForTab,
    getAllTabRoutes: getAllAIProductTabRoutes,
    getStandaloneRoutes: getStandaloneAIRoutes,
  },

  /** Consistency and guardrails */
  consistency: {
    getPreamble: getAIConsistencyPreamble,
    shouldEnforceDeterministicFirst,
  },

  /** Sport-aware AI (all 7 sports) */
  sport: {
    getSupportedSports: getSupportedSportsForAI,
    isSupported: isSportSupportedForAI,
    getLabel: getSportLabelForAI,
    getOptions: getSportOptionsForAI,
  },
} as const;
