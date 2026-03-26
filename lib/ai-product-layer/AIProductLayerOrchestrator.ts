/**
 * AIProductLayerOrchestrator — single entry for the master AI product layer.
 * Connects all AI surfaces into one coherent AllFantasy intelligence system.
 */

import { getUnifiedChimmyEntries, getPrimaryChimmyEntry, getChimmyChatHref, getChimmyChatHrefWithPrompt } from './UnifiedChimmyEntryResolver';
import { getAIDashboardWidgets, getAIDashboardWidgetsForSurface, getAIDashboardWidgetByFeatureKey } from './AIDashboardWidgetResolver';
import {
  getAIToolDiscoveryLinks,
  getChimmyQuickActionLink,
  getAIToolDiscoveryLinksByCategory,
  getAIDiscoveryHrefForTool,
} from './AIToolDiscoveryBridge';
import {
  getAIProductRouteForTab,
  getAllAIProductTabRoutes,
  getStandaloneAIRoutes,
  getAIProductHrefForFeature,
  appendAIProductContextToHref,
} from './AIProductRouteResolver';
import {
  getAIConsistencyPreamble,
  shouldEnforceDeterministicFirst,
  getDeterministicFirstFeatureTypes,
} from './AIConsistencyGuard';
import {
  getSupportedSportsForAI,
  isSportSupportedForAI,
  getSportLabelForAI,
  getSportOptionsForAI,
  resolveSportForAIProduct,
} from './SportAIProductResolver';
import type { AIProductContext } from './types';

export const AIProductLayer = {
  /** Chimmy as the face of the AI layer */
  chimmy: {
    getChatHref: (context?: AIProductContext) => getChimmyChatHref(context),
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
    getHrefForFeature: getAIProductHrefForFeature,
    appendContextToHref: appendAIProductContextToHref,
  },

  /** Consistency and guardrails */
  consistency: {
    getPreamble: getAIConsistencyPreamble,
    shouldEnforceDeterministicFirst,
    getDeterministicFirstFeatureTypes,
  },

  /** Sport-aware AI (all 7 sports) */
  sport: {
    getSupportedSports: getSupportedSportsForAI,
    isSupported: isSportSupportedForAI,
    getLabel: getSportLabelForAI,
    getOptions: getSportOptionsForAI,
    resolve: resolveSportForAIProduct,
  },

  /**
   * Product-level bundle for a page/surface.
   * Use this to keep dashboard/tool/chat entry points aligned.
   */
  getUnifiedBundle: (context?: AIProductContext) => ({
    chimmyEntry: getPrimaryChimmyEntry(context),
    dashboardWidgets: getAIDashboardWidgets(context),
    discoveryLinks: getAIToolDiscoveryLinks(context),
    standaloneRoutes: getStandaloneAIRoutes(context),
    consistencyPreamble: getAIConsistencyPreamble(),
    sportOptions: getSportOptionsForAI(),
    deterministicFirstFeatureTypes: getDeterministicFirstFeatureTypes(),
  }),

  /**
   * Resolve navigation target for a product AI feature.
   */
  resolveProductRoute: (featureKey: string, context?: AIProductContext) =>
    getAIProductHrefForFeature(featureKey, context),

  /**
   * Build context-safe Chimmy handoff URL.
   */
  resolveChimmyHandoff: (context?: AIProductContext) =>
    getChimmyChatHref({
      ...context,
      source: context?.source ?? 'unknown',
    }),

  /**
   * Resolve category-specific discovery links with context.
   */
  resolveDiscoveryCategory: (
    category: 'tool' | 'chat' | 'story' | 'media' | 'governance',
    context?: AIProductContext
  ) => getAIToolDiscoveryLinksByCategory(category, context),

  /**
   * Resolve dashboard widgets for a specific surface and context.
   */
  resolveDashboardSurface: (surface: 'app' | 'league' | 'dashboard', context?: AIProductContext) =>
    getAIDashboardWidgetsForSurface(surface, context),

  /**
   * Resolve optional sport context to supported value.
   */
  resolveSupportedSport: (sport: string | null | undefined) => resolveSportForAIProduct(sport),
} as const;
