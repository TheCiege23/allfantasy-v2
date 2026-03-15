# Prompt 54 — AI Mock Draft Simulator (Deliverable)

## Overview

Platform-wide mock draft simulator using real user data (league teams, ADP) and meta trends. Features: **AI drafting opponents**, **meta trend awareness**, **multi-sport drafts**.

---

## Core Modules

### MockDraftEngine (`lib/mock-draft-simulator/MockDraftEngine.ts`)
- **runDraft(input):** Runs a full mock draft.
- **Input:** `config` (sport, numTeams, rounds, draftType, teamNames, optional userSlot, userPicks, isSuperflex, isTEP) and `playerPool` (DraftPlayer[]).
- **Behavior:** For each pick, if it’s the user’s slot and a user pick is provided, use it; otherwise call **DraftAIManager.makeAIPick**. Removes chosen player from pool and records roster-by-slot for need-based logic.
- **Output:** `{ picks: DraftPickResult[], config }` (overall, round, slot, manager, playerName, position, team, isUser, adp).

### DraftAIManager (`lib/mock-draft-simulator/DraftAIManager.ts`)
- **makeAIPick(input):** Chooses one player for the current pick.
- **Input:** sport, managerName, rosterSoFar, availablePlayers, round, overall, slot, numTeams, draftType, isSuperflex, useMeta.
- **Logic:** Computes position needs (starter/ideal targets), combines need score with ADP/value, optionally adds **MetaDraftPredictor** boost, sorts by combined score, returns top player.
- Acts as the **AI drafting opponents** for non-user slots.

### MetaDraftPredictor (`lib/mock-draft-simulator/MetaDraftPredictor.ts`)
- **predictWithMeta(input):** Returns meta-adjusted scores for available players.
- **Input:** sport, available (DraftPlayer[]), round.
- **Data:** Uses `getPlayerMetaTrendsForMeta(sport)` (trendScore, draftRate, trendingDirection) and `getPositionMetaTrends(sport)` (draftRate by position).
- **Output:** For each player, adjustedScore = valueScore + metaBoost (trend + draft rate + position trend). Provides **meta trend awareness** for the simulator.

---

## Multi-Sport

- **Sport:** Config and pool are sport-agnostic; `sport` is passed through to meta (normalized via `normalizeSportForMeta` / `normalizeToSupportedSport`). Supported sports: NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
- **Player pool:** For NFL, the API uses **getLiveADP** when no `playerPool` is sent. For other sports, callers can pass `playerPool` in the request body so **multi-sport drafts** are supported.

---

## API

- **POST /api/mock-draft/simulate-v2**
  - Body: `leagueId?`, `sport?`, `numTeams?`, `rounds?`, `draftType?`, `userSlot?`, `userPicks?`, `isSuperflex?`, `isTEP?`, `playerPool?`, `isDynasty?`.
  - Uses **MockDraftEngine.runDraft** with pool from getLiveADP (NFL) or body.playerPool. Optionally saves result to **MockDraft** when leagueId is provided.
  - Returns `{ picks, config }`.

---

## Integration

- **Existing mock draft:** Current `/api/mock-draft/simulate` and DraftRoom remain; simulate-v2 is an alternative backend using the new engine.
- **Real user data:** League teams (teamNames) and NFL ADP (getLiveADP / analytics snapshot) feed the simulator; userPicks allow real user choices when userSlot is set.
- **Meta:** Player and position meta trends from **MetaQueryService** (global-meta-engine) drive MetaDraftPredictor so drafts reflect platform trend awareness.
