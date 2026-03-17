# PROMPT 198 — Post-Draft Automation and AI Recap Deliverable

## Overview

Post-draft processing is split into **deterministic automation** (no AI) and **optional AI recap** layers. All deterministic tasks run from completed draft session data; AI is only used when the user requests a narrative recap.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Deterministic Post-Draft Tasks

| Task | Location | Notes |
|------|----------|--------|
| **Finalize rosters** | `lib/live-draft-engine/RosterAssignmentService.ts` → `finalizeRosterAssignments(leagueId)` | Called when draft completes (e.g. from draft controls). Idempotent; `ensurePostDraftFinalized(leagueId)` in post-draft service calls it only when status is completed. |
| **Draft summary** | `lib/post-draft/PostDraftAutomationService.ts` → `buildPostDraftSummary(leagueId)` | Returns `PostDraftSummary` (rounds, teamCount, totalPicks, pickCount, byPosition) only when session status is `completed`. |
| **Pick log** | Same; `PostDraftSummary.pickLog` | Ordered list of picks with overall, round, slot, rosterId, displayName, playerName, position, team, amount (auction), pickLabel. |
| **Team-by-team results** | Same; `PostDraftSummary.teamResults` | Per-roster pick count, picks list, and for auction `totalSpent`. |
| **Value/reach** | Same; `PostDraftSummary.valueReach` | Earliest overall pick per position; optional `firstPickBy` (displayName). |
| **Budget summary (auction)** | Same; `PostDraftSummary.budgetSummary` | When `draftType === 'auction'`: per-roster budget (budgetPerTeam), spent, remaining. |
| **Keeper outcome** | Same; `PostDraftSummary.keeperOutcome` | When keeper selections exist: rosterId, displayName, roundCost, playerName, position, team. |
| **Devy/C2C slot summary** | Same; `PostDraftSummary.devyRounds`, `c2cCollegeRounds` | When devy/c2c enabled: list of devy rounds or C2C college rounds. |

---

## 2. Where It Lives (Backend)

| File | Purpose |
|------|---------|
| `lib/post-draft/types.ts` | `PickLogEntry`, `TeamResultEntry`, `ValueReachEntry`, `BudgetSummaryEntry`, `KeeperOutcomeEntry`, `PostDraftSummary`. |
| `lib/post-draft/PostDraftAutomationService.ts` | `buildPostDraftSummary(leagueId)`, `ensurePostDraftFinalized(leagueId)`. Uses `buildSessionSnapshot` and Prisma for league name/sport. |
| `lib/post-draft/index.ts` | Re-exports types and service. |
| `app/api/leagues/[leagueId]/draft/post-draft-summary/route.ts` | **GET** post-draft summary. Auth: `canAccessLeagueDraft`. Returns 404 when draft not completed. |
| `app/api/leagues/[leagueId]/draft/recap/route.ts` | **POST** AI recap. Auth: `canAccessLeagueDraft`. Builds text summary and calls `openaiChatText` for narrative. |

---

## 3. Recap UI (Frontend)

| File | Purpose |
|------|---------|
| `components/app/draft-room/PostDraftView.tsx` | Tabs: Summary, Teams, My Roster, Replay (pick log), AI Recap, Share. Summary tab shows: draft summary card, by position, value/reach (earliest pick by position). **Budget summary** card when `session.draftType === 'auction'` and `session.auction`. **Keeper outcome** card when `session.keeper?.selections?.length`. **Devy/C2C** card when `session.devy?.enabled` or `session.c2c?.enabled`. Teams tab: team-by-team cards (expandable). Share: Copy draft room link, Copy summary (text) — no dead share/export actions. |

Data for Summary/Teams/Replay is derived from `session` (and optionally from GET post-draft-summary for server-side or other consumers). Budget/keeper/devy in the UI are derived from `session.auction`, `session.keeper`, `session.devy`, `session.c2c`.

---

## 4. AI Optional Tasks

| Task | Status | Location |
|------|--------|----------|
| **League-wide narrative recap** | Implemented | POST `/api/leagues/[leagueId]/draft/recap`; "Generate AI recap" in PostDraftView → AI Recap tab. |
| **Team grade explanations** | Optional / future | Can be added as separate API or extended recap prompt. |
| **Best/worst value explanation** | Optional / future | Can use value/reach + ADP data in a follow-up AI call. |
| **Strategy recap** | Optional / future | Can be added to recap prompt or separate Chimmy debrief. |
| **Chimmy draft debrief** | Optional / future | Dedicated flow when enabled; not required for this deliverable. |

---

## 5. Automation vs AI Notes

- **Deterministic (automation):** Finalize rosters, draft summary, pick log, team results, value/reach, budget summary (auction), keeper outcome, devy/C2C summary. All computed from `DraftSessionSnapshot` and DB; no LLM.
- **AI (optional):** User clicks "Generate AI recap" → POST draft/recap → narrative recap. No AI is required for the summary page to open, recap cards to render, or share actions to work.
- **Stale states:** Post-draft view is shown only when `session.status === 'completed'`. Summary and recap cards render from current session; no separate "draft completion" flag that can go stale beyond the session status.

---

## 6. QA Checklist (Mandatory Click Audit)

- [ ] **Summary page opens correctly** — From draft room after draft completion, post-draft view shows; Summary tab is default; draft summary, by position, and value/reach cards render.
- [ ] **Recap cards render correctly** — Budget summary card appears for auction drafts; Keeper outcome card appears when keepers exist; Devy/C2C card appears when devy or C2C is enabled.
- [ ] **AI recap opens correctly when enabled** — AI Recap tab loads; "Generate AI recap" triggers POST `/api/leagues/[leagueId]/draft/recap`; loading state and then narrative text or error message display.
- [ ] **No dead share/export actions** — Share tab shows only "Copy draft room link" and "Copy summary (text)"; both copy to clipboard and show brief confirmation (e.g. "Link copied" / "Summary copied"); no broken or placeholder export buttons.
- [ ] **No stale draft completion states** — After draft completes, post-draft view reflects completed state; leaving and re-entering draft room still shows post-draft view; GET post-draft-summary returns 200 with full summary when draft is completed and 404 when not.

---

## 7. Summary

- **Backend:** `lib/post-draft/*` (types, `PostDraftAutomationService`, index); GET `draft/post-draft-summary`; existing POST `draft/recap` for AI.
- **Frontend:** `PostDraftView` Summary tab extended with budget, keeper, and devy/C2C cards; recap and share behavior unchanged and functional.
- **Automation vs AI:** All core post-draft data is deterministic; AI is optional and only used for the narrative recap when the user requests it.
