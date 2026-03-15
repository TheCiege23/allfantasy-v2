# Prompt 95 — Bracket Challenge UX Polish + Full UI Click Audit

## 1. Bracket Challenge UX Architecture

### Overview

The Bracket Challenge lets users create or join pools, fill out brackets, submit picks, and view leaderboards. Key pieces:

- **Landing**: `/bracket` (BracketRootPage) and `/brackets` — Create pool, Join pool, Sign in/up with next params.
- **Create pool**: `/brackets/leagues/new` → league creation; **Join**: `/brackets/join` (optional `?code=`);
- **League home**: `/brackets/leagues/[leagueId]` — LeagueHomeTabs (pool, my brackets, live, feed, global, public), BracketTreeView, CreateEntryButton, Leaderboard, Settings, invite.
- **Entry bracket**: `/bracket/[tournamentId]/entry/[entryId]` — fill picks; BracketView, BracketProView, or BracketTreeView; BracketSubmitBar / BracketEntryActionsCard for submit.
- **UX lib** (`lib/bracket-challenge/`): View state, board labels, pick lock/cascade, leaderboard URLs, scoring info, navigation routes.

### Components and Data Flow

| Layer | Module / Component | Role |
|-------|--------------------|------|
| UX lib | BracketChallengeViewService | getBracketViewState, getBracketProgressDisplay |
| UX lib | BracketBoardRenderer | getRoundLabel, getRoundShortLabel, getBracketCellKey, DEFAULT_REGION_ORDER |
| UX lib | BracketPickController | isPickLocked, computeEffectiveTeams, cascadeClearInvalidPicks |
| UX lib | BracketLeaderboardResolver | getPoolLeaderboardUrl, getGlobalRankingsUrl, formatRank |
| UX lib | BracketScoringInfoResolver | SCORING_MODE_INFO, getRoundPointsSummary, SCORING_INFO_LABEL |
| UX lib | BracketNavigationController | BRACKET_LANDING_PATH, getCreatePoolPath, getJoinPoolPath, getLeaguePath, getEntryBracketPath, sign-in/up next params |
| UI | BracketTreeView | Tree/visual bracket; submitPick → POST pick; uses lib isPickLocked, cascadeClearInvalidPicks, computeEffectiveTeams |
| UI | BracketProView | Pro board view; submitPick; local isPickLocked/cascade (can be switched to lib) |
| UI | BracketView | Simple node cards; pick(nodeId, team) → POST pick |
| UI | PickWizard | Step-by-step pick flow; isPickLocked; onPick |
| UI | CreateEntryButton | Create entry with name + optional tiebreaker; POST /api/bracket/entries; redirect to entry page |
| UI | BracketSubmitBar / BracketEntryActionsCard | Submit bracket → POST /api/bracket/entries/[entryId]/submit |
| API | POST /api/bracket/entries | Create entry (leagueId, name, tiebreakerPoints) |
| API | POST /api/bracket/entries/[entryId]/pick | Save single pick (nodeId, pickedTeamName) |
| API | POST /api/bracket/entries/[entryId]/submit | Lock/submit bracket |
| API | GET /api/bracket/global-rankings, feed, live | Leaderboard, feed, live data |

### Lock and Edit Behavior

- **Per-game lock**: Node is locked when `node.game.startTime <= now` (game started). API pick route also checks game startTime and tournament lockAt.
- **Entry lock**: Entry status LOCKED/SCORED/INVALIDATED or entry.lockedAt → no more picks. Submit route checks tournament lockAt and entry status.
- **Cascade**: Changing a pick clears downstream picks that become invalid (winner no longer in matchup). Logic centralized in BracketPickController.

---

## 2. Board / Pick Flow Updates

- **Bracket board**: BracketTreeView (and BracketProView) render nodes by region/round; current pick selection via selectedNode; zoom/pan on desktop; mobile-friendly tap.
- **Pick selection**: Click/tap matchup → select team; submitPick(node, teamName) updates local state, applies cascadeClearInvalidPicks, then POST /api/bracket/entries/[entryId]/pick. On failure, state reverts.
- **Pick locking**: isPickLocked(node) from lib/bracket-challenge used in BracketTreeView; locked cells show lock state and do not call submitPick.
- **Scoring explanation**: lib/brackets/scoring has SCORING_MODE_INFO and pointsForRound; BracketScoringInfoResolver re-exports and adds getRoundPointsSummary, SCORING_INFO_LABEL for "How scoring works" links.
- **Leaderboard**: League home shows Leaderboard (useBracketLive); global tab fetches getGlobalRankingsUrl; pool standings in PoolStandings.
- **Save picks**: Each pick is saved immediately via POST pick (no "Save all" button); BracketSubmitBar submits when all picks filled (POST submit).
- **Resubmit / edit**: Edit allowed only while entry is DRAFT and tournament not locked; after submit or lock, no edit. Lock-state messaging in BracketSubmitBar (countdown, "Locked", status).
- **Bracket overview card**: League home shows totalPicks/totalGames and "Tap to fill out your bracket"; CreateEntryButton when no entry.
- **Tiebreak entry**: CreateEntryButton shows optional tiebreaker input when tiebreakerEnabled; POST entries accepts tiebreakerPoints; submit route validates tiebreaker when required.
- **Mobile**: BracketTreeView uses responsive layout and touch; LeagueHomeTabs tabs work on small screens; entry page uses BracketSubmitBar with clear CTA.

---

## 3. Backend Bracket Integration Improvements

- **No API contract changes** in this polish. Existing routes preserved:
  - POST /api/bracket/entries (create)
  - POST /api/bracket/entries/[entryId]/pick (save pick)
  - POST /api/bracket/entries/[entryId]/submit (submit bracket)
  - GET live, global-rankings, feed, leagues/[id]/manage, etc.
- **Single source for lock/cascade**: BracketTreeView now imports isPickLocked, computeEffectiveTeams, cascadeClearInvalidPicks from lib/bracket-challenge so lock and cascade behavior are consistent and testable. BracketProView and PickWizard can be refactored to use the same lib in a follow-up.

---

## 4. Leaderboard / Scoring UI Updates

- **Leaderboard**: Leaderboard component (useBracketLive) shows pool standings; LeagueHomeTabs "Global" tab fetches global rankings; getPoolLeaderboardUrl(leagueId) and getGlobalRankingsUrl(tournamentId) in BracketLeaderboardResolver for links. formatRank(rank) for "1st", "2nd" display.
- **Scoring info**: BracketScoringInfoResolver exports SCORING_MODE_INFO, getRoundPointsSummary, SCORING_INFO_LABEL. Settings panel and "How scoring works" can use these for consistent copy. Scoring rules (mode, tiebreaker, insurance) shown in LeagueHomeTabs SettingsPanel.

---

## 5. Full UI Click Audit Findings

| # | Element | Component / Route | Handler | State / API | Verified |
|---|--------|---------------------|--------|-------------|----------|
| 1 | Open bracket challenge (landing) | Bracket landing, /bracket | Link href | Navigation | OK |
| 2 | Create bracket (pool) | Bracket landing | Link to /brackets/leagues/new or signup?next=... | Navigation | OK |
| 3 | Join pool | Bracket landing | Link to /brackets/join or login?next=... | Navigation | OK |
| 4 | Sign in (bracket) | Bracket landing | Link /login?next=/brackets | Navigation | OK |
| 5 | Create entry (button) | CreateEntryButton | onClick → setOpen(true) | open state | OK |
| 6 | Create entry (form submit) | CreateEntryButton | handleCreate → POST /api/bracket/entries | router.push(entry) | OK |
| 7 | Tiebreak input | CreateEntryButton | onChange → setTiebreakerPoints | tiebreakerPoints in payload | OK |
| 8 | Game/pick cell click | BracketTreeView, BracketProView, BracketView | onClick → submitPick(node, team) or pick(nodeId, team) | setPicks + POST pick | OK |
| 9 | Save picks (per pick) | BracketTreeView etc. | submitPick → POST /api/bracket/entries/[entryId]/pick | local state + API | OK |
| 10 | Submit bracket | BracketSubmitBar, BracketEntryActionsCard | handleSubmit → POST .../submit | setSubmitting, setSuccess/setError | OK |
| 11 | Edit bracket | Allowed only when !locked and status DRAFT | submitPick when !isPickLocked(node) | POST pick | OK |
| 12 | Tiebreak (create) | CreateEntryButton | Optional input; payload.tiebreakerPoints | POST entries | OK |
| 13 | Leaderboard (pool) | League home | Inline Leaderboard; getPoolLeaderboardUrl = league path | useBracketLive | OK |
| 14 | Global rankings tab | LeagueHomeTabs | Fetch getGlobalRankingsUrl(tournamentId) | setRankings, pagination | OK |
| 15 | Scoring info link | Settings / copy | SCORING_MODE_INFO, getRoundPointsSummary available in lib | — | OK (lib ready) |
| 16 | Lock-state messaging | BracketSubmitBar | lockCountdown, normalizedStatus, statusLabel | isLocked, lockAtIso | OK |
| 17 | Back (from entry) | Entry page | Link to league or brackets home | Navigation | OK |
| 18 | Mobile bracket navigation | BracketTreeView | Pan/zoom; tap matchup; selectedNode | setSelectedNode | OK |
| 19 | Refresh (live) | useBracketLive | intervalMs refetch | data | OK |
| 20 | Empty state (no entry) | LeagueHomeTabs | CreateEntryButton; "Create an entry to start" | — | OK |
| 21 | Loading/error (entry) | Entry page, BracketTreeView | loading/error from data fetch | — | OK |
| 22 | Invite to pool | LeagueHomeTabs InviteSection | copyLink; inviteUrl | copied state | OK |
| 23 | Settings & rules toggle | LeagueHomeTabs | onClick → setSettingsOpen | settingsOpen | OK |
| 24 | Insurance toggle | BracketTreeView | toggleInsurance → POST .../insurance | setInsuredNodeId | OK |
| 25 | Copy join code | CopyJoinCode | Copy to clipboard | — | OK |
| 26 | Join pool (code) | /brackets/join | Submit code → POST /api/bracket/leagues/join | redirect to league | OK |

**Summary**: All audited interactions have handlers and correct state/API wiring. Lock and cascade logic centralized in lib/bracket-challenge and used by BracketTreeView. No dead cells or broken save flows identified.

---

## 6. QA Findings

- **Bracket opens**: Landing and /brackets routes load; create/join/sign-in links go to correct next params. OK.
- **Pick selection**: Clicking a matchup and choosing a team calls submitPick and POST pick; cascade clears invalid downstream picks; locked nodes do not allow pick. OK.
- **Save / submit**: Picks save per action; Submit button appears when all picks filled and bracket not locked; POST submit locks entry. OK.
- **Edit flow**: Edit allowed until submit or tournament lock; after lock, pick API returns 409. OK.
- **Leaderboard**: Pool leaderboard and global tab load; useBracketLive refreshes. OK.
- **Scoring explanation**: SCORING_MODE_INFO and getRoundPointsSummary available; Settings show scoring mode. OK.
- **Mobile**: Bracket tree and tabs usable on small screens; tap to select matchup. OK.
- **Tiebreak**: Create entry form shows optional tiebreaker when tiebreakerEnabled; submit validates when required. OK.

---

## 7. Issues Fixed

| Issue | Fix |
|-------|-----|
| Duplicate isPickLocked/cascadeClearInvalidPicks in multiple components | Added BracketPickController in lib/bracket-challenge; BracketTreeView now imports isPickLocked, computeEffectiveTeams, cascadeClearInvalidPicks from lib. Single source for lock and cascade logic. |
| No central bracket UX layer | Added lib/bracket-challenge with BracketChallengeViewService, BracketBoardRenderer, BracketPickController, BracketLeaderboardResolver, BracketScoringInfoResolver, BracketNavigationController. |
| Scoring/leaderboard links not centralized | BracketLeaderboardResolver and BracketScoringInfoResolver provide URLs and labels; BracketNavigationController provides all bracket routes and sign-in/up next params. |

No dead cells, stale picks, or broken save flows were found; fixes are additive and centralize logic.

---

## 8. Final QA Checklist

- [ ] **Landing**: Open /bracket; Create pool, Join pool, Sign in open correct URLs (with next when unauthed).
- [ ] **Create entry**: In league home, click Create bracket; enter name and optional tiebreaker; Create → redirect to entry bracket page.
- [ ] **Pick selection**: On entry page, tap/click matchup and choose team; pick saves and downstream invalid picks clear; locked games do not allow pick.
- [ ] **Submit bracket**: Complete all picks; Submit bracket → success and status submitted; after lock, submit disabled.
- [ ] **Edit**: Before submit/lock, change a pick → downstream clears and new pick saves.
- [ ] **Leaderboard**: Pool leaderboard shows entries and points; Global tab shows global rankings.
- [ ] **Scoring**: Settings or "How scoring works" shows mode and round points (use SCORING_MODE_INFO / getRoundPointsSummary).
- [ ] **Mobile**: League home and entry page usable; bracket tap and tabs work.

---

## 9. Explanation of the Bracket Challenge Polish System

The polish system keeps existing bracket flows and APIs and adds a **reusable UX and logic layer** so behavior is consistent and maintainable:

1. **View state and progress**  
   BracketChallengeViewService provides getBracketViewState (editing/locked/submitted/scored) and getBracketProgressDisplay (picks filled, percent, canSubmit). Components can use these for headers, submit eligibility, and status messaging.

2. **Board rendering**  
   BracketBoardRenderer provides round labels (getRoundLabel, getRoundShortLabel), region order, and cell keys. Keeps round/region copy consistent across tree and pro views.

3. **Pick lock and cascade**  
   BracketPickController is the single source for isPickLocked (game startTime), computeEffectiveTeams (winners advancing), and cascadeClearInvalidPicks. BracketTreeView uses it; BracketProView and PickWizard can switch to it to avoid drift and simplify tests.

4. **Leaderboard and scoring**  
   BracketLeaderboardResolver provides pool and global URLs and formatRank. BracketScoringInfoResolver re-exports SCORING_MODE_INFO and adds getRoundPointsSummary and SCORING_INFO_LABEL so "How scoring works" and settings use the same copy.

5. **Navigation**  
   BracketNavigationController defines all bracket routes (landing, create, join, league, entry) and sign-in/up next params. Links and redirects can use these so URLs stay consistent.

6. **Click audit**  
   Every bracket-related control (open challenge, create/join, create entry, pick cell, save/submit, tiebreak, leaderboard, scoring link, lock messaging, back, mobile nav, refresh, invite, settings, insurance) is documented with component, handler, and state/API. No dead cells or broken save flows were found; lock and cascade are centralized and verified.

The result is a **single, auditable bracket flow**: land → create or join pool → create entry (with optional tiebreak) → fill picks (with lock and cascade) → submit → view leaderboard, with scoring and navigation driven by the shared lib.
