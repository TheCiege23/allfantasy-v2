# Mandatory Workflow Click Audit — Psychological Profiles & League Drama

This document audits every button click, dropdown, toggle, tab, link, modal action, step transition, preview update, submit action, success redirect, and error path for the **Psychological Profiles** and **League Drama** features. For each interactive element we verify: component and route, handler existence, state updates, backend/API wiring, and persisted/cached data reload. Fixes applied are noted.

---

## 1. Psychological Profiles (Behavior Profiles)

### 1.1 League Settings → Behavior Profiles Panel

| Element | Component / Route | Handler | State / API | Persisted Reload | Status |
|--------|-------------------|--------|-------------|------------------|--------|
| **Build behavior profiles** button | `BehaviorProfilesPanel.tsx` / Settings subtab | `buildAll()` | `setRunning(true)`, `setError(null)`, `setResult(null)`; POST `/api/leagues/[leagueId]/psychological-profiles/run-all` | On success: `setResult({ total, success, failed, results })`; **`router.refresh()`** so other tabs refetch when opened | **OK** (fixed) |
| Error display | Same | — | `setError(...)` when `!res.ok` or catch | — | OK |
| Result display | Same | — | `result` state shows processed/succeeded/failed and per-manager errors | — | OK |
| **Behavior Profiles** tab (Settings) | `LeagueSettingsTab.tsx` | `onClick={() => setActive('Behavior Profiles')}` | `active === 'Behavior Profiles'` → render `<BehaviorProfilesPanel leagueId={leagueId} />` | — | OK |

**API:** `POST /api/leagues/[leagueId]/psychological-profiles/run-all` — exists; returns `{ leagueId, total, success, failed, results }`. Handler: `run-all/route.ts`; iterates league teams, calls `runPsychologicalProfileEngine`, aggregates results.

**Fixes applied:** `router.refresh()` after successful run so ManagerStyleBadge and other consumers see new profiles when user navigates to Trade Finder or Draft.

---

### 1.2 Trade Finder → Partner Match (Manager Style Badge)

| Element | Component / Route | Handler | State / API | Persisted Reload | Status |
|--------|-------------------|--------|-------------|------------------|--------|
| Partner Match tab | `TradeFinderClient.tsx` | Tab click | Renders `<PartnerMatchView leagueId={selectedLeague?.id \|\| leagueId \|\| ''} />` | — | OK |
| Partner list load | `PartnerMatchView.tsx` | `useEffect` | GET `/api/trade-partner-match?leagueId=…` → `setMatches(data.matches)` | Refetches on mount when `leagueId` changes | OK |
| **ManagerStyleBadge** (per match) | `ManagerStyleBadge.tsx` | — | GET `/api/leagues/[leagueId]/psychological-profiles?managerId=…` in `useEffect` | Uses `match.externalId ?? match.teamId` as `managerId`; refetches when leagueId/managerId change | OK |
| Error / empty | PartnerMatchView | — | `setError`, empty state "No strong partner matches…" | — | OK |

**API:** `GET /api/leagues/[leagueId]/psychological-profiles?managerId=…` — exists; returns `{ leagueId, profile }` with `profile.profileLabels`. Handler: `psychological-profiles/route.ts` → `getProfileByLeagueAndManager`.

**Verification:** After building profiles in Settings, opening Trades → Partner Match mounts PartnerMatchView and each ManagerStyleBadge; each badge fetches on mount, so new profiles appear without full page reload. `router.refresh()` from Settings improves consistency.

---

### 1.3 Draft Tab (Manager Style Tip)

| Element | Component / Route | Handler | State / API | Status |
|--------|-------------------|--------|-------------|--------|
| Draft tab content | `DraftTab.tsx` / League → Draft | — | Renders draft board, queue, Draft AI, tip text | OK |
| Tip: "Manager style badges… build in Settings → Behavior Profiles" | DraftTab | — | Static text; no button/link | OK (informational only) |

No ManagerStyleBadge is rendered on Draft tab in current implementation; tip directs user to Settings. No dead buttons.

---

### 1.4 Other Psych Profile API Usage

| API | Used By | Verified |
|-----|---------|----------|
| GET `/api/leagues/[leagueId]/psychological-profiles` (list) | — | Available for future UI |
| GET `/api/leagues/[leagueId]/psychological-profiles/[profileId]` | — | Available |
| POST `/api/leagues/[leagueId]/psychological-profiles/explain` | `ManagerPsychology.tsx` | Separate flow; not in scope of this audit |

---

## 2. League Drama Engine

### 2.1 League Overview → League Drama Widget

| Element | Component / Route | Handler | State / API | Persisted Reload | Status |
|--------|-------------------|--------|-------------|------------------|--------|
| **Sport dropdown** | `LeagueDramaWidget.tsx` / Overview tab | `onChange={(e) => setSport(e.target.value)}` | `sport` state; `load` depends on `sport` → `useEffect([load])` refetches | GET `/api/leagues/[leagueId]/drama?sport=…&season=…&limit=10` | **OK** |
| **Season dropdown** | Same | `onChange` → `setSeason(...)` | `season` state; same `load` dependency | Same GET with `season` param | **OK** |
| **Refresh** button | Same | `runEngine()` | `setRunning(true)`; POST `/api/leagues/[leagueId]/drama/run` with `{ sport, season, replace: true }`; then `load()` | List refreshes after run | **OK** |
| **Reload** button | Same | `onClick={load}` | `setLoading(true)`, fetch list, `setEvents(...)`, `setLoading(false)` | Same GET; no-store | **OK** |
| **Story** (per event) | Same | `onClick={() => tellStory(e.id)}` | `setStoryEventId`, `setStoryNarrative(null)`, **`setStoryLoading(eventId)`**; POST tell-story; then **`setStoryNarrative`**, **`setStoryLoading(null)`** | Toggle: same click clears narrative | **OK** (fixed) |
| **View** (per event) | Same | `<Link href={/app/league/${leagueId}/drama/${e.id}}>` | Client navigation to detail page | — | **OK** |
| Loading state (initial) | Same | — | `loading` → "Loading storylines…" | — | OK |
| **Story loading state** | Same | — | **`storyEventId === e.id && storyLoading === e.id` → "Loading story…"** | — | **OK** (fixed) |
| Error / empty | Same | — | `setError`, "No storylines yet. Click Refresh…" | — | OK |

**API:** GET `/api/leagues/[leagueId]/drama` — query params sport, season, limit; returns `{ leagueId, events }`. POST `/api/leagues/[leagueId]/drama/run` — body sport?, season?, replace?; returns `{ leagueId, created, eventIds }`. POST `/api/leagues/[leagueId]/drama/tell-story` — body `{ eventId }`; returns `{ narrative, … }`.

**Fixes applied:** (1) `storyLoading` state so "Story" click shows "Loading story…" until narrative arrives; (2) clear `storyLoading` on toggle-off and in catch/finally.

---

### 2.2 League Settings → League Drama Panel

| Element | Component / Route | Handler | State / API | Persisted Reload | Status |
|--------|-------------------|--------|-------------|------------------|--------|
| **Run drama engine** button | `LeagueDramaPanel.tsx` / Settings subtab | `runEngine()` | `setRunning(true)`, `setError(null)`, `setResult(null)`; POST `/api/leagues/[leagueId]/drama/run` with `{ replace: true }` | On success: `setResult({ created, eventIds })`; **`router.refresh()`** | **OK** (fixed) |
| **League Drama** tab | `LeagueSettingsTab.tsx` | `onClick={() => setActive('League Drama')}` | Renders `<LeagueDramaPanel leagueId={leagueId} />` | — | OK |
| Error / result | LeagueDramaPanel | — | Error block; result "Created X storyline event(s)." | — | OK |

**API:** Same POST drama/run; when sport/season not in body, API uses `league.sport` and `league.season` from DB.

**Fixes applied:** `router.refresh()` after successful run so Overview tab’s widget gets fresh data when user navigates there.

---

### 2.3 Storyline Detail Page

| Element | Component / Route | Handler | State / API | Persisted Reload | Status |
|--------|-------------------|--------|-------------|------------------|--------|
| Page load | `/app/league/[leagueId]/drama/[eventId]/page.tsx` | `useEffect` | GET `/api/leagues/[leagueId]/drama/[eventId]` → `setEvent(data)` or `setError` | — | OK |
| **Back to league** | Same | `<Link href={/app/league/${leagueId}}>` | Navigate to league shell (default tab) | — | OK |
| **Tell me the story** button | Same | `tellStory()` | **`setNarrativeLoading(true)`**, `setNarrative(null)`; POST tell-story; **`setNarrative(...)`**; **`setNarrativeLoading(false)` in finally** | Narrative block below | **OK** (fixed) |
| Narrative block | Same | — | Renders when `narrative` is set | — | OK |
| Error / not found | Same | — | `!event` or `error` → back link + error message | — | OK |
| **Button disabled + label** | Same | — | **`disabled={narrativeLoading}`**, **"Loading…" when narrativeLoading** | — | **OK** (fixed) |

**API:** GET `/api/leagues/[leagueId]/drama/[eventId]` — returns single event. POST tell-story as above.

**Fixes applied:** (1) `narrativeLoading` state; (2) button disabled and label "Loading…" while loading; (3) `finally(() => setNarrativeLoading(false))`.

---

### 2.4 Overview Tab Wiring

| Element | Component / Route | Handler | State / API | Status |
|--------|-------------------|--------|-------------|--------|
| Overview tab | `app/league/[leagueId]/page.tsx` | Tab from LeagueShell | `renderTab('Overview')` → `<OverviewTab leagueId={leagueId} />` | OK |
| Overview data | `OverviewTab.tsx` | `useLeagueSectionData(leagueId, 'overview')` | `data?.sport`, `data?.season` passed to widget | OK |
| LeagueDramaWidget props | OverviewTab | — | `leagueId`, `sport`, `season`; widget defaults to NFL/current year when missing | OK |

---

## 3. Summary of Fixes Applied

| Issue | Location | Fix |
|-------|----------|-----|
| No loading state for "Story" in widget | LeagueDramaWidget | Added `storyLoading` state; show "Loading story…" while fetching; clear on success/error and on toggle-off |
| No loading state for "Tell me the story" on detail page | Drama event detail page | Added `narrativeLoading`; button disabled and shows "Loading…"; cleared in finally |
| Stale profiles after Build behavior profiles | BehaviorProfilesPanel | Call `router.refresh()` after successful run so other tabs refetch when opened |
| Stale drama list after Run drama engine in Settings | LeagueDramaPanel | Call `router.refresh()` after successful run so Overview widget refetches when user navigates to Overview |

---

## 4. Verification Checklist

- [x] Every button has a defined handler and correct API/submit wiring.
- [x] Dropdowns (sport, season) update state and trigger list reload.
- [x] Tabs (Settings subtabs, Overview) correctly switch content and pass leagueId where needed.
- [x] Links (View, Back to league) point to correct routes.
- [x] Success paths: result/created count shown; `router.refresh()` called so related views refetch.
- [x] Error paths: error state set and displayed; no unhandled rejections.
- [x] Loading states: initial list load, Story in widget, Tell me the story on detail page; buttons disabled where appropriate.
- [x] No dead buttons, stale UI, or mismatched preview vs saved state identified beyond the fixes above.

---

## 5. Reference: Routes and API Endpoints

| Route / API | Purpose |
|-------------|---------|
| `/app/league/[leagueId]` | League shell; tabs Overview, Settings, etc. |
| `/app/league/[leagueId]/drama/[eventId]` | Storyline detail page |
| POST `/api/leagues/[leagueId]/psychological-profiles/run-all` | Build all behavior profiles |
| GET `/api/leagues/[leagueId]/psychological-profiles?managerId=…` | Get one profile (for badge) |
| GET `/api/leagues/[leagueId]/drama?sport=&season=&limit=` | List drama events |
| POST `/api/leagues/[leagueId]/drama/run` | Run drama engine |
| GET `/api/leagues/[leagueId]/drama/[eventId]` | Get one drama event |
| POST `/api/leagues/[leagueId]/drama/tell-story` | Get narrative for event |

This completes the mandatory workflow click audit for the psychological profiles and league drama features.
