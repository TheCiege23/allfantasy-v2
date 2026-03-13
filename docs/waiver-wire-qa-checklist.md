# Waiver Wire Engine – QA Checklist

## League settings
- [ ] Create/update league waiver settings (PUT `/api/waiver-wire/leagues/[leagueId]/settings`) with waiverType, faabBudget, processingDayOfWeek, processingTimeUtc, claimLimitPerPeriod, tiebreakRule, lockType, instantFaAfterClear.
- [ ] GET settings returns saved values or defaults (waiverType: standard).
- [ ] Only league owner (userId) can update settings.

## Claims
- [ ] Submit claim (POST claims) with addPlayerId; optional dropPlayerId, faabBid, priorityOrder.
- [ ] Submit fails with 400 if addPlayerId missing.
- [ ] Submit fails if user has no roster in league (404).
- [ ] GET claims returns pending claims for league; GET ?type=history returns processed claims and transactions.
- [ ] PATCH claim (edit) updates only pending claims; 404 if not found or not pending.
- [ ] DELETE claim (cancel) sets status to cancelled; 404 if not found or not pending.

## Available players
- [ ] GET `/api/waiver-wire/leagues/[leagueId]/players` returns players not on any roster in that league.
- [ ] Query param `sport` filters by sport (default from league).
- [ ] Query param `q` filters by name (case-insensitive).
- [ ] Query param `limit` caps results.

## Processing engine
- [ ] POST `/api/waiver-wire/leagues/[leagueId]/process` runs processing for that league.
- [ ] Only league owner or request with valid CRON_SECRET can run process.
- [ ] FAAB: claims ordered by faabBid desc; insufficient FAAB → claim failed.
- [ ] Rolling: claims ordered by roster.waiverPriority asc; after successful claim, that roster’s waiverPriority increments.
- [ ] Reverse standings: claims ordered by waiverPriority asc (lowest = worst team first).
- [ ] Standard: claims ordered by priorityOrder asc.
- [ ] FCFS: claims ordered by createdAt asc.
- [ ] Player already rostered → claim failed (Player no longer available).
- [ ] Roster full and no drop specified → claim failed.
- [ ] Drop player not on roster → claim failed.
- [ ] Successful claim: WaiverClaim status = processed, Roster playerData updated (add + drop), faabRemaining decreased if FAAB, WaiverTransaction created.

## Frontend
- [ ] Waiver wire page shows league waiver type and FAAB remaining (if FAAB).
- [ ] Submit claim form: add player ID, optional drop ID, optional FAAB bid (when FAAB).
- [ ] Pending claims list with cancel button.
- [ ] Processed history list (transactions) with add/drop/faab and timestamp.
- [ ] Available players list (ID, name, position, team) for reference.
- [ ] Refresh button reloads settings, claims, players, history.

## Multi-sport
- [ ] League.sport (NFL/NBA/MLB) used when fetching available players; no football-only logic in engine.
- [ ] Roster and player IDs are generic strings; no sport-specific validation in process engine.

## Edge cases
- [ ] Multiple claims for same player: only first (by order) succeeds; rest see “Player no longer available”.
- [ ] Same roster, multiple claims: each processed in order; roster state updates correctly.
- [ ] Claim with drop: drop must be on that roster; add must not be on any roster.
