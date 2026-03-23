# Prompt 53 — AI Commentary Engine (Deliverable)

## Overview

AI commentary system that narrates fantasy matchups, trades, waivers, and playoff drama in real time.

**Features:** matchup commentary, trade reactions, waiver reactions, playoff drama.

**AI roles:** DeepSeek → statistical context; Grok → tone guidance; OpenAI → final commentary text.

---

## Architecture

- **CommentaryEngine** (`lib/commentary-engine/CommentaryEngine.ts`): Orchestrates generation. `generateCommentary(context, options)` calls NarrativeGenerator (optional DeepSeek stats, then OpenAI headline + body), optionally persists to `CommentaryEntry`. `listCommentary(leagueId, eventType?, limit, cursor)` returns recent entries.
- **NarrativeGenerator** (`lib/commentary-engine/NarrativeGenerator.ts`):
  - `getStatisticalContext(ctx)` — DeepSeek returns 2–4 sentence statistical/strategic context.
  - `getToneGuidance(ctx)` — Grok returns concise tone/stylistic bullets.
  - `generateCommentaryText(ctx, statisticalContext?)` — OpenAI writes final headline + body using event context + DeepSeek stats + Grok tone guidance.
- **EventListener** (`lib/commentary-engine/EventListener.ts`): Convenience entry points: `onMatchupCommentary`, `onTradeReaction`, `onWaiverReaction`, `onPlayoffDrama`. Each accepts typed context and optional `skipStats`, `persist`, `onCommentary` callback; delegates to CommentaryEngine.

---

## Schema

- **CommentaryEntry** (`commentary_entries`): `id`, `leagueId`, `sport`, `eventType`, `headline`, `body`, `contextSnap` (Json), `createdAt`. Indexes: leagueId, (leagueId, eventType), createdAt.

Migration: `20260327000000_add_commentary_entries`.

---

## Context Types

- **matchup_commentary:** matchupId?, teamAName, teamBName, scoreA, scoreB, week?, season?, situation?.
- **trade_reaction:** managerA, managerB, summary, tradeType?.
- **waiver_reaction:** managerName, playerName, action (add | drop | claim), position?, faabSpent?.
- **playoff_drama:** headline, summary, dramaType?.

---

## API

- **GET** `/api/leagues/[leagueId]/commentary` — Query: `eventType`, `limit`, `cursor`. Authenticated league-member only. Returns `{ entries, nextCursor }`.
- **POST** `/api/leagues/[leagueId]/commentary/generate` — Body: `eventType`, `sport?`, `leagueName?`, plus context fields per event type; `skipStats?`, `persist?` (default true). Commissioner-only, strict payload validation, and sport normalization/enforcement. Returns `{ headline, body }`.

---

## Integration

- **Trade reactions (live path):** wired on accepted draft trade proposals in `app/api/leagues/[leagueId]/draft/trade-proposals/[proposalId]/route.ts` via `onTradeReaction(...)`.
- **Waiver reactions (live path):** wired in waiver processing hook `lib/waiver-wire/run-hooks.ts` via `onWaiverReaction(...)` for successful awarded claims (capped batch).
- **Matchup commentary (score ingestion path):** wired in `app/api/import-sleeper/route.ts` from current-week Sleeper matchup scores (team performance ingestion path), with dedupe guards to suppress identical/minor rapid repeats.
- **Matchup commentary (live path):** wired on commissioner broadcast session start in `app/api/leagues/[leagueId]/broadcast/session/route.ts` via `onMatchupCommentary(...)` for featured matchup.
- **Playoff drama (live path):** wired on tournament advancement in `app/api/tournament/[tournamentId]/advance/route.ts` via `onPlayoffDrama(...)` across newly created elimination leagues.
- You can still call **POST commentary/generate** for on-demand narration and **GET commentary** to render a feed UI.
