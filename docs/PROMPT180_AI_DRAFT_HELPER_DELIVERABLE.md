# PROMPT 180 — AllFantasy AI Draft Helper and On-the-Clock Assistant Deliverable

## Overview

AI assistant for **live and mock drafts**: best-available recommendation, roster-need fit, reach/value warnings, positional scarcity, bye-week awareness (NFL), AI-adjusted ADP, league-format awareness, and “Ask Chimmy about this pick.” **Deterministic-first:** uses only provided player pool and draft state; no invented players or stats; respects league and roster settings; shows uncertainty when data is limited.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## AI Draft Helper Features

| Feature | Implementation |
|--------|-----------------|
| **Best available** | Recommendation engine ranks available players by ADP (or AI ADP when provided) and need; returns top pick. |
| **Best fit for roster need** | `teamRoster` (positions already drafted) drives need scoring; mode `needs` vs `bpa` selects need-aware vs pure best-available. |
| **Reach / value warning** | `reachWarning` when pick is earlier than ADP suggests; `valueWarning` when strong value is still on board. |
| **Positional scarcity** | `scarcityInsight` when a position is thin in remaining pool. |
| **Stack / correlation** | Placeholder for sport-appropriate stacking; engine is sport-agnostic and can be extended. |
| **Bye week awareness** | NFL: `byeNote` when recommended player has a bye (plan coverage). |
| **AI-adjusted ADP** | Optional `aiAdpByKey` passed from client (e.g. league AI ADP); engine uses it for ranking and value/reach. |
| **League format / scoring** | `isDynasty`, `isSF` (Super Flex), `rosterSlots` supported in API and engine. |
| **Explain recommendation** | `explanation` and `reason`/`confidence` returned; shown in DraftHelperPanel. |
| **Ask Chimmy about this pick** | Link opens AI chat with pre-filled prompt via `buildAskChimmyAboutPickPrompt` and `getDraftAIChatUrl`. |
| **Live + mock draft** | Same POST `/api/draft/recommend` and (optionally) DraftHelperPanel usable in both flows. |

---

## Deterministic-First Rules

- AI uses **only** the provided `available` player pool and `teamRoster` / round / pick / totalTeams.
- AI **cannot** invent players or stats; all evidence comes from the request.
- League settings (sport, isDynasty, isSF, rosterSlots) are **never** ignored when provided.
- **Uncertainty** is surfaced via `caveats` (e.g. “Limited ADP data”) and confidence score.

---

## Backend

### Route

| Method | Route | Auth | Purpose |
|--------|--------|------|--------|
| POST | `/api/draft/recommend` | Session required | Returns deterministic draft recommendation and evidence. |

**Request body:** `available`, `teamRoster`, `rosterSlots`, `round`, `pick`, `totalTeams`, `sport`, `isDynasty`, `isSF`, `mode` (`'needs'` \| `'bpa'`), optional `aiAdpByKey`, `byeByKey`.

**Response:** `ok`, `recommendation`, `alternatives`, `reachWarning`, `valueWarning`, `scarcityInsight`, `byeNote`, `explanation`, `caveats`.

### Service

- **`lib/draft-helper/RecommendationEngine.ts`**: `computeDraftRecommendation(input)` — purely deterministic; need scoring from roster, ADP (or AI ADP) edge, format boosts (e.g. QB in SF). Returns recommendation, alternatives, reach/value/scarcity/bye and explanation/caveats.
- **`lib/draft-helper/index.ts`**: Re-exports engine and types.

---

## Chimmy Integration

- **`lib/draft-room/DraftToAIContextBridge.ts`**:
  - `buildAskChimmyAboutPickPrompt(ctx)` — builds prompt including recommended player, position, explanation, sport, round, pick.
  - `getDraftAIChatUrl(suggestedPrompt)` — returns `/af-legacy?tab=chat&prompt=...` for “Ask Chimmy about this pick.”

---

## Frontend

### Draft Helper Panel

- **Component:** `components/app/draft-room/DraftHelperPanel.tsx`
- **Placement:** Passed as `helperPanel` to `DraftRoomShell`. Desktop: column between queue and chat; mobile: tab “Helper” (Sparkles icon) when `helperPanel` is present.
- **Props:** `loading`, `error`, `recommendation`, `alternatives`, `reachWarning`, `valueWarning`, `scarcityInsight`, `byeNote`, `explanation`, `caveats`, `sport`, `round`, `pick`, `leagueName`, `rosterSlots`, `queueLength`, `onRefresh`, optional `onPlayerClick`.

### Evidence / Caveat UI

- **Recommendation:** Primary player, position, team, ADP, reason, confidence.
- **Explanation:** Full text block.
- **Warnings:** Reach, value, scarcity, bye shown as distinct lines when present.
- **Caveats:** List of caveats (e.g. “Limited ADP data”) when present.
- **Alternatives:** Clickable list; optional `onPlayerClick` to open/focus player detail.

### Live Draft Room Wiring

- **`DraftRoomPageClient.tsx`**:
  - `recommendationResult`, `recommendationLoading`, `recommendationError` state.
  - `fetchRecommendation()` builds `available` from `players` minus `draftedNames`, optional `aiAdpByKey` from `leagueAiAdp`; POST to `/api/draft/recommend`; updates state.
  - Effect runs when `session?.currentPick?.overall`, `session?.picks?.length`, `session?.teamCount`, `players.length` change.
  - `helperPanel={<DraftHelperPanel ... />}` passed to `DraftRoomShell` with all result props and `onRefresh={fetchRecommendation}`.

### Mock Draft

- Same `/api/draft/recommend` and (optionally) `DraftHelperPanel` can be used in mock draft flow with that context’s available/drafted/myRoster/round/pick.

---

## Mandatory Click Audit (QA Checklist)

- [ ] **Get recommendation:** In live draft, open draft room; AI Draft Helper panel shows (desktop: column; mobile: Helper tab). Recommendation loads and displays (player, reason, confidence, explanation).
- [ ] **Recommendation refresh:** Click Refresh; recommendation reloads; no dead button.
- [ ] **Ask Chimmy opens correctly:** Click “Ask Chimmy about this pick”; AI chat opens with pre-filled prompt including recommended player and context.
- [ ] **Player detail open works:** If alternatives or recommendation have clickable player; clicking opens or focuses player detail as implemented (e.g. scroll to player in list).
- [ ] **Recommendation changes when roster/picks change:** After making a pick or when draft advances, recommendation updates (different round/pick or roster); no stale recommendation.
- [ ] **No dead AI buttons:** Refresh, Ask Chimmy, and any player links are functional; no silent failures or disabled actions without reason.

---

## QA Checklist (concise)

1. Recommendation appears in draft room (desktop column / mobile Helper tab).
2. Refresh recommendation updates the result.
3. “Ask Chimmy about this pick” opens chat with correct prompt.
4. Player click (recommendation or alternative) works when `onPlayerClick` is wired.
5. Recommendation updates when round, pick, or roster (picks) change.
6. Reach/value/scarcity/bye and caveats display when present.
7. No dead AI buttons; errors show clearly when recommendation fails.

---

## Files Touched

- **Engine:** `lib/draft-helper/RecommendationEngine.ts`, `lib/draft-helper/index.ts`
- **API:** `app/api/draft/recommend/route.ts`
- **Chimmy:** `lib/draft-room/DraftToAIContextBridge.ts` — `buildAskChimmyAboutPickPrompt`
- **UI:** `components/app/draft-room/DraftHelperPanel.tsx`, `components/app/draft-room/DraftRoomShell.tsx` (helperPanel + mobile tab), `components/app/draft-room/DraftRoomPageClient.tsx` (state, fetchRecommendation, helperPanel), `components/app/draft-room/index.ts`
- **Page:** `app/app/league/[leagueId]/draft/page.tsx` — `isDynasty` for league
