# PROMPT 335 — Guillotine QA + Workflow Validation

## 1. Issue list by severity

### High (fixed in this pass)

| # | Issue | Fix |
|---|--------|-----|
| 1 | **League create from wizard:** When user selects "Guillotine" league type, wizard sends `league_type: 'guillotine'` but API only checked `leagueVariant`. So `leagueVariant` stayed e.g. STANDARD and `avatarUrl` was not set. | Treat `league_type === 'guillotine'` as guillotine; set `leagueVariant: 'guillotine'` and `avatarUrl: '/guillotine/Guillotine.png'`. |
| 2 | **GuillotineLeagueConfig not created on create:** New guillotine leagues had no config row, so `getGuillotineConfig` returned null and summary/elimination could fail. | After creating league, when `isGuillotine`, call `upsertGuillotineConfig(league.id, {})`. |
| 3 | **Chopped roster guard not integrated:** `isRosterChopped` existed but was never called in waiver claim or roster save. Eliminated teams could still submit claims and change roster. | In `createClaim` (claim-service), check `isRosterChopped` and throw if true. In roster save route, when `leagueId` + `rosterId` present, return 403 if chopped. In claims API route, catch "eliminated" and return 403. |

### Medium (addressed or documented)

| # | Issue | Status |
|---|--------|--------|
| 4 | **Draft-results isGuillotine:** If league was created with guillotine only in `settings.league_type` (e.g. legacy), post-draft intro would not show. | Fallback: also treat `settings.league_type === 'guillotine'` as guillotine on draft-results page. |
| 5 | **Entitlement:** `ALLOW_WHEN_ENTITLEMENTS_OPEN = true` in guillotine AI route so API never 403s. When subscription is enforced, must set to `false` and implement server-side entitlement. | Documented in PROMPT334 deliverable and in route comment. |

### Low (no code change)

| # | Issue | Notes |
|---|--------|------|
| 6 | First-entry modal replay: Replay restarts video; when that video ends we mark seen and close. | Acceptable; spec said "replay works." |
| 7 | Chop animation unmount before completion. | Low impact; component cleans up. |

---

## 2. File-by-file fix plan (applied)

| File | Change |
|------|--------|
| `app/api/league/create/route.ts` | `isGuillotine` from `leagueVariant` OR `league_type`; when guillotine set `leagueVariant: 'guillotine'`, `avatarUrl`; after create call `upsertGuillotineConfig(league.id, {})`. |
| `lib/waiver-wire/claim-service.ts` | Import `isRosterChopped`; after roster exists check, if `isRosterChopped(leagueId, rosterId)` throw "This team has been eliminated and cannot submit waiver claims". |
| `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` | In catch, if message includes "eliminated" return 403 with message. |
| `app/api/leagues/roster/save/route.ts` | Import `isRosterChopped`; when body has `leagueId` and `rosterId`, if chopped return 403. |
| `app/app/league/[leagueId]/draft-results/page.tsx` | Read `league.settings`; `isGuillotine` = leagueVariant === 'guillotine' OR `settings.league_type === 'guillotine'`. |

---

## 3. Final QA checklist

- [ ] **Create guillotine league** — Wizard: select sport → league type Guillotine → complete wizard; league is created with `leagueVariant: 'guillotine'`, `avatarUrl: '/guillotine/Guillotine.png'`, and a `GuillotineLeagueConfig` row exists.
- [ ] **Default guillotine image** — League list or league header shows `/guillotine/Guillotine.png` for the new league.
- [ ] **Join league** — Invite/join flow works; new member can open league.
- [ ] **First-entry video** — First time opening the guillotine league, modal with Guillotine.mp4 appears; Skip closes and marks seen; Replay restarts video; after refresh modal does not show again.
- [ ] **Configure roster/scoring/elimination** — Commissioner can change settings; guillotine config (elimination start/end, teams per chop, correction window, tiebreakers) is persisted.
- [ ] **Run draft** — Draft runs; slot order is stored for tiebreaker.
- [ ] **AI draft rankings after draft** — Draft results page shows manager rankings and grades.
- [ ] **Guillotine League Intro after draft rankings** — For guillotine leagues, intro video section appears after rankings and before draft board recap; Continue dismisses and marks seen.
- [ ] **Score week** — Period scores can be written (e.g. `savePeriodScores` or ingestion job); `GuillotinePeriodScore` rows exist.
- [ ] **Chop Zone and Danger tier** — Summary/danger API returns chop_zone, danger, safe; UI shows them.
- [ ] **Finalize week after correction window** — With `correctionWindow: after_stat_corrections` and `periodEndedAt` + delay, `runElimination` runs and returns chopped roster(s).
- [ ] **Eliminate lowest-scoring team** — Lowest period score (and tiebreakers) determines chop; only that roster is marked chopped.
- [ ] **Chop animation** — Animation triggers (e.g. from chopped history "Replay"); no app freeze; degrades with reduced motion.
- [ ] **Lock chopped team** — Chopped roster: lineup/roster save returns 403; waiver claim create returns 403 with "eliminated" message.
- [ ] **Release roster to waivers** — After chop, `releaseChoppedRosters` clears playerData; `roster_released` event logged; released players available in waiver pool.
- [ ] **Chat/history/standings** — Chop event posted to league chat; chopped history shows event; survival standings exclude chopped rosters.
- [ ] **AI waiver guidance** — Guillotine AI panel type "Waiver aftermath" returns explanation; deterministic data (released players) shown first.
- [ ] **Continue until one remains** — Config `eliminationEndWeek` respected; no chop after that week.
- [ ] **Image applied** — League creation (wizard with guillotine type) sets avatarUrl.
- [ ] **First-entry video logic** — Only on first entry (localStorage key per leagueId); skip/replay work.
- [ ] **Intro video after draft** — Sequence: rankings → intro section → recap; no duplicate intro.
- [ ] **Elimination math** — Deterministic; tiebreakers applied in order; no AI in elimination.
- [ ] **Correction window** — `isPastCorrectionCutoff` gates `runElimination`; before cutoff no chop.
- [ ] **Danger line** — `getDangerTiers` uses danger margin; chop_zone = lowest projected.
- [ ] **Animations** — Chop animation runs; can be replayed from history.
- [ ] **AI does not override deterministic** — AI route returns `deterministic` + `explanation`; prompts forbid inventing outcomes.
- [ ] **Mobile / desktop UX** — Guillotine home and modals responsive; no dead buttons.
- [ ] **No dead buttons** — All CTAs (Skip, Replay, Continue, Get AI strategy, Replay animation) work.
- [ ] **No broken routes** — `/app/league/[id]`, `/app/league/[id]/draft-results`, `/api/leagues/[id]`, `/api/leagues/[id]/guillotine/summary`, `/api/leagues/[id]/guillotine/ai` return expected status.
- [ ] **No stale state** — After chop, standings and danger refresh from API; no duplicate chop events from double-run.
- [ ] **No duplicate elimination** — `runElimination` is idempotent for same week (chopped roster already has choppedAt).
- [ ] **No media replay bugs** — First-entry and post-draft videos play; controls work; replay/continue behave.
- [ ] **Entitlement gating** — When subscription enforced, premium Guillotine AI button disabled and API returns 403 without access.

---

## 4. Manual testing checklist

1. **Create flow**  
   - Create league via wizard, select Guillotine.  
   - Confirm league has guillotine image and config.  
   - Open league → first-entry video shows once; skip works; revisit → no video.

2. **Draft flow**  
   - Complete draft for guillotine league.  
   - Open draft results → see rankings then Guillotine League Intro section.  
   - Continue → section gone on next visit.

3. **Elimination flow**  
   - Seed period scores for a week; set correction window passed.  
   - Run `runElimination` (job or API).  
   - Confirm one roster marked chopped, roster_released event, chat message.  
   - Confirm chopped roster cannot submit waiver claim (403).  
   - Confirm chopped roster cannot save roster/lineup (403 when rosterId + leagueId sent).

4. **UI flow**  
   - Guillotine home: Survival Board, Chopped History, Waiver, AI panel, Settings.  
   - Chop animation from history replay.  
   - Intelligence tab: Guillotine AI panel for guillotine league only.  
   - Non-guillotine league: no first-entry modal, no guillotine home, no guillotine AI panel.

5. **Edge cases**  
   - Tiebreaker: two rosters same period points; confirm tiebreak order (season pts → previous period → draft slot).  
   - Commissioner override: pass `commissionerChoppedRosterIds`; confirm that roster chopped and audit.

---

## 5. Automated test recommendations

If a test framework exists (e.g. Jest, Vitest):

1. **Unit**  
   - `resolveTiebreak`: given candidates and order, assert chopped list and step used.  
   - `isPastCorrectionCutoff`: immediate, after_stat_corrections with hours, custom cutoff.  
   - `getSurvivalStandings`: exclude chopped; sort by season points.

2. **Integration**  
   - Create league with `league_type: 'guillotine'` via API; assert `leagueVariant`, `avatarUrl`, and `GuillotineLeagueConfig` row.  
   - `runElimination` with mocked period scores; assert `GuillotineRosterState` updated, event log, and `releaseChoppedRosters` called (or mock).  
   - `createClaim` with chopped rosterId; assert thrown error or 403.  
   - Roster save with chopped rosterId; assert 403.

3. **E2E (if Playwright/Cypress)**  
   - Create guillotine league → open league → first-entry modal → skip.  
   - Draft results page for guillotine league → intro section visible → continue.  
   - Guillotine home loads; Survival Board and Chopped History sections present.

---

## 6. Files modified (full merged fixes)

| File | Status |
|------|--------|
| `app/api/league/create/route.ts` | [UPDATED] — guillotine from league_type, avatarUrl, upsertGuillotineConfig |
| `lib/waiver-wire/claim-service.ts` | [UPDATED] — isRosterChopped guard |
| `app/api/waiver-wire/leagues/[leagueId]/claims/route.ts` | [UPDATED] — 403 on eliminated message |
| `app/api/leagues/roster/save/route.ts` | [UPDATED] — isRosterChopped guard, 403 when chopped |
| `app/app/league/[leagueId]/draft-results/page.tsx` | [UPDATED] — isGuillotine from settings.league_type fallback |
| `docs/PROMPT335_GUILLOTINE_QA_VALIDATION.md` | [NEW] — This deliverable |
