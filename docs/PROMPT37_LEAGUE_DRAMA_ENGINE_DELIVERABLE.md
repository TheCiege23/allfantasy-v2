# Prompt 37 — League Drama Engine + Full UI Click Audit (Deliverable)

## 1. League Drama Engine Architecture

- **Purpose:** Automatically generate and score league storylines (revenge games, upsets, rivalry clashes, streaks, playoff bubble, title defense, trade fallout, rebuild vs contender, etc.) and expose them for dashboard cards, timeline, and AI narrative.
- **Data flow:**
  - **Inputs:** League ID, sport, optional season. Engine uses matchup history (MatchupFact), league teams, and rivalry engine (listRivalries) to detect candidates.
  - **Detection:** `DramaEventDetector` produces candidates (RIVALRY_CLASH from top rivalries, MAJOR_UPSET from close matchups, REVENGE_GAME from recent matchups, PLAYOFF_BUBBLE, WIN_STREAK, LOSING_STREAK, TITLE_DEFENSE, TRADE_FALLOUT, REBUILD_PROGRESS, DYNASTY_SHIFT).
  - **Scoring:** `DramaScoreCalculator` assigns 0–100 score by drama type (base score), intensity factor, and related-entity count.
  - **Persistence:** `LeagueDramaEngine` creates `DramaEvent` rows and upserts `DramaTimelineRecord` (eventIds array) for the league/sport/season.
  - **Query:** `DramaQueryService` lists events (sport/season/type filters), gets one by id; `DramaTimelineBuilder` returns ordered timeline (from timeline record or by score/createdAt).
  - **Narrative:** `AIDramaNarrativeAdapter` builds a short narrative (template-based; can be wired to AI later) for “Tell me the story.”
- **Sport:** `SportDramaResolver` normalizes and labels NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- **Preserved:** Existing RivalryWeekCards (af-legacy, transfer preview), league intelligence graph (`getDramaCentralTeams`), and matchup/revenge logic in `lib/rivalry-engine.ts` are unchanged. The new engine persists structured DramaEvent records and powers the league Overview drama widget and Settings “League Drama” panel.

---

## 2. Drama Detection and Scoring Logic

- **Drama types:** REVENGE_GAME, MAJOR_UPSET, RIVALRY_CLASH, WIN_STREAK, LOSING_STREAK, PLAYOFF_BUBBLE, TITLE_DEFENSE, TRADE_FALLOUT, REBUILD_PROGRESS, DYNASTY_SHIFT.
- **Detection (DramaEventDetector):**
  - RIVALRY_CLASH: top 3 rivalries from RivalryQueryService; headline and summary from manager pair and tier; intensity from rivalry score.
  - MAJOR_UPSET: matchups with close margin (≤20); up to 2 events.
  - REVENGE_GAME: up to 3 recent matchups framed as rematch.
  - PLAYOFF_BUBBLE: one event when league has ≥4 teams.
  - WIN_STREAK, LOSING_STREAK, TITLE_DEFENSE, TRADE_FALLOUT, REBUILD_PROGRESS, DYNASTY_SHIFT: stub or light events (can be enriched from standings, trade history, psych profiles, playoff data later).
- **Scoring (DramaScoreCalculator):** Base score per type (e.g. MAJOR_UPSET 85, RIVALRY_CLASH 80, REVENGE_GAME 75). Multipliers: intensityFactor (up to 1.3), relatedCount (up to 1.1). Final score clamped 0–100.

---

## 3. Schema Additions

- **DramaEvent** (`drama_events`): id (cuid), leagueId, sport (VarChar 16), season (Int?), dramaType (VarChar 48), headline (VarChar 256), summary (Text?), relatedManagerIds (Json), relatedTeamIds (Json), relatedMatchupId (VarChar 64?), dramaScore (Float), createdAt. Indexes: (leagueId, sport), (leagueId, season), (dramaType, season).
- **DramaTimelineRecord** (`drama_timeline_records`): id (cuid), leagueId, sport, season (Int?), eventIds (Json), updatedAt. Unique (leagueId, sport, season). Index: leagueId.

Migration applied: `20260314212218_add_league_drama_engine`.

---

## 4. Timeline, Widget, and AI Integration Updates

- **API routes:**
  - GET `/api/leagues/[leagueId]/drama` — list events (sport, season, dramaType, limit).
  - GET `/api/leagues/[leagueId]/drama/timeline` — ordered timeline (sport, season, limit).
  - GET `/api/leagues/[leagueId]/drama/[eventId]` — single event.
  - POST `/api/leagues/[leagueId]/drama/run` — run engine (body: sport?, season?, replace?).
  - POST `/api/leagues/[leagueId]/drama/tell-story` — body `{ eventId }` → narrative (template or future AI).
- **League Overview:** `LeagueDramaWidget` shows storylines (headline, summary, type, score), **sport** and **season** dropdown filters (reload with new params), “Refresh” (run engine), “Reload” (refetch list), “Story” per event (tell-story inline), and **View** link to storyline detail page.
- **Storyline detail page:** `/app/league/[leagueId]/drama/[eventId]` — full event (headline, summary, type, score, related managers/teams), “Tell me the story” button, narrative block, and “Back to league” link.
- **League Settings:** New “League Drama” subtab with `LeagueDramaPanel` and “Run drama engine” button; displays created count after run.
- **Rivalry-linked drill-down:** Events include relatedManagerIds/relatedTeamIds; detail page shows them; future links to rivalry or matchup pages can be added.
- **AI narrative:** `AIDramaNarrativeAdapter.buildDramaNarrative` returns template narrative (headline + summary + involving + score). Can be replaced or extended with OpenAI/DeepSeek for “Tell me the story” without changing the API contract.

---

## 5. Full UI Click Audit Findings

| Location | Element | Handler | State / API | Status |
|----------|--------|---------|-------------|--------|
| **LeagueDramaWidget** (Overview) | Sport dropdown | setSport; load() | GET drama?sport=… | OK |
| **LeagueDramaWidget** | Season dropdown | setSeason; load() | GET drama?season=… | OK |
| **LeagueDramaWidget** | Refresh | runEngine() | POST drama/run, then load() | OK |
| **LeagueDramaWidget** | Reload | load() | GET drama?… | OK |
| **LeagueDramaWidget** | Story (per event) | tellStory(e.id) | POST tell-story; storyLoading state; toggles storyNarrative inline | OK |
| **LeagueDramaWidget** | View (per event) | Link | /app/league/[leagueId]/drama/[eventId] | OK |
| **LeagueDramaPanel** (Settings) | Run drama engine | runEngine() | POST drama/run; sets result/error | OK |
| **OverviewTab** | (drama widget) | — | LeagueDramaWidget receives leagueId, sport, season | OK |
| **League Settings** | League Drama tab | setActive('League Drama') | Renders LeagueDramaPanel | OK |
| **Storyline detail page** | Back to league | Link | /app/league/[leagueId] | OK |
| **Storyline detail page** | Tell me the story | tellStory() | POST tell-story; narrativeLoading state; button disabled + "Loading…"; sets narrative | OK |
| **GET /drama** | (client fetch) | load() in widget | Query params sport, season, limit | OK |
| **GET /drama/timeline** | (not yet in UI) | — | Available for timeline view | Documented |
| **GET /drama/[eventId]** | (client fetch) | detail page useEffect | Single event | OK |

**Notes:**

- Sport/season filters: list and timeline APIs support query params; widget uses overview data for sport/season when available. Settings run uses default sport/season from league or body.
- Timeline navigation: timeline API returns ordered events; a dedicated “Timeline” tab or view can consume it (not implemented in this pass).
- Rivalry drill-down: event payload includes relatedManagerIds/relatedTeamIds; UI can add links to rivalry or matchup when routes exist.
- Loading/error: Widget shows “Loading storylines…”, error state, and empty state with hint to run Refresh. Story button shows "Loading story…" while narrative fetches. Detail page "Tell me the story" shows loading state and disables button. Settings panel shows error and result after run. After successful run, Settings panels call router.refresh() so Overview (drama) and other tabs (profiles) refetch when opened.

---

## 6. QA Findings

- **Drama events:** Generated from rivalry list and matchup facts; replace=true clears and recreates for the league/sport/season. Manual check: run engine, then GET list or open Overview and confirm events and scores.
- **Drama scores:** Rank storylines by type and intensity; MAJOR_UPSET and RIVALRY_CLASH get higher base scores.
- **League homepage widget:** Overview tab loads drama list and shows cards with Story button; Refresh runs engine then reloads list.
- **Sport/season filters:** List and timeline accept sport and season; widget passes them when available from overview data.
- **Rivalry/trade drill-down:** Event data includes related ids; detail page shows them; View link from widget goes to detail page.
- **AI narrative:** “Tell me the story” uses template narrative; API and adapter are ready for AI replacement.
- **Click paths:** Sport/season filters, Refresh, Reload, Story, View, Back to league, and detail-page Tell me the story are wired; no dead buttons identified.

---

## 7. Issues Fixed

- **Schema:** DramaTimelineRecord has no FK to DramaEvent; eventIds stored as JSON. Removed erroneous relation.
- **Timeline lookup:** Replaced `findUnique` on compound unique (leagueId, sport, season) with `findFirst` to avoid issues with nullable season.
- **LeagueDramaEngine:** Timeline record update uses findFirst then update or create (no upsert with nullable season).
- **Settings subtabs:** Added “Behavior Profiles” and “League Drama” to SUBTABS so the tabs are selectable.
- **Detector:** Added LOSING_STREAK, TRADE_FALLOUT, REBUILD_PROGRESS, DYNASTY_SHIFT so all 10 drama types can be produced.
- **Widget:** Added sport/season dropdown filters and View link to storyline detail page.
- **Storyline detail page:** Added `/app/league/[leagueId]/drama/[eventId]` with back button, full event display, and Tell me the story.
- **Workflow audit:** Added loading state for "Story" in widget (`storyLoading`); added `narrativeLoading` and disabled state for "Tell me the story" on detail page; added `router.refresh()` after successful run in BehaviorProfilesPanel and LeagueDramaPanel. Full click audit: `docs/WORKFLOW_CLICK_AUDIT_DELIVERABLE.md`.

---

## 8. Final QA Checklist

- [ ] Run drama engine from Settings → League Drama; confirm “Created X storyline event(s).”
- [ ] Open league Overview; confirm drama widget shows events (or empty state with Refresh hint).
- [ ] Click Refresh in widget; confirm events appear after run.
- [ ] Click Story on an event; confirm narrative appears below the card.
- [ ] Click View on an event; confirm storyline detail page loads with back link and Tell me the story.
- [ ] Change sport/season in widget dropdowns; confirm list reloads with new params.
- [ ] Confirm existing RivalryWeekCards and league intelligence graph unchanged.
- [ ] Confirm no duplicate or orphaned events after multiple runs with replace=true.

---

## 9. Explanation of the League Drama Engine

The League Drama Engine is a narrative system that:

1. **Detects** storyline candidates from matchup results (close games, rematches), rivalry engine (top rivalries), and league size (playoff bubble), plus stub entries for win streak, title defense, and future trade/rebuild/dynasty signals.
2. **Scores** each event 0–100 using type-based base scores and optional intensity and related-entity multipliers so the most dramatic storylines rank higher.
3. **Stores** one `DramaEvent` per storyline (headline, summary, type, related managers/teams/matchup, score) and one `DramaTimelineRecord` per league/sport/season holding ordered event ids for timeline display.
4. **Exposes** list, timeline, single-event, run, and “tell story” (narrative) via API, and integrates into the league Overview (drama widget with Refresh, Reload, Story) and Settings (League Drama panel with Run drama engine).
5. **Supports** all required sports via sport normalization and sport-aware detection (e.g. season/cadence can be extended per sport later).

It is designed to layer optional AI-generated narrative summaries on top of structured events; the adapter currently returns a template narrative and can be wired to an LLM without changing the API. Rivalry engine, psychological profiles, and league intelligence graph remain separate; the drama engine consumes rivalry and matchup data and can be extended to consume profiles and graph outputs for TRADE_FALLOUT, REBUILD_PROGRESS, and DYNASTY_SHIFT.
