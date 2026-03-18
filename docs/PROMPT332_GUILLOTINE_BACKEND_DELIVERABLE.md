# PROMPT 332 — Guillotine League Backend Engine Deliverable

## 1. Schema Changes

### New Prisma models (in `prisma/schema.prisma`)

- **GuillotineLeagueConfig** — 1:1 with League when format is guillotine.
  - `leagueId`, `eliminationStartWeek`, `eliminationEndWeek`, `teamsPerChop`, `correctionWindow`, `customCutoffDayOfWeek`, `customCutoffTimeUtc`, `statCorrectionHours`, `tiebreakerOrder` (Json), `dangerMarginPoints`, `rosterReleaseTiming`, `commissionerOverride`.

- **GuillotineRosterState** — Per-roster chop state.
  - `leagueId`, `rosterId` (unique), `choppedAt`, `choppedInPeriod`, `choppedReason`.

- **GuillotinePeriodScore** — Period and cumulative season points per roster.
  - `leagueId`, `rosterId`, `weekOrPeriod`, `season`, `periodPoints`, `seasonPointsCumul`. Unique on `(leagueId, rosterId, weekOrPeriod)`.

- **GuillotineEventLog** — Append-only event log.
  - `leagueId`, `eventType`, `metadata` (Json), `createdAt`.

### League relation

- `League.guillotineConfig` — optional one-to-one to `GuillotineLeagueConfig`.

### Migration

Run after schema edit:

```bash
npx prisma migrate dev --name add_guillotine_engine
```

---

## 2. Event List

| eventType | When | metadata shape |
|-----------|------|----------------|
| `first_league_entry` | First time a user enters a guillotine league (media splash). | `{ userId?, leagueId }` |
| `post_draft_intro` | After draft completes (intro video). | `{ leagueId, draftSessionId? }` |
| `chop` | After elimination lock; team(s) chopped. | `{ weekOrPeriod, choppedRosterIds, tiebreakStepUsed?, reason?, commissionerOverride? }` |
| `commissioner_override` | Commissioner manually sets who is chopped. | `{ weekOrPeriod, choppedRosterIds, commissionerUserId, reason? }` |
| `weekly_recap` | Weekly summary generated. | `{ weekOrPeriod, summaryId? }` |
| `chop_animation_trigger` | UI/animation trigger for chop. | `{ weekOrPeriod, choppedRosterIds }` |
| `roster_released` | Chopped roster players released to waivers. | `{ rosterIds, releasedPlayerIds, releaseTiming }` |

---

## 3. Job / Cron / Background Task Requirements

1. **Period score ingestion**
   - **When:** After each scoring period closes (or when stats are finalized).
   - **Action:** Write `GuillotinePeriodScore` rows for the period (or call `savePeriodScores`). Data can come from existing scoring sync (e.g. Sleeper/ESPN) or manual entry.

2. **Elimination lock job**
   - **When:** After stat-correction cutoff for the period (e.g. 48h after period end, or custom day/time).
   - **Action:** Call `runElimination({ leagueId, weekOrPeriod, periodEndedAt, systemUserId })`. Ensure `evaluateWeek` has access to period scores (either pre-saved or passed via `periodScores`). This job marks chopped, releases rosters, logs events, and posts to league chat.

3. **Waiver processing**
   - **When:** Per league waiver schedule (e.g. Wed 10am).
   - **Action:** Use existing `processWaiverClaimsForLeague(leagueId)`. Released players from chopped rosters are already dropped; they become available in the pool for this run.

4. **Optional: weekly recap**
   - **When:** After elimination lock (or end of period).
   - **Action:** Call `buildWeeklySummary({ leagueId, weekOrPeriod })`; optionally emit `weekly_recap` event and trigger AI recap.

5. **Media events (first entry, post-draft intro)**
   - **When:** On first league entry (by user) and when draft status becomes `completed`.
   - **Action:** Call `appendEvent(leagueId, 'first_league_entry', { userId, leagueId })` and `appendEvent(leagueId, 'post_draft_intro', { leagueId, draftSessionId })`. Frontend can subscribe to these and show splash/intro video.

---

## 4. Asset References (Guillotine Only)

- **League image:** `GUILLOTINE_LEAGUE_IMAGE` → env `GUILLOTINE_LEAGUE_IMAGE` or `/guillotine/Guillotine.png` (serve from `public/guillotine/`).
- **First entry video:** `GUILLOTINE_FIRST_ENTRY_VIDEO` → env or `/guillotine/Guillotine.mp4`.
- **Post-draft intro video:** `GUILLOTINE_INTRO_VIDEO` → env or `/guillotine/Guillotine League Intro.mp4`.

Copy assets to `public/guillotine/` (e.g. from `/mnt/data/` or user’s `Downloads`) so they are served under `/guillotine/...`.

---

## 5. Integration Points

- **League creation:** When format is guillotine, call `upsertGuillotineConfig(leagueId, { ... })` (or persist in `League.settings` and create `GuillotineLeagueConfig` row).
- **Lineup / roster writes:** Before allowing lineup or add/drop, call `isRosterChopped(leagueId, rosterId)`; if true, return 403 with message that the team has been eliminated.
- **Chat:** Chop announcement is posted via `createLeagueChatMessage` with a system user ID (job must pass `systemUserId` to `runElimination`).

---

## 6. QA Checklist

- [ ] **Config:** Create guillotine league; confirm `GuillotineLeagueConfig` row and sport-aware defaults (elimination end week, etc.).
- [ ] **Period scores:** Ingest or manually create `GuillotinePeriodScore` for a period; confirm `evaluateWeek` returns correct active rosters and orderedWorstFirst.
- [ ] **Cutoff:** With `correctionWindow: after_stat_corrections` and `statCorrectionHours: 48`, confirm `runElimination` before cutoff does not chop; after cutoff it does.
- [ ] **Tiebreaker:** Two rosters with same period points; confirm tiebreak order (season points → previous period → draft slot) produces deterministic chop.
- [ ] **Commissioner override:** Pass `commissionerChoppedRosterIds`; confirm that roster is chopped and event log has `commissioner_override` / chop with `commissionerOverride: true`.
- [ ] **Roster release:** After chop, confirm chopped roster’s `playerData` is cleared and `roster_released` event exists; run waiver processing and confirm released players can be claimed.
- [ ] **Chat:** Confirm chop announcement appears in league chat with correct names and week.
- [ ] **Guard:** Confirm lineup or add/drop for a chopped roster returns 403 (integrate `isRosterChopped` in lineup/waiver APIs).
- [ ] **Danger engine:** Call `getDangerTiers`; confirm chop_zone (lowest), danger (within margin), safe.
- [ ] **Standings:** Call `getSurvivalStandings`; confirm only active rosters, ranked by season points.
- [ ] **Weekly summary:** Call `buildWeeklySummary`; confirm choppedThisWeek, survivalStandings, dangerTiers, assets.
- [ ] **Multi-chop:** Set `teamsPerChop: 2`; confirm two lowest (after tiebreak) are chopped and both rosters released.
- [ ] **Event log:** Query `getRecentEvents` for `chop` and `roster_released`; confirm payloads match.

---

## 7. File Manifest

| Label | Relative path |
|-------|----------------|
| [UPDATED] | `prisma/schema.prisma` |
| [NEW] | `lib/guillotine/constants.ts` |
| [NEW] | `lib/guillotine/types.ts` |
| [NEW] | `lib/guillotine/GuillotineLeagueConfig.ts` |
| [NEW] | `lib/guillotine/GuillotineTiebreakResolver.ts` |
| [NEW] | `lib/guillotine/GuillotineWeekEvaluator.ts` |
| [NEW] | `lib/guillotine/GuillotineEliminationEngine.ts` |
| [NEW] | `lib/guillotine/GuillotineDangerEngine.ts` |
| [NEW] | `lib/guillotine/GuillotineRosterReleaseEngine.ts` |
| [NEW] | `lib/guillotine/GuillotineStandingsProjectionService.ts` |
| [NEW] | `lib/guillotine/GuillotineWeeklySummaryService.ts` |
| [NEW] | `lib/guillotine/GuillotineEventLog.ts` |
| [NEW] | `lib/guillotine/guillotineChat.ts` |
| [NEW] | `lib/guillotine/guillotineGuard.ts` |
| [NEW] | `lib/guillotine/index.ts` |
| [NEW] | `docs/PROMPT332_GUILLOTINE_BACKEND_DELIVERABLE.md` |
