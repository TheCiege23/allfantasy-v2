# Prompt 43 — AI Commissioner + Reputation + Hall of Fame + Legacy Integration Layer + Full UI Click Audit

## 1. Integration architecture

### Overview

A **unified prestige and governance layer** sits above the AI Commissioner, Reputation System, Hall of Fame, and Legacy Score Engine. It provides:

- **Single entry point** for combined trust, legacy, and Hall of Fame context (for commissioners and AI).
- **Bridges** between systems so commissioner views can read trust/legacy, reputation views can reference HoF/legacy, and HoF views can reference legacy.
- **Sport-aware behavior** across NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, and Soccer via `lib/sport-scope.ts` and the new `SportPrestigeResolver`.

### Core modules (new)

| Module | Path | Purpose |
|--------|------|---------|
| **PrestigeGovernanceOrchestrator** | `lib/prestige-governance/PrestigeGovernanceOrchestrator.ts` | Builds full snapshot: commissioner context, sample manager summaries, AI context. Re-exports bridges and services. |
| **CommissionerTrustBridge** | `lib/prestige-governance/CommissionerTrustBridge.ts` | Builds commissioner-facing trust context: low-trust manager IDs, high commissioner-trust IDs, reputation/legacy/HoF coverage counts. |
| **HallOfFameLegacyBridge** | `lib/prestige-governance/HallOfFameLegacyBridge.ts` | Enriches Hall of Fame entries/moments with legacy score (entry with legacy, moment with related managers’ legacy). |
| **UnifiedPrestigeQueryService** | `lib/prestige-governance/UnifiedPrestigeQueryService.ts` | Unified manager/team summaries: reputation + legacy + Hall of Fame entry count/title. |
| **SportPrestigeResolver** | `lib/prestige-governance/SportPrestigeResolver.ts` | Sport normalization and labels for the prestige layer (delegates to `lib/sport-scope.ts`). |
| **AIPrestigeContextResolver** | `lib/prestige-governance/AIPrestigeContextResolver.ts` | Builds AI-facing context: governance summary, reputation summary, legacy summary, Hall of Fame summary, and a combined hint for prompts. |

### Data flow

- **Commissioner** → Commissioner tab uses Trust & legacy card links to Settings (Reputation), Legacy tab, Hall of Fame tab. Optional: `GET /api/leagues/[leagueId]/prestige-context` returns AI context and (if user is commissioner) commissioner trust context.
- **Reputation** → ReputationPanel lists managers, “AI explain” and “Legacy breakdown” per manager; links to Hall of Fame and Legacy tabs.
- **Hall of Fame** → Entry/moment cards link to detail pages; entry/moment detail pages link to “View legacy score” (when entity is MANAGER/TEAM); moment detail lists “Related managers · Legacy” links. HallOfFameSection footer links to Legacy tab and Settings → Reputation.
- **Legacy** → Legacy tab links to Hall of Fame and Settings (Reputation). Legacy breakdown page links to Legacy tab, Trust (Reputation), and Hall of Fame when entity is MANAGER.
- **AI** → Graph-insight route includes `prestigeHint` (from `buildAIPrestigeContext`) in the context blob so intelligence summaries can reference trust, legacy, and HoF where relevant.

---

## 2. Backend orchestration updates

- **New API**: `GET /api/leagues/[leagueId]/prestige-context`  
  - Auth: requires session.  
  - Returns: `aiContext` (governance, reputation, legacy, hallOfFame summaries + combinedHint).  
  - If user is commissioner: also returns `commissionerContext` (lowTrustManagerIds, highCommissionerTrustManagerIds, coverage counts).  
  - Query: `sport` (optional).

- **Graph-insight** (`POST /api/leagues/[leagueId]/graph-insight`):  
  - Now runs `buildAIPrestigeContext(leagueId, null)` in parallel with the relationship profile.  
  - Adds `prestigeHint` to the context blob and instructs the OpenAI system prompt to optionally connect to trust, legacy, or Hall of Fame when relevant.

- **Existing systems unchanged**: Reputation, Hall of Fame, Legacy, and Commissioner APIs and engines are not modified in behavior; they are consumed by the new layer and by existing UI.

---

## 3. UI integration points

| Surface | Integration |
|---------|-------------|
| **League page** | `?tab=...` supported; `initialTab` passed to LeagueShell so deep-links like `?tab=Legacy`, `?tab=Hall of Fame`, `?tab=Settings` open the correct tab. |
| **Commissioner tab** | New “Trust & legacy” card with links: Trust scores (Reputation) → `?tab=Settings`, Legacy leaderboard → `?tab=Legacy`, Hall of Fame → `?tab=Hall of Fame`. |
| **Settings → Reputation** | Links to Hall of Fame and Legacy tabs. “Explain a manager” dropdown + “AI explain” (POST reputation/explain) + “Legacy breakdown” link; evidence count shown when explaining. |
| **Legacy tab** | Links to Hall of Fame and Trust scores (Settings). Sport filter, Refresh, Run legacy engine, per-row “AI explain” and “Why is this score high?” (breakdown) unchanged. |
| **Legacy breakdown page** | “Back to league”, “Legacy tab”, and (for MANAGER) “Trust (Reputation)” and “Hall of Fame” links. |
| **Hall of Fame section** | Footer: “Legacy” tab link and “Settings → Reputation” link. |
| **Hall of Fame entry detail** | “View legacy score” button when `entityType` is MANAGER or TEAM (links to legacy breakdown). |
| **Hall of Fame moment detail** | “Related managers · Legacy” block with links to legacy breakdown per related manager. |
| **Partner match (Trades)** | Next to ReputationBadge, “Legacy” link to legacy breakdown for that manager. |

---

## 4. AI integration points

- **AIPrestigeContextResolver**: Builds `governanceSummary`, `reputationSummary`, `legacySummary`, `hallOfFameSummary`, and `combinedHint` for a league (optionally by sport). Used by:
  - `GET /api/leagues/[leagueId]/prestige-context` (for future commissioner/AI tools).
  - `POST /api/leagues/[leagueId]/graph-insight` (prestige hint included in context so AI can reference trust, legacy, and greatness).

- **Existing explain endpoints** unchanged: reputation/explain, legacy-score/explain, hall-of-fame/tell-story, rivalries/explain, psychological-profiles/explain, drama/tell-story. They can later be augmented to pull from `buildAIPrestigeContext` or `UnifiedPrestigeQueryService` when a combined narrative is desired.

---

## 5. Full UI click audit findings

### Verified working

- **Commissioner tab**: Invite, managers, waivers (run), lineup, operations, and new Trust & legacy links (Settings, Legacy, Hall of Fame) — handlers and routes exist; links use `?tab=...`.
- **Reputation (Settings)**: Run engine, “Explain a manager” (dropdown + AI explain + evidence count), “Legacy breakdown” link, Hall of Fame and Legacy tab links — APIs: reputation/run, reputation/explain, reputation/evidence, reputation GET; legacy breakdown page exists.
- **Hall of Fame**: Season/sport/category filters, Rebuild, Refresh, Sync moments, entry/moment cards with “Why inducted?” (detail) and “Tell me why this matters” (tell-story), footer links to Legacy and Settings → Reputation — entries/moments/tell-story/sync-moments APIs and detail pages exist.
- **Hall of Fame entry detail**: Back to league, “Tell me why this matters”, “View legacy score” (MANAGER/TEAM) — tell-story and legacy breakdown routes work.
- **Hall of Fame moment detail**: Back to league, “Tell me why this matters”, “Related managers · Legacy” links — moment API and legacy breakdown by manager work.
- **Legacy tab**: Sport filter, Refresh, Run legacy engine, per-row “Why is this score high?” (breakdown) and “AI explain”, header links to Hall of Fame and Settings — legacy-score, legacy-score/run, legacy-score/explain, legacy/breakdown page verified.
- **Legacy breakdown page**: Back to league, “Why is this score high?” (explain), and new Legacy tab, Trust (Reputation), Hall of Fame links for MANAGER — explain and routes verified.
- **PartnerMatchView**: ReputationBadge (GET reputation by managerId), new “Legacy” link to legacy breakdown — API and breakdown page verified.
- **League tab nav**: All shell tabs (including Hall of Fame, Legacy, Settings, Commissioner when commissioner) — renderTab covers every tab; no dead tab.

### Issues fixed

1. **Commissioner had no link to trust or legacy** — Added “Trust & legacy” card with links to Settings, Legacy, and Hall of Fame.
2. **Reputation panel had no link to evidence or Hall of Fame/Legacy** — Added Hall of Fame and Legacy tab links; added “Explain a manager” with AI explain and evidence count, and “Legacy breakdown” link.
3. **Legacy tab had no cross-link to reputation or HoF** — Added Hall of Fame and Trust scores (Settings) links in the header.
4. **Hall of Fame entry/moment detail had no legacy context** — Entry detail: “View legacy score” for MANAGER/TEAM; moment detail: “Related managers · Legacy” links.
5. **Legacy breakdown had no link to reputation or HoF** — Added “Legacy tab”, “Trust (Reputation)”, and “Hall of Fame” links (Hall of Fame and Trust for MANAGER only).
6. **Hall of Fame section had no clickable link to Legacy/Reputation** — Footer now includes “Legacy” and “Settings → Reputation” links.
7. **Partner cards had no link to legacy** — Added “Legacy” link next to ReputationBadge to legacy breakdown for that manager.
8. **No deep-link to a specific league tab** — League page now reads `?tab=...` and passes `initialTab` to LeagueShell so links like `?tab=Legacy` open the correct tab.
9. **Tab state vs URL out of sync** — LeagueShell now syncs `activeTab` from `initialTab` when the URL changes (deep-link from same page), and updates the URL via `router.replace(?tab=X)` when the user clicks a tab, so refresh/share shows the correct tab and deep-links work.
10. **Reputation list stale after Run engine** — ReputationPanel now refetches the reputations list after a successful run so the "Explain a manager" dropdown and selection stay in sync with persisted data.

### Not changed (by design)

- **ReputationBadge** remains display-only (no click to evidence in badge); evidence is reachable via Settings → Reputation → Explain a manager.
- **Back to league** from detail pages does not preserve tab (goes to league root); “Legacy tab” / “Hall of Fame” links provide explicit tab context where needed.
- **Sport/season/category filters**: Legacy and Hall of Fame filters already propagate to APIs; no change.

---

## 6. QA findings

- **Commissioner views can read trust and history context**: Commissioner tab links to Settings (Reputation), Legacy, and Hall of Fame; prestige-context API returns commissionerContext when user is commissioner (low/high trust IDs, coverage counts).
- **Reputation views connect to evidence and prestige**: ReputationPanel has “Explain a manager” (explain + evidence count) and links to Hall of Fame and Legacy; PartnerMatchView has Legacy link per partner.
- **Hall of Fame entries connect to legacy**: Entry detail “View legacy score” for MANAGER/TEAM; moment detail “Related managers · Legacy”; section footer links to Legacy and Reputation.
- **AI explanations can combine governance, trust, history, prestige**: Graph-insight receives `prestigeHint` and system prompt allows connecting to trust/legacy/HoF; other explain endpoints unchanged but can be extended to use AIPrestigeContextResolver.
- **Filters**: Sport/season/category remain consistent in Legacy and Hall of Fame; league-level sport is respected across the new layer (SportPrestigeResolver uses sport-scope).
- **Click paths**: All added or audited links and buttons were verified to point to existing routes and handlers; no dead buttons or broken drill-downs identified after fixes.

---

## 7. Issues fixed (summary)

1. Commissioner tab: added Trust & legacy card with links to Settings, Legacy, Hall of Fame.
2. Reputation panel: added Hall of Fame and Legacy links; added Explain a manager (dropdown, AI explain, evidence count, Legacy breakdown link).
3. Legacy tab: added Hall of Fame and Trust scores (Settings) links.
4. Hall of Fame entry detail: added “View legacy score” for MANAGER/TEAM.
5. Hall of Fame moment detail: added “Related managers · Legacy” links.
6. Legacy breakdown page: added Legacy tab, Trust (Reputation), and Hall of Fame links for MANAGER.
7. Hall of Fame section footer: added Legacy and Settings → Reputation links.
8. PartnerMatchView: added “Legacy” link per partner to legacy breakdown.
9. League page: added `?tab=` support and pass `initialTab` to LeagueShell for deep-links.
10. Graph-insight: integrated prestige context (prestigeHint) for AI summaries.
11. LeagueShell: sync `activeTab` from `initialTab` when URL changes; on tab click call `router.replace(?tab=X)` so URL and state stay in sync; no dead tab or wrong tab after deep-link.
12. ReputationPanel: after successful "Run reputation engine", call `fetchReputations()` so dropdown and cached list reload from API.

---

## 8. Mandatory workflow audit (every button, dropdown, link, tab, redirect, error path)

For each interactive element: component/route, handler, state update, API wiring, persisted/cached reload, and fix (if any).

| # | Element | Component / Route | Handler | State / redirect | API / backend | Cache / reload | Fix / note |
|---|--------|--------------------|---------|------------------|---------------|----------------|------------|
| 1 | Tab button (any) | LeagueTabNav, LeagueShell | `onChange(tab)` → `handleTabChange` | `setActiveTab(tab)`; `router.replace(?tab=X)` | — | URL reflects tab; `initialTab` from URL on load | Tab click updates URL so deep-link and refresh correct |
| 2 | Deep-link `?tab=Settings` etc. | App league page, LeagueShell | `useSearchParams().get('tab')` → `initialTab` | `useEffect` syncs `initialTab` → `activeTab` when `initialTab` changes | — | Same page nav opens correct tab | LeagueShell `useEffect(initialTab)` |
| 3 | Trust scores (Reputation) link | CommissionerTab | Next.js `Link` to `?tab=Settings` | Client nav; URL → Settings tab | — | — | OK |
| 4 | Legacy leaderboard link | CommissionerTab | `Link` to `?tab=Legacy` | Client nav; Legacy tab | — | — | OK |
| 5 | Hall of Fame link | CommissionerTab | `Link` to `?tab=Hall of Fame` | Client nav; Hall of Fame tab | — | — | OK |
| 6 | Regenerate invite | CommissionerTab | `regenerateInvite` | `setSaving('invite')`; on success `setInvite(...)`; toast | POST `/api/commissioner/leagues/[id]/invite` | Invite state from response | OK |
| 7 | Run waiver processing | CommissionerTab | `triggerWaiverRun` | `setRunningWaiver(true)`; on success `setWaiverPending([])`; toast | POST `/api/commissioner/leagues/[id]/waivers` | Pending claims cleared in state | OK |
| 8 | League operations buttons | CommissionerTab | `runOperation(action, value)` | `setSaving(action)`; toast success/error | POST `/api/commissioner/leagues/[id]/operations` | — | OK |
| 9 | Hall of Fame / Legacy links | ReputationPanel | `Link` to `?tab=Hall of Fame`, `?tab=Legacy` | Client nav | — | — | OK |
| 10 | Manager dropdown | ReputationPanel | `onChange` | `setSelectedManagerId`; clear explain narrative/evidence | — | — | OK |
| 11 | AI explain (manager) | ReputationPanel | `explainManager` | `setExplainLoading`; `setExplainNarrative`; `setEvidenceCount` | POST reputation/explain; GET reputation/evidence | — | OK |
| 12 | Legacy breakdown link | ReputationPanel | `<a href=.../legacy/breakdown?entityType=MANAGER&entityId=...>` | Navigate to breakdown page | GET breakdown on load | — | OK |
| 13 | Run reputation engine | ReputationPanel | `runEngine` | `setRunning`; on success `setResult`, `fetchReputations()`, `router.refresh()`; on error `setError` | POST `/api/leagues/[id]/reputation/run` | Reputations list refetched after success | Added `fetchReputations()` after success |
| 14 | Sport filter | LegacyTab | `onChange` → `setSportFilter` | Hook `useLegacyScoreLeaderboard({ sport })` refetches | GET `/api/leagues/[id]/legacy-score?sport=...` | `refresh()` from hook | OK |
| 15 | Refresh | LegacyTab | `onClick={() => refresh()}` | Hook `refresh()` | Same as load | Leaderboard refetched | OK |
| 16 | Run legacy engine | LegacyTab | `runEngine` | `setRunLoading(true)`; then `refresh()`; `setRunLoading(false)` | POST `/api/leagues/[id]/legacy-score/run` | Leaderboard refetched via `refresh()` | OK |
| 17 | Why is this score high? (link) | LegacyScoreCard | Next.js `Link` to `/app/league/[id]/legacy/breakdown?entityType=MANAGER&entityId=...` | Navigate to breakdown | GET breakdown on load | — | OK |
| 18 | AI explain (row) | LegacyScoreCard | `onExplain` → `explain(entityId)` | `setExplainId`; `setExplainNarrative`; `setExplainLoading`; toggle Hide | POST `/api/leagues/[id]/legacy-score/explain` | — | OK |
| 19 | Hall of Fame / Trust links | LegacyTab | `Link` to `?tab=Hall of Fame`, `?tab=Settings` | Client nav | — | — | OK |
| 20 | Back to league | Legacy breakdown page | `Link` to `/app/league/[id]` | Navigate to league root | — | — | OK |
| 21 | Legacy tab / Trust / Hall of Fame | Legacy breakdown page | `Link` to `?tab=Legacy|Settings|Hall of Fame` | Client nav | — | — | OK |
| 22 | Why is this score high? (button) | Legacy breakdown page | `tellStory` | `setNarrativeLoading`; `setNarrative` | POST `/api/leagues/[id]/legacy-score/explain` | — | OK |
| 23 | Season / sport / category dropdowns | HallOfFameSection | `onChange` → `setSeason` / `setSportFilter` / `setCategoryFilter` | Hooks depend on filters; refetch | GET entries, GET moments with params | useHallOfFame, useHallOfFameEntriesAndMoments | OK |
| 24 | Rebuild | HallOfFameSection | `onClick={() => rebuild()}` | From useHallOfFame | GET hall-of-fame (useHallOfFame) | rebuild() | OK |
| 25 | Refresh (Inductions & Moments) | HallOfFameSection | `onClick={() => refreshEntriesMoments()}` | Hook refresh | GET entries, GET moments | refreshEntriesMoments() | OK |
| 26 | Sync moments | HallOfFameSection | `syncMoments` | `setSyncMomentsLoading(true)`; then `refreshEntriesMoments()` | POST `/api/leagues/[id]/hall-of-fame/sync-moments` | Moments/entries refetched | OK |
| 27 | Why inducted? (entry) | HallOfFameEntryCard | `<a href=.../hall-of-fame/entries/[id]>` | Navigate to entry detail | GET entry on load | — | OK |
| 28 | Tell me why this matters (entry) | HallOfFameEntryCard | `onTellStory` | `setStoryId`; `setStoryNarrative`; `setStoryLoading` | POST tell-story | — | OK |
| 29 | Why inducted? (moment) | HallOfFameMomentCard | `<a href=.../hall-of-fame/moments/[id]>` | Navigate to moment detail | GET moment on load | — | OK |
| 30 | Tell me why this matters (moment) | HallOfFameMomentCard | `onTellStory` | Same as entry | POST tell-story | — | OK |
| 31 | Legacy / Settings links (footer) | HallOfFameSection | `<a href=...?tab=Legacy|Settings>` | Full nav to league with tab | — | — | OK |
| 32 | Back to league | HoF entry/moment detail | `Link` to `/app/league/[id]` | Navigate to league root | — | — | OK |
| 33 | Tell me why this matters | HoF entry/moment detail | `tellStory` | `setNarrativeLoading`; `setNarrative` | POST hall-of-fame/tell-story | — | OK |
| 34 | View legacy score | HoF entry detail | `<a href=.../legacy/breakdown?entityType=&entityId=>` | Navigate to breakdown | — | — | OK (MANAGER/TEAM only) |
| 35 | Related managers · Legacy | HoF moment detail | `<a href=.../legacy/breakdown?entityType=MANAGER&entityId=...>` per manager | Navigate to breakdown | — | — | OK |
| 36 | Legacy (partner card) | PartnerMatchView | Next.js `Link` to legacy breakdown for partner managerId | Navigate to breakdown | — | — | OK |
| 37 | Settings subtabs | LeagueSettingsTab | `onClick` → `setActive(tab)` | Active subtab state | — | — | OK |
| 38 | Error display (any) | Various | — | `setError` or result error; UI shows error block | — | — | OK |
| 39 | Loading states | Various | — | `setLoading` / `setRunLoading` etc.; buttons disabled; spinners | — | — | OK |

All handlers exist, state updates are correct, API wiring matches existing routes, and persisted/cached data reloads where required (reputation list after run engine; legacy leaderboard after run/refresh; HoF entries/moments after refresh/sync). Deep-link tab and URL-on-tab-click behavior fixed in LeagueShell.

---

## 9. Final QA checklist

- [ ] **Tab navigation**: Click each tab → URL updates to `?tab=X`; refresh keeps tab; open link with `?tab=Legacy` → Legacy tab active.
- [ ] **Commissioner**: Open Commissioner tab; click “Trust scores (Reputation)” → Settings tab opens; click “Legacy leaderboard” → Legacy tab; click “Hall of Fame” → Hall of Fame tab.
- [ ] **Settings → Reputation**: Click “Hall of Fame” and “Legacy leaderboard”; select a manager, click “AI explain” → narrative and evidence count; click “Legacy breakdown” → legacy breakdown page.
- [ ] **Legacy tab**: Click “Hall of Fame” and “Trust scores (Reputation)”; use sport filter and Refresh; click “Run legacy engine”; per row click “Why is this score high?” and “AI explain”; click “Why is this score high?” link → breakdown page.
- [ ] **Legacy breakdown**: Click “Back to league”, “Legacy tab”, “Trust (Reputation)”, “Hall of Fame” (for MANAGER); click “Why is this score high?” → narrative.
- [ ] **Hall of Fame**: Use season/sport/category filters; Rebuild, Refresh, Sync moments; click entry “Why inducted?” → entry detail; click “Tell me why this matters” → narrative; click “View legacy score” on entry detail (MANAGER/TEAM) → legacy breakdown. Moment: “Why inducted?” → moment detail; “Related managers · Legacy” → legacy breakdown. Footer: “Legacy” and “Settings → Reputation” open correct tab.
- [ ] **Trades / PartnerMatchView**: Each partner card shows ReputationBadge and “Legacy” link → legacy breakdown for that manager.
- [ ] **Deep-links**: Open `/app/league/[id]?tab=Legacy`, `?tab=Hall of Fame`, `?tab=Settings` → correct tab is active.
- [ ] **Prestige context API**: GET `/api/leagues/[leagueId]/prestige-context` (authenticated) returns aiContext; as commissioner, returns commissionerContext.
- [ ] **Graph insight**: POST graph-insight still returns metricsInterpretation, momentumStoryline, readableSummary; readable summary can reference trust/legacy/HoF when prestigeHint is present.
- [ ] **Sports**: All flows work with league sport; filters and resolvers use NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER per sport-scope.

---

## 10. Explanation of the unified prestige and governance layer

The **unified prestige and governance layer** gives the platform one place to:

- **Assist commissioners** with trust and history: who has low trust, who has high commissioner trust, and how many managers have reputation/legacy/HoF data.
- **Score and explain manager trust** via the existing Reputation engine, with UI that links to evidence (explain + evidence count) and to legacy and Hall of Fame.
- **Preserve historical greatness** via Hall of Fame entries and moments, with clear links to legacy scores for the same entities (managers/teams).
- **Measure long-term legacy** via the Legacy Score Engine, with links to reputation (trust) and Hall of Fame so users see how trust, governance, history, and greatness connect.
- **Expose everything consistently** on league, manager, and team surfaces: commissioner tab, Settings (Reputation), Legacy tab, Hall of Fame tab, legacy breakdown, HoF entry/moment details, and partner cards.

The layer is implemented as a small **orchestration library** (`lib/prestige-governance/`) that does not replace the existing engines. It calls into Reputation, Legacy, and Hall of Fame query services and builds:

- **CommissionerTrustBridge**: snapshot of trust alerts and coverage for commissioners.
- **HallOfFameLegacyBridge**: HoF entries/moments enriched with legacy data when applicable.
- **UnifiedPrestigeQueryService**: combined manager/team summaries (reputation + legacy + HoF).
- **AIPrestigeContextResolver**: text summaries and a combined hint for AI prompts.

All of this respects **sport context** (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER) so comparisons and filters stay valid. The result is a single, coherent “prestige and governance” story across commissioner tools, trust (reputation), history (Hall of Fame), and long-term performance (legacy), with every integrated click path wired end to end.
