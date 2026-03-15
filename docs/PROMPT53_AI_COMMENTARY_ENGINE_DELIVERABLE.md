# Prompt 53 — AI Commentary Engine (Deliverable)

## Overview

AI commentary system that narrates fantasy matchups, trades, waivers, and playoff drama in real time.

**Features:** matchup commentary, trade reactions, waiver reactions, playoff drama.

**AI roles:** DeepSeek → statistical context; Grok → tone (encoded in OpenAI system prompt); OpenAI → commentary text.

---

## Architecture

- **CommentaryEngine** (`lib/commentary-engine/CommentaryEngine.ts`): Orchestrates generation. `generateCommentary(context, options)` calls NarrativeGenerator (optional DeepSeek stats, then OpenAI headline + body), optionally persists to `CommentaryEntry`. `listCommentary(leagueId, eventType?, limit, cursor)` returns recent entries.
- **NarrativeGenerator** (`lib/commentary-engine/NarrativeGenerator.ts`): `getStatisticalContext(ctx)` — DeepSeek returns 2–4 sentence statistical/strategic context. `generateCommentaryText(ctx, statisticalContext?)` — OpenAI produces headline + body with commentator tone (Grok-style in system prompt).
- **EventListener** (`lib/commentary-engine/EventListener.ts`): Convenience entry points: `onMatchupCommentary`, `onTradeReaction`, `onWaiverReaction`, `onPlayoffDrama`. Each accepts typed context and optional `skipStats`, `persist`, `onCommentary` callback; delegates to CommentaryEngine.

---

## Schema

- **CommentaryEntry** (`commentary_entries`): `id`, `leagueId`, `sport`, `eventType`, `headline`, `body`, `contextSnap` (Json), `createdAt`. Indexes: leagueId, (leagueId, eventType), createdAt.

Migration: `20260327000000_add_commentary_entries`.

---

## Context Types

- **matchup_commentary:** teamAName, teamBName, scoreA, scoreB, week?, season?, situation?.
- **trade_reaction:** managerA, managerB, summary, tradeType?.
- **waiver_reaction:** managerName, playerName, action (add | drop | claim), position?, faabSpent?.
- **playoff_drama:** headline, summary, dramaType?.

---

## API

- **GET** `/api/leagues/[leagueId]/commentary` — Query: `eventType`, `limit`, `cursor`. Returns `{ entries, nextCursor }`.
- **POST** `/api/leagues/[leagueId]/commentary/generate` — Body: `eventType`, `sport?`, `leagueName?`, plus context fields per event type; `skipStats?`, `persist?` (default true). Returns `{ headline, body }`.

---

## Integration

- Call **EventListener** from trade/waiver/matchup/playoff flows: e.g. after a trade is accepted, call `onTradeReaction(context)`; after waiver claim, `onWaiverReaction(context)`.
- Or call **POST commentary/generate** from the frontend with current matchup/trade/waiver/playoff context to get on-demand narration.
- List recent commentary via **GET commentary** for a “commentary feed” UI.
