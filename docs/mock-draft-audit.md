# Mock Draft System Audit – AllFantasy

**Date:** 2025-03-12  
**Scope:** Mock draft experience, AI Draft Assistant, recap, and related APIs.

---

## 1. Current State

### 1.1 Mock draft entry points

| Location | Purpose |
|----------|--------|
| `app/mock-draft-simulator/page.tsx` | Main mock draft simulator page; loads user leagues, renders `MockDraftSimulatorClient`. |
| `components/MockDraftSimulatorClient.tsx` | Large client (~2900 lines): league selector, simulate, live playback, board, ADP, AI suggestions, trade proposals, predict-board, snipe radar, etc. |
| `components/home/SmartToolsSection.tsx` | Homepage “Start mock draft” CTA. |
| `app/api/mock-draft/create/route.ts` | Creates a `MockDraft` row; currently sends `leagueId: null` (schema requires `leagueId` today – see 2.1). |

### 1.2 APIs

| Endpoint | Role |
|----------|------|
| `app/api/mock-draft/create/route.ts` | Lightweight create; returns `draftId` + config (sport, leagueType, draftType, aiEnabled). Body supports sandbox; DB currently requires `leagueId`. |
| `app/api/mock-draft/simulate/route.ts` | Full mock simulation: requires `leagueId`, loads league + teams, fetches ADP, calls OpenAI for full draft, validates, saves to `MockDraft`, returns `draftResults` + `draftId` + proposals. |
| `app/api/mock-draft/adp/route.ts` | ADP data: `type` (redraft/dynasty), `pool` (all/vet/rookie/combined), FFC formats, multi-platform. NFL-focused. |
| `app/api/mock-draft/ai-pick/route.ts` | AI pick suggestions: `action` (e.g. `dm-suggestion`, `predict-next`); uses roster, available board, round, scoring; returns suggestions + reasoning. |
| `app/api/mock-draft/predict-board/route.ts` | Board forecast / volatility. |
| `app/api/mock-draft/needs/route.ts` | Team needs. |
| `app/api/mock-draft/retrospective/route.ts` | Post-draft retrospective. |
| Others | snipe-radar, trade-optimizer, board-drift, pick-path, manager-dna, share, trade-*, league-import, update-weekly. |

### 1.3 Player pool & rankings

- **NFL:** `getLiveADP`, `fetchFFCADP`, `lib/adp-data`, `lib/multi-platform-adp`, `resolveSleeperIds` (Sleeper). ADP and rankings are NFL-oriented.
- **Multi-sport:** `League.sport` is `LeagueSport` (NFL, NBA, MLB). `SportsPlayer` and related data support multiple sports; mock-draft ADP/simulate flow is NFL-only today.
- **Preserve:** Keep existing ADP and rankings APIs; extend for multi-sport where needed (e.g. sport param on ADP and simulate).

### 1.4 Draft engine & validation

- **`lib/mock-draft/draft-engine.ts`:** `DraftType` (snake/linear/auction), `getPickSlot`, `validateUniquePlayer`, `validateRosterConstraints`, `summarizeDraftValidation`, auction helpers. **Keep and reuse.** |
| **`lib/mock-draft/adp-realtime-adjuster.ts`** | Used by simulate. **Keep.** |
| **`lib/mock-draft/board-drift.ts`** | Board drift. **Keep.** |

### 1.5 Draft tab & queue

- **`components/app/tabs/DraftTab.tsx`:** Uses `useLeagueSectionData(leagueId, 'draft')`, `DraftQueue`, `useDraftQueue`, “Run Draft AI” to `/api/app/league/:id/draft/recommend-ai`, `LegacyAIPanel` (draft-war-room).
- **`components/app/draft/DraftQueue.tsx`** + **`useDraftQueue.ts`:** Queue state (add/remove/reorder). Used in Draft tab and intended for mock draft board. **Preserve;** reuse in new mock flow.

### 1.6 Data model

- **Prisma `MockDraft`:** `id`, `shareId`, `leagueId` (required), `userId`, `rounds`, `results` (Json), `proposals` (Json), timestamps. No `metadata` field today; create route passes sport/leagueType/draftType/aiEnabled in code but does not persist (and create fails if DB enforces `leagueId`).

---

## 2. Gaps and recommendations

### 2.1 Schema

- **`MockDraft.leagueId`:** Required today; create route uses `leagueId: null` for sandbox. **Recommendation:** Make `leagueId` optional (`String?`) and `league` relation optional so sandbox mocks can be stored without a league.
- **`MockDraft.metadata`:** Add `metadata Json?` to store: sport, leagueType, draftType, numTeams, scoring, timerSeconds, aiEnabled, and any future options. Allows recap and filters to work without a league.

### 2.2 Mock setup flow

- **Gap:** No dedicated setup step for: sport, league type, draft type, number of teams, scoring format, timer, AI on/off. Simulator currently relies on “select a league” and scattered toggles.
- **Recommendation:** Add a **Mock Draft Setup** step (or page) that collects these options and passes them into create/simulate. For league-based mocks, prefill from league where possible.

### 2.3 Mock engine

- **Existing:** `MockDraftSimulatorClient` holds draft state, live playback (play/pause/timer), “completed picks” progression, best-available board, recent picks, and trade proposals. Simulate API saves to `MockDraft`.
- **Gaps:** Explicit “pause/restart” semantics and “save current results” (e.g. mid-draft) are not clearly exposed. No shared “engine” abstraction for reuse (e.g. future multiplayer).
- **Recommendation:** Add a small **mock engine** (state machine or hook) that: advances pick index, supports pause/resume, and calls save API. Keep existing client behavior; optionally refactor to consume this engine later for multiplayer.

### 2.4 AI Draft Assistant

- **Existing:** `ai-pick` with `dm-suggestion` and `predict-next`; client shows live suggestion and predictions. Legacy “Draft War Room” and “Scout recommendation” in `MockDraftSimulatorClient`.
- **Gaps:** No dedicated “AI Draft Assistant” panel that: suggests best pick, explains, compares 2–3 options, identifies positional runs, warns on roster construction, and consistently shows “suggestions only” disclaimer.
- **Recommendation:** Add **AIDraftAssistantPanel** (and optional hook) that calls existing (or extended) ai-pick API and displays: top suggestion + explanation, compare 2–3, positional-run alert, roster warnings, and a clear “AI suggests only; not a guarantee” message.

### 2.5 Mock recap

- **Existing:** Client has `calculateTeamGrade`, draft board, and team rosters in UI; no dedicated “recap” view after mock ends.
- **Gap:** No single recap screen with: full draft board, team summary, roster strengths, positional grades, and AI recap summary.
- **Recommendation:** Add **MockDraftRecap** view (component or page) shown when mock is complete: full board, per-team summary, strengths/weaknesses, positional grades, and an AI recap summary placeholder (for future model-generated summary).

### 2.6 Multi-sport and formats

- **Sport:** League has `sport` (NFL/NBA/MLB). ADP and simulate are NFL-only. To support “all available sports,” extend ADP and simulate to accept `sport` and use sport-specific player pools/rankings (or stub) where data exists.
- **Draft type:** draft-engine already supports snake/linear/auction. Expose in setup and pass through simulate.
- **League type:** Redraft vs dynasty is already used (league.isDynasty, ADP type). Expose in setup.

---

## 3. What to preserve

- **APIs:** All existing mock-draft API routes; extend with optional params (e.g. sport, config-only) rather than replace.
- **Player pool & rankings:** Current ADP and rankings services; add sport/format params where needed.
- **Draft engine & validation:** `lib/mock-draft/draft-engine.ts`, `adp-realtime-adjuster`, validation and auction helpers.
- **Draft queue:** `DraftQueue`, `useDraftQueue` for user queue in mock and real draft.
- **Legacy UI:** `MockDraftSimulatorClient` and league-based flow can remain; new setup/recap/assistant can wrap or sit alongside for a unified “Mock Draft” experience.

---

## 4. File map (existing, relevant)

| File | Role |
|------|------|
| `app/mock-draft-simulator/page.tsx` | Simulator page |
| `components/MockDraftSimulatorClient.tsx` | Main client UI |
| `app/api/mock-draft/create/route.ts` | Create mock (sandbox) |
| `app/api/mock-draft/simulate/route.ts` | Run simulation (league-based) |
| `app/api/mock-draft/adp/route.ts` | ADP |
| `app/api/mock-draft/ai-pick/route.ts` | AI suggestions |
| `lib/mock-draft/draft-engine.ts` | Draft rules & validation |
| `lib/mock-draft/adp-realtime-adjuster.ts` | ADP adjustments |
| `components/app/draft/DraftQueue.tsx` | Queue UI |
| `components/app/draft/useDraftQueue.ts` | Queue state |
| `components/app/tabs/DraftTab.tsx` | League draft tab |

---

## 5. Summary

- **Keep:** All existing mock-draft APIs, draft-engine, ADP/rankings, queue, and current simulator client.
- **Add:** Optional `leagueId` + `metadata` on `MockDraft`; dedicated mock setup flow; optional mock engine (pause/restart/save); AI Draft Assistant panel with disclaimer; mock recap view with board, team summary, grades, and AI recap placeholder.
- **Extend:** Simulate and ADP for optional sport/config so mock experience can support all sports and multiple league/draft formats over time.
