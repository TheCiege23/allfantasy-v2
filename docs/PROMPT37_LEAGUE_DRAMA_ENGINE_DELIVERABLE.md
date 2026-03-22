# Prompt 37 — League Drama Engine + Full UI Click Audit (Deliverable)

## 1. League Drama Engine Architecture

- **Purpose:** Generate structured, ranked storyline events first, then layer AI narrative summaries across dashboard/widget/detail surfaces.
- **Core modules integrated:** `LeagueDramaEngine`, `DramaEventDetector`, `DramaScoreCalculator`, `DramaTimelineBuilder`, `DramaQueryService`, `SportDramaResolver`, `AIDramaNarrativeAdapter`.
- **Pipeline:**
  - multi-source detection (matchups, standings/sims, rivalries, psych profiles, trades, dynasty projections, graph heat)
  - sport-aware scoring and ordering
  - idempotent event persistence + timeline record updates
  - API query and UI rendering for list/timeline/detail/story
- **Preservation:** League history, matchup history, rivalry engine, psychological profiles engine, hall-of-fame-related models, AI systems, league intelligence graph, and dashboard/tab flows remain intact.

---

## 2. Drama Detection and Scoring Logic

- **Drama types supported:**
  - `REVENGE_GAME`
  - `MAJOR_UPSET`
  - `RIVALRY_CLASH`
  - `WIN_STREAK`
  - `LOSING_STREAK`
  - `PLAYOFF_BUBBLE`
  - `TITLE_DEFENSE`
  - `TRADE_FALLOUT`
  - `REBUILD_PROGRESS`
  - `DYNASTY_SHIFT`
- **Detection inputs used:**
  - matchup outcomes and recency (`MatchupFact`)
  - standings and prior champion context (`SeasonResult`)
  - rivalry intensity (`RivalryQueryService`)
  - manager behavior heat (`ManagerBehaviorQueryService`)
  - trade volatility (`LeagueTradeHistory`/`LeagueTrade`)
  - playoff probability swings (`SeasonSimulationResult`)
  - dynasty shifts (`DynastyProjection`)
  - league graph drama centrality (`getDramaCentralTeams`)
- **Scoring (`DramaScoreCalculator`):**
  - base per drama type + intensity, related count, rivalry/upset/playoff/recency/behavior/graph multipliers
  - sport-aware cadence calibration via `SportDramaResolver` (upset multiplier and playoff cadence)
  - clamped to 0–100 for stable timeline ranking

---

## 3. Schema Additions

- Existing schema models used as-is:
  - `DramaEvent` (`dramaEventId` = `id`)
  - `DramaTimelineRecord` (`timelineId` = `id`)
- No additional schema migration required in this pass; implementation focused on detector/scoring richness and end-to-end UI wiring.

---

## 4. Timeline, Widget, and AI Integration Updates

- **API updates:**
  - `GET /api/leagues/[leagueId]/drama` supports sport/season/type/relatedManager/relatedTeam/relatedMatchup/minScore/pagination filters.
  - `GET /api/leagues/[leagueId]/drama/timeline` supports equivalent timeline filter/pagination controls.
  - `POST /api/leagues/[leagueId]/drama/run` now normalizes sport and robustly parses season.
  - `POST /api/leagues/[leagueId]/drama/tell-story` is AI-backed via `openaiChatText` with fallback.
- **UI updates:**
  - Added full drama dashboard page: `app/app/league/[leagueId]/drama/page.tsx`.
  - Upgraded `LeagueDramaWidget` with sport/season/type filters, timeline link, trade-context link, and story toggles.
  - Upgraded `LeagueDramaPanel` (Settings) with sport/season run controls and dashboard entry.
  - Upgraded detail page `app/app/league/[leagueId]/drama/[eventId]/page.tsx` with:
    - refresh/back/timeline controls
    - rivalry drill-down resolution (manager pair -> rivalry lookup -> rivalry detail route)
    - matchup context and trade fallout context links
  - Added matchup drama widget: `components/app/matchups/MatchupDramaWidget.tsx` and integrated in `MatchupDetailView`.

---

## 5. Full UI Click Audit Findings

Detailed matrix: `docs/PROMPT37_DRAMA_CLICK_AUDIT_MATRIX.md`

Key audited click paths now wired:

- drama dashboard cards and timeline pages
- storyline banner/widget actions in Overview
- matchup drama widget actions in matchup detail
- storyline detail page drill-downs (rivalry/matchup/trade context)
- sport/season/type filters and timeline pagination
- AI “Tell me the story” actions
- refresh/back/navigation and loading/error states

---

## 6. QA Findings

- `npm run -s typecheck` passes.
- Added and executed unit tests:
  - `__tests__/drama-score-calculator.test.ts`
  - `__tests__/sport-drama-resolver.test.ts`
- Added and executed click-audit e2e:
  - `e2e/league-drama-click-audit.spec.ts`
- Existing warning from dynamic sentry import remains non-blocking for test success.

---

## 7. Issues Fixed

- Added missing full drama dashboard/timeline UI route and pagination controls.
- Added matchup-level drama context widget and story actions.
- Added rivalry-linked storyline drill-down behavior from detail page.
- Added explicit trade fallout context links from drama surfaces.
- Hardened drama run API sport normalization and season parsing.
- Expanded click-path coverage so filters, story actions, and navigation are all auditable end to end.

---

## 8. Final QA Checklist

- [x] Drama events generate from multi-source signals.
- [x] Drama scores rank storylines sensibly by type/intensity context.
- [x] League homepage drama widget loads and refreshes current storylines.
- [x] Sport/season/type filters and timeline pagination work.
- [x] Rivalry and trade storyline drill-downs are wired.
- [x] AI story buttons use current drama event data.
- [x] Matchup drama widget click paths work.
- [ ] Manual live-data smoke test for NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.

---

## 9. Explanation of the League Drama Engine

The League Drama Engine is a deterministic event-generation system with AI narrative layering. It first detects concrete storyline events (revenge/upset/rivalry/streak/bubble/title/trade/rebuild/dynasty), scores and orders them for timeline consumption, and persists them for stable reload/filter behavior. UI surfaces then consume those structured records and optionally request AI storytelling on top.

This design keeps storylines explainable, auditable, and sport-aware while still enabling rich narrative output and future notification/media integration hooks.
