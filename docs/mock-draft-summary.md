# Mock Draft System – Summary of Capabilities

## Overview

The Mock Draft system and AI Draft Assistant for AllFantasy support:

- **All available sports** (NFL, NBA, MLB in setup; simulation and ADP are NFL-ready; other sports can be extended via config and APIs).
- **Multiple league types** (redraft, dynasty).
- **Multiple draft formats** (snake, linear, auction) via existing draft-engine and simulate flow.
- **Optional AI assistance** (suggestions only; no guarantee) via a dedicated panel and hook.
- **Solo mocks** today, with optional league linking; architecture allows future multiplayer (shared engine state and save API).

---

## Capabilities

### 1. Mock setup flow

- Users choose: **sport**, **league type**, **draft type**, **number of teams**, **scoring format**, **timer** (per pick), **AI on/off**, and **rounds**.
- Optional “Use league settings” prefills from a selected league (teams, dynasty/redraft, scoring, sport).
- Start mock draft passes full config to parent (e.g. create API + navigate to simulator or in-app draft room).

### 2. Mock engine

- **Simulated opponents** – Handled by existing `/api/mock-draft/simulate` (league-based) and full draft results.
- **Pick progression** – `useMockDraftEngine` provides `completedPickIndex`, `advance()`, `pause()`, `resume()`, `reset()`, and `isComplete` for step-through or timer-driven flow.
- **Available player board / recent picks / user queue** – Provided by existing MockDraftSimulatorClient and DraftQueue; new engine hook can drive “current pick” and completed count.
- **Pause/restart** – Engine supports pause and resume; reset clears state.
- **Save mock results** – `POST /api/mock-draft/save` saves or updates results (and optional metadata); `useMockDraftEngine.saveResults()` calls it and returns `draftId`.

### 3. AI Draft Assistant

- **Suggest best pick** – Uses existing `ai-pick` with `action: 'dm-suggestion'`; panel shows top suggestion.
- **Explain suggestion** – Displays `aiInsight` from API.
- **Compare 2–3 options** – Shows up to 3 options from the same API response.
- **Positional runs** – Client-side detection (e.g. “RB run: 4 of last 5 picks”) and display in panel.
- **Roster construction warnings** – Derived from API `rosterCounts` (e.g. no QB, RB/WR imbalance).
- **Disclaimer** – UI states “Suggestions only — not a guarantee. You decide.”

### 4. Mock recap

- **Full draft board** – Table of all picks (overall, round, pick, manager, player, position, team).
- **Team summary** – Per-team card with grade (letter), title, position counts, strengths, weaknesses, value added.
- **Roster strengths / positional grades** – User’s roster broken down by position with player names.
- **AI recap summary** – Placeholder section for future model-generated recap.

---

## File List ([NEW] / [UPDATED])

| Path | Label |
|------|--------|
| `docs/mock-draft-audit.md` | [NEW] |
| `docs/mock-draft-qa-checklist.md` | [NEW] |
| `docs/mock-draft-summary.md` | [NEW] |
| `lib/mock-draft/types.ts` | [NEW] |
| `components/mock-draft/MockDraftSetup.tsx` | [NEW] |
| `components/mock-draft/AIDraftAssistantPanel.tsx` | [NEW] |
| `components/mock-draft/MockDraftRecap.tsx` | [NEW] |
| `hooks/useMockDraftEngine.ts` | [NEW] |
| `hooks/useAIDraftAssistant.ts` | [NEW] |
| `app/api/mock-draft/save/route.ts` | [NEW] |
| `app/api/mock-draft/create/route.ts` | [UPDATED] |
| `prisma/schema.prisma` (MockDraft: optional leagueId, metadata) | [UPDATED] |

---

## Preserved / Unchanged

- **APIs:** `simulate`, `adp`, `ai-pick`, `predict-board`, `needs`, `retrospective`, and other mock-draft routes unchanged; extended only via optional params or new routes (create metadata, save).
- **Player pool & rankings:** Existing ADP and rankings services; sport/format extension points in setup and metadata.
- **Draft engine:** `lib/mock-draft/draft-engine.ts` and validation/auction helpers unchanged.
- **Draft queue:** `components/app/draft/DraftQueue.tsx` and `useDraftQueue.ts` unchanged; reusable in mock and real draft.
- **Legacy UI:** `MockDraftSimulatorClient` and `app/mock-draft-simulator/page.tsx` unchanged; new setup/recap/assistant can be wired in by using the new components and hooks.

---

## Next steps (optional)

1. **Run Prisma migration** for `MockDraft.leagueId` optional and `MockDraft.metadata` column.
2. **Wire MockDraftSetup** into `app/mock-draft-simulator/page.tsx` (e.g. show setup first, then pass config to client and show recap when draft is complete).
3. **Add “Recap” button** in MockDraftSimulatorClient when `isComplete` that opens or navigates to MockDraftRecap with results and user manager name.
4. **Multi-sport simulate** – When sport is NBA/MLB, extend ADP and simulate (or add stub) so mock board and AI use sport-specific data where available.
