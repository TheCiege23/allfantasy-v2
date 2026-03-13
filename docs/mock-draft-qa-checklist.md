# Mock Draft System – QA Checklist

Use this checklist to verify the Mock Draft flow, AI Assistant, and recap.

---

## 1. Mock setup flow

- [ ] **Sport** – Can select NFL, NBA, MLB; selection persists when starting mock.
- [ ] **League type** – Redraft and Dynasty options work; league prefill updates when “Use league settings” is selected.
- [ ] **Draft type** – Snake, Linear, Auction can be selected.
- [ ] **Number of teams** – 8, 10, 12, 14, 16 options work.
- [ ] **Scoring format** – Default, PPR, Half PPR, Standard, Superflex, TE Premium options work.
- [ ] **Timer** – No timer / 30 / 60 / 90 / 120 sec per pick can be set.
- [ ] **AI on/off** – Toggle enables or disables AI Draft Assistant for the mock.
- [ ] **Rounds** – 12, 15, 18, 20, 22 options work.
- [ ] **Use league (optional)** – When leagues are provided, selecting a league prefills teams, league type, scoring, sport; “Solo mock (no league)” clears league.
- [ ] **Start mock draft** – Button triggers `onStart` with full config; loading state shows when `loading` is true.

---

## 2. Mock engine

- [ ] **Pick progression** – `useMockDraftEngine`: `completedPickIndex` advances with `advance()`; does not exceed `totalPicks`.
- [ ] **Complete state** – When `completedPickIndex >= totalPicks`, `isComplete` is true.
- [ ] **Pause / resume** – `pause()` and `resume()` set `isPaused`; timer (if used) respects pause.
- [ ] **Reset** – `reset()` sets completed index to 0 and clears pause.
- [ ] **Save results** – `saveResults(results, draftId)` calls `POST /api/mock-draft/save`; returns `draftId` on success; optional `onSave` callback fires.
- [ ] **Save API** – With valid `draftId` and session, existing mock is updated; without `draftId`, new mock is created (with optional `leagueId` and `metadata`).

---

## 3. AI Draft Assistant

- [ ] **Panel renders** – AIDraftAssistantPanel shows “AI Draft Assistant” and “Suggestions only — not a guarantee.”
- [ ] **Best pick** – When `params` is set and request succeeds, top suggestion (player, position, team, reason) is shown.
- [ ] **Explanation** – `aiInsight` from API is displayed when present.
- [ ] **Compare 2–3 options** – Up to 3 options from API are listed in “Compare options.”
- [ ] **Positional run** – When `recentPicks` has 3+ of same position in last 5, a run warning appears.
- [ ] **Roster warning** – Warnings (e.g. no QB, RB/WR imbalance) appear when applicable from `rosterCounts`.
- [ ] **Loading / error** – Loading state and error message are shown; no guarantee wording remains visible.
- [ ] **Auto-fetch** – With `autoFetch` true, changing `params` (round/pick) triggers a new suggestion fetch.

---

## 4. Recap view

- [ ] **Full draft board** – MockDraftRecap shows all picks in a table (overall, round, pick, manager, player, pos, team); user’s rows are highlighted when `userManagerName` is set.
- [ ] **Team summary** – Each manager has a card with grade (letter + color), title, position counts, strengths, weaknesses, value added.
- [ ] **Your roster** – When `userManagerName` is set, “Your roster · Positional breakdown” lists QB/RB/WR/TE with player names.
- [ ] **AI recap placeholder** – “AI recap summary” section is present with placeholder text.
- [ ] **Back** – If `onBack` is provided, “Back to draft” button works.
- [ ] **Config in header** – When `config` is passed, sport, league type, draft type, and team count show in header.

---

## 5. Integration and APIs

- [ ] **Create API** – `POST /api/mock-draft/create` with body `{ sport, leagueType, draftType, aiEnabled, leagueId?, numTeams?, rounds?, timerSeconds?, scoringFormat? }` returns `draftId` and config; creates row with `metadata` and optional `leagueId` (after schema migration).
- [ ] **Save API** – `POST /api/mock-draft/save` with `{ draftId?, results, metadata?, leagueId?, rounds? }` updates existing or creates new mock; requires auth.
- [ ] **Existing simulate** – `POST /api/mock-draft/simulate` with `leagueId` still runs full simulation and saves to MockDraft (unchanged behavior).
- [ ] **Existing ai-pick** – `POST /api/mock-draft/ai-pick` with `action: 'dm-suggestion'` returns suggestions, aiInsight, rosterCounts (used by AIDraftAssistantPanel).

---

## 6. Schema and data

- [ ] **MockDraft.leagueId** – Optional (`String?`); create/save can omit or pass null for sandbox mocks.
- [ ] **MockDraft.metadata** – Stored as Json; contains sport, leagueType, draftType, numTeams, scoringFormat, timerSeconds, aiEnabled where provided.
- [ ] **Migration** – After changing schema, run `npx prisma migrate dev` (or deploy migration) so DB allows null `leagueId` and has `metadata` column.

---

## 7. Regression

- [ ] **Draft tab** – League draft tab still loads; DraftQueue and “Run Draft AI” work.
- [ ] **MockDraftSimulatorClient** – Existing simulator page still works with league selection and simulate; no required changes to existing flow.
- [ ] **ADP / rankings** – Existing mock-draft ADP and rankings APIs respond as before.

---

## Sign-off

- [ ] All critical paths above passed.
- [ ] Notes / bugs: _______________________________________________
