# Prompt 129 — Master AI Product Integration Layer + Full UI Click Audit

## Deliverable summary

This document describes the master AI product architecture, orchestration and routing updates, dashboard/tool/chat integration, consistency/guardrail updates, full UI click audit, QA findings, issues fixed, final QA checklist, and explanation of the master AI product integration layer.

---

## 1. Master AI product architecture

### Overview

The **AI Product Layer** (`lib/ai-product-layer`) is the single product-level integration that connects all AI surfaces into one coherent AllFantasy intelligence system. Chimmy is the face of the layer; tool AIs (trade, waiver, rankings, draft, psychology, story, media) are specialized but coordinated; and all entry points (dashboard, tool hub, top bar, quick actions) use the same canonical routes and labels.

### Core modules

| Module | Purpose |
|--------|--------|
| **AIProductLayerOrchestrator** | Single export `AIProductLayer` — chimmy, dashboard, discovery, routes, consistency, sport. |
| **UnifiedChimmyEntryResolver** | All Chimmy entry points: `getChimmyChatHref()`, `getChimmyChatHrefWithPrompt(prompt)`, `getPrimaryChimmyEntry()`, `getUnifiedChimmyEntries()`. |
| **AIDashboardWidgetResolver** | AI widgets for dashboard/league/app: `getAIDashboardWidgets()`, `getAIDashboardWidgetsForSurface()`, `getAIDashboardWidgetByFeatureKey()`. |
| **AIToolDiscoveryBridge** | Tool hub / search / quick action links: `getAIToolDiscoveryLinks()`, `getChimmyQuickActionLink()`, `getAIDiscoveryHrefForTool()`. |
| **AIProductRouteResolver** | Product routes from context: `getAIProductRouteForTab(tabId)`, `getAllAIProductTabRoutes()`, `getStandaloneAIRoutes()`. |
| **AIConsistencyGuard** | Product-level rules (deterministic-first, fact-grounded, no invented claims); `shouldEnforceDeterministicFirst(featureType)`. |
| **SportAIProductResolver** | Sport-aware AI: `getSupportedSportsForAI()`, `isSportSupportedForAI()`, `getSportLabelForAI()`, `getSportOptionsForAI()` — all seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) from `lib/sport-scope`. |

### Data flow

- **Chimmy**: Every “Ask Chimmy” / “Open AI Chat” link uses `getPrimaryChimmyEntry().href` (or `getChimmyChatHrefWithPrompt` for tool-to-chat). Right rail and top bar utilities resolve via the layer.
- **Dashboard / league**: AIFeaturesPanel and other AI cards use tabIds that match af-legacy layout; widgets can be sourced from `getAIDashboardWidgets()` for future consolidation.
- **Tool hub / search**: Discovery links and Chimmy quick action are defined in AIToolDiscoveryBridge; hrefs align with AIProductRouteResolver and UnifiedChimmyEntryResolver.
- **Consistency**: AIConsistencyGuard defines product rules; enforcement remains in `lib/unified-ai` (AIFactGuard, deterministic-first in routes).

---

## 2. Orchestration and routing updates

- **Unified AI orchestration** (existing): No change to `lib/unified-ai` — ModelRoutingResolver, AIOrchestrator, AIFactGuard, and tool adapters are unchanged. The product layer sits above them for entry points and discovery.
- **Routing**: `AIProductRouteResolver` defines all af-legacy tab hrefs and standalone AI pages. `UnifiedChimmyEntryResolver` defines the single Chimmy chat base and prompt-prefill URL builder. No duplicate definitions; new surfaces can import from `@/lib/ai-product-layer`.

---

## 3. Dashboard / tool / chat integration updates

- **SharedRightRail**: “Open AI Chat” link now uses `getPrimaryChimmyEntry()` from `@/lib/ai-product-layer`; href and label come from the layer so the rail stays in sync with the canonical Chimmy entry.
- **TopBarUtilityResolver**: `ai_chat` utility uses `getPrimaryChimmyEntry().href` and `.label` so the top-bar AI Chat button is driven by the product layer.
- **GlobalTopNav**: The AI Chat (Sparkles) link uses `getPrimaryChimmyEntry().href` and `.label` so the global top bar Chimmy entry is centralized.
- **AIFeaturesPanel**: Corrected tabIds so navigation lands on the right af-legacy tab: “Draft War Room” uses `tabId: 'mock-draft'` (was `'draft'`); “Waiver One Move” uses `tabId: 'waiver'` (was `'finder'`). No new dependency on the layer in the panel; tabIds now match `app/af-legacy/layout.tsx`.
- **Tool hub**: ToolsHubClient continues to use `lib/tool-hub` (ROUTES, getToolCardDisplay, etc.). AIToolDiscoveryBridge provides a parallel list of AI discovery links for use by search, quick actions, or future “AI” section in the hub; no breaking change to existing tool hub.

---

## 4. Consistency / guardrail updates

- **AIConsistencyGuard**: Defines `AI_PRODUCT_CONSISTENCY_RULES` (deterministic-first, fact-grounded, no invented claims, sport/league aware, confidence when justified) and `shouldEnforceDeterministicFirst(featureType)` for tool types that have engine output. Actual enforcement remains in unified-ai and route handlers; the guard is the product-level contract and can be used for docs, tests, or future prompt snippets.
- **Deterministic-first**: Already enforced in trade evaluator, dynasty trade analyzer, waiver AI, and rankings; product layer does not duplicate logic, only documents and exposes a single predicate for feature types.

---

## 5. Full UI click audit findings

| # | Component / route | Element | Expected behavior | Verified (Y/N) | Notes |
|---|-------------------|--------|--------------------|----------------|------|
| 1 | SharedRightRail | Open AI Chat / Ask Chimmy | Link to Chimmy chat | Y | Uses getPrimaryChimmyEntry() |
| 2 | GlobalTopNav / TopBarUtilityResolver | AI Chat | Link to Chimmy chat | Y | href/title from getPrimaryChimmyEntry() |
| 3 | AIFeaturesPanel | Trade Analyzer card | onNavigate('trade') → af-legacy?tab=trade | Y | tabId trade |
| 4 | AIFeaturesPanel | Rivalry Week card | onNavigate('transfer') | Y | tabId transfer |
| 5 | AIFeaturesPanel | Draft War Room card | onNavigate('mock-draft') | Y | Fixed: was 'draft' |
| 6 | AIFeaturesPanel | Waiver One Move card | onNavigate('waiver') | Y | Fixed: was 'finder' |
| 7 | AIFeaturesPanel | Power + Luck card | onNavigate('rankings') | Y | tabId rankings |
| 8 | AIFeaturesPanel | AI Trade Finder card | onNavigate('finder') | Y | tabId finder |
| 9 | ToolsHubClient | Featured tool “Open” | Link to card.openToolHref | Y | From tool-hub |
| 10 | ToolsHubClient | Chimmy card | Link to ROUTES.chimmy() | Y | /chimmy |
| 11 | AppShellNav | AI Chat | href /af-legacy?tab=chat | Y | Matches primary entry |
| 12 | BracketTopNav / BracketHomeTabs | AI Coach | href /af-legacy?tab=chat | Y | Consistent |
| 13 | BracketAICoachTab | Link | /af-legacy?tab=chat | Y | Consistent |
| 14 | BracketEntryActionsCard | AI link | /af-legacy?tab=chat&leagueId= | Y | Context preserved |
| 15 | LeagueForecastDashboard | Ask Chimmy | /af-legacy?tab=chat&prompt=... | Y | Context prefill |
| 16 | MatchupSimulationCard | Explain matchup | getMatchupAIChatUrl(...) | Y | Context prefill |
| 17 | TradeFinderV2 | Ask AI → Open Chat | getTradeAnalyzerAIChatUrl(...) | Y | Context prefill |
| 18 | QuickActionsService | Ask Chimmy | /af-legacy?tab=chat | Y | Consistent |
| 19 | SearchResultResolver | Chimmy / AI Chat | /chimmy, /af-legacy?tab=chat | Y | Consistent |
| 20 | ChimmyLandingClient | CTAs | /af-legacy?tab=chat, /tools-hub | Y | Consistent |
| 21 | app/app page | AI section cards | Static copy; no links | Y | No dead links |
| 22 | RecentAIActivity | List items | Static placeholder | Y | No click handlers |
| 23 | DraftTab | Run AI | POST .../draft/recommend-ai | Y | Wired |
| 24 | WaiversTab | Run AI | POST .../waivers/ai-advice | Y | Wired |
| 25 | TradesTab | Trade Center / History | setMode | Y | Wired |

All 25 audited product-level AI entry points have correct handlers or hrefs; two fixes were applied (AIFeaturesPanel tabIds).

---

## 6. QA findings

- **Chimmy as face of AI**: Primary entry is centralized in UnifiedChimmyEntryResolver; top bar and right rail use it; tool-to-chat (matchup, draft, league forecast, trade finder) uses prompt prefill so context is preserved.
- **Tool AIs coordinated**: Trade, waiver, rankings, draft, psychology, story, and media/clips each have defined routes and feature keys; dashboard widget resolver and tool discovery bridge expose them in one place.
- **Sport support**: SportAIProductResolver and sport-scope ensure all seven sports (NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer) are supported for AI product options and labels.
- **Deterministic-first**: Documented and exposed via AIConsistencyGuard; existing route-level enforcement unchanged.
- **No dead buttons**: Audit found no product-level AI links or buttons that point to wrong tabs or missing routes after the two tabId fixes.

---

## 7. Issues fixed

1. **AIFeaturesPanel “Draft War Room” tabId**  
   - **Before**: `tabId: 'draft'` (af-legacy has no `tab=draft`).  
   - **After**: `tabId: 'mock-draft'` so the card opens Draft War Room.

2. **AIFeaturesPanel “Waiver One Move” tabId**  
   - **Before**: `tabId: 'finder'` (opened Trade Review instead of Waiver Engine).  
   - **After**: `tabId: 'waiver'` so the card opens Waiver Engine.

3. **Centralized Chimmy entry**  
   - **Before**: Multiple components hardcoded `/af-legacy?tab=chat` or “Ask Chimmy” / “AI Chat”.  
   - **After**: SharedRightRail and TopBarUtilityResolver use `getPrimaryChimmyEntry()` from `lib/ai-product-layer` so the canonical Chimmy entry is single-sourced.

---

## 8. Final QA checklist

- [ ] **Chimmy entry**: Top bar, right rail, bracket nav, tool hub Chimmy link, and quick actions open the same AI chat surface (af-legacy?tab=chat or /chimmy where intended).
- [ ] **Dashboard AI cards**: AIFeaturesPanel Trade, Rivalry, Draft War Room, Waiver, Rankings, and Trade Finder cards navigate to the correct af-legacy tab (trade, transfer, mock-draft, waiver, rankings, finder).
- [ ] **Tool-to-Chimmy**: Matchup “Explain matchup,” League Forecast “Ask Chimmy,” Trade Finder “Open Chat with this prompt,” and draft bridge open chat with prompt pre-filled where implemented.
- [ ] **Tool hub**: Featured tools “Open” and Chimmy link work; sport/category filters work.
- [ ] **Standalone AI**: /chimmy, /waiver-ai, /social-clips, /clips, /tools-hub load and any primary CTAs work.
- [ ] **Sports**: All seven sports available where sport selectors exist (e.g. social clips, trade/waiver when sport-aware); no AI surface limited to a single sport unless by design.
- [ ] **Consistency**: Deterministic-first and fact-grounded behavior unchanged in trade, waiver, rankings, and Chimmy; AIConsistencyGuard reflects product rules.
- [ ] **Mobile**: AI entry points (top bar, right rail, dashboard cards, bracket tabs) remain usable on small viewports; no dead taps on audited elements.

---

## 9. Explanation of the master AI product integration layer

The **master AI product integration layer** is the product-level umbrella that makes AllFantasy’s AI feel like **one intelligence system** instead of scattered features. It does not replace the existing unified AI orchestration (model routing, consensus, fact guard) or the individual tool implementations (trade analyzer, waiver AI, rankings, draft, psychology, story creator, Chimmy, media/social). It **unifies entry points and discovery** so that:

1. **Chimmy is the face**: Every “Ask Chimmy” or “AI Chat” link uses the same canonical entry (UnifiedChimmyEntryResolver). Tool-to-chat flows (matchup, draft, league forecast, trade finder) use the same pattern (prompt prefill) so context is preserved.

2. **Tool AIs are specialized but coordinated**: Dashboard and tool discovery surfaces get a single list of AI widgets and links (AIDashboardWidgetResolver, AIToolDiscoveryBridge). Product routes (af-legacy tabs, standalone pages) are defined in one place (AIProductRouteResolver).

3. **Stories, rankings, analysis, and suggestions** all come from the same trusted system: the same consistency rules (AIConsistencyGuard), the same sport scope (SportAIProductResolver), and the same routing so that from any surface (dashboard, tool hub, top bar, bracket, league page) the user reaches the right AI tool or Chimmy with the right context.

4. **Responses stay grounded and consistent**: Deterministic-first and fact-grounded behavior remain enforced in the unified-ai and route layers; the product layer documents and exposes `shouldEnforceDeterministicFirst` and the consistency preamble for product and QA use.

The layer is **easy to extend**: new AI surfaces or new Chimmy entry points can import `AIProductLayer` or the resolvers and stay consistent with the rest of the product. Shell, dashboard, search, and tool hub integrations are preserved; the only behavioral fixes were the two AIFeaturesPanel tabIds and the switch to the centralized Chimmy entry in the right rail and top bar utilities.
