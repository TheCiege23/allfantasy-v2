# Big Brother League — Backend Automation Engine (Spec)

**Stack:** Next.js 14 (App Router), Prisma, PostgreSQL (Neon), Vercel Cron  
**Companion docs:** `docs/PRD_BIG_BROTHER_LEAGUE.md`, `docs/DATABASE_SCHEMA_BIG_BROTHER_LEAGUE.md`, `docs/UX_BIG_BROTHER_JOURNEY_AND_COMMANDS.md`  
**Principles:** Server-authoritative phases, **idempotent** cron steps, **graceful degradation**, **commissioner fallback** when AI/subscription/automation is off or when jobs fail.

**Implementation status:** Stub orchestrators and cron routes exist (`lib/big-brother/automation/*`, `app/api/big-brother/cron/*`) — they **no-op** until phase logic is wired. Vercel schedules are registered in `vercel.json`.

---

## Global conventions

### File layout (recommended)

| Path | Role |
|------|------|
| `lib/big-brother/automation/types.ts` | Shared types, `BbAutomationResult`, error codes |
| `lib/big-brother/automation/guards.ts` | `assertBbAutomationAllowed(config)`, `isPhaseDeadlineDue`, Redis locks |
| `lib/big-brother/automation/audit.ts` | `appendBbAuditLog(configId, leagueId, eventType, metadata)` |
| `lib/big-brother/automation/notify.ts` | Commissioner + house notifications → `BigBrotherNotificationLog` + platform senders |
| `lib/big-brother/automation/tick.ts` | **`runBigBrotherAutomationTick(opts?)`** — orchestrator |
| `lib/big-brother/automation/hohMiniGame.ts` | Systems 1–2 |
| `lib/big-brother/automation/nominations.ts` | System 3 |
| `lib/big-brother/automation/veto.ts` | Systems 4–7 |
| `lib/big-brother/automation/vote.ts` | Systems 8–9 |
| `lib/big-brother/automation/eviction.ts` | Systems 9–10 |
| `lib/big-brother/automation/jury.ts` | System 11 |
| `lib/big-brother/automation/reminders.ts` | System 12 |
| `lib/big-brother/automation/cycleReset.ts` | System 13 |
| `lib/big-brother/automation/statCorrection.ts` | System 14 |
| `app/api/big-brother/cron/automation/route.ts` | **GET/POST** Vercel cron entry (auth) |
| `app/api/big-brother/cron/reminders/route.ts` | Optional split for reminder cadence |
| `app/api/big-brother/commissioner/force-phase/route.ts` | Override hook (existing pattern family) |

### Cron authentication

- Reuse platform **`requireCronAuth`** (or `Authorization: Bearer CRON_SECRET`) — same as guillotine/zombie automation routes.
- Support `?dryRun=true` for staging (no writes, log intent).

### Idempotency

- Each sub-step checks **current `BigBrotherCycle.phase`** + **`phaseInstanceId`** before mutating.
- Use **`bb:lock:cycle:{cycleId}:advance`** in Redis (SET NX EX 30) to prevent double cron on Vercel overlap.
- DB: unique constraints (`cycleId` + vote, `cycleId` unique on `BigBrotherHohRecord`, etc.) catch races.

### Commissioner gates

- `BigBrotherLeagueConfig.weekProgressionPaused` → **skip all phase advances**; still enqueue **reminders** if product allows.
- `chimmyAutomationEnabled === false` (subscription lapsed) → **no Chimmy sends**; **cron may still close windows** per product decision — **PRD:** commissioner runs manually; recommended: **cron only emits `NEEDS_COMMISSIONER_ACTION` audit + notification**, does **not** auto-advance without explicit `allowAutomationWithoutSubscription` flag (default **false**).

### Audit trail

- Every automated mutation → `BigBrotherAuditLog` with `eventType` + `metadata` JSON (inputs, counts, ids, `jobRunId`).
- Commissioner-visible **OverrideLog** only for human actions via commissioner API.

### Error handling (uniform)

1. **Retryable** (Neon timeout, transient 5xx): log `AUTOMATION_ERROR`, release Redis lock, return `{ ok: false, retry: true }`; Vercel cron will retry next schedule.
2. **Non-retryable** (invariant broken): log `AUTOMATION_FATAL`, **notify commissioner**, set cycle flag `automationStuckReason` (add column) or store in `metadata` on audit, **do not** half-advance phase.
3. **Partial success** (waivers job): use **outbox** row or job id; second cron pass completes.

---

## Vercel cron schedules (recommended)

| Route | Schedule (UTC) | Rationale |
|-------|----------------|-----------|
| `GET /api/big-brother/cron/automation` | `*/5 * * * *` | Phase deadlines, locks, scoring hooks — 5m granularity |
| `GET /api/big-brother/cron/reminders` | `*/15 * * * *` | T−24h / T−1h reminders (idempotent per window) |
| `GET /api/big-brother/cron/stat-correction` | `0 */1 * * *` | Hourly flag check (lightweight) |

**Note:** Avoid duplicating the same path on two schedules unless intentional; Vercel may dedupe. Single **`automation`** route can call `runReminderSweep()` internally every Nth tick using modulo or separate internal timer buckets.

**`vercel.json` snippet (add when shipping):**

```json
{
  "path": "/api/big-brother/cron/automation",
  "schedule": "*/5 * * * *"
},
{
  "path": "/api/big-brother/cron/reminders",
  "schedule": "*/15 * * * *"
}
```

---

## Orchestrator

### `runBigBrotherAutomationTick` — `lib/big-brother/automation/tick.ts`

**Trigger:** Cron `GET /api/big-brother/cron/automation`  
**API route:** `app/api/big-brother/cron/automation/route.ts` → `runBigBrotherAutomationTick({ dryRun, forceLeagueId? })`

**Input parameters**

```ts
type BbAutomationTickInput = {
  dryRun?: boolean
  forceLeagueId?: string // optional isolate one league (support/debug)
  now?: Date // inject for tests
}
```

**Step-by-step logic**

1. Load all `BigBrotherLeagueConfig` where `status === 'active'` and league exists; filter `forceLeagueId` if set.
2. For each config, resolve `redraftSeasonId` (anchor); if null, **skip** (pre-draft).
3. If `weekProgressionPaused`, **skip** phase advances → audit `AUTOMATION_SKIPPED_PAUSED` per league; continue to **reminders only** if enabled.
4. If subscription gate says automation off, **skip** auto-advances → audit `AUTOMATION_SKIPPED_NO_SUB` (unless flag allows).
5. Find `BigBrotherCycle` rows for that season where `phase` not terminal and `archivedAt` null and `phaseDeadlineAt <= now` **OR** scoring events pending (HOH score).
6. For each due cycle, acquire Redis lock; run **phase-specific handler** (systems 1–14 below); release lock.
7. Return aggregate `{ processed, skipped, errors[] }`.

**DB operations:** Read configs, cycles, memberships; per-handler writes.

**Audit:** `AUTOMATION_TICK_START` / `AUTOMATION_TICK_END` with counts.

**Errors:** Any uncaught → logged; commissioner notify once per `leagueId` per hour (dedupe key in Redis).

**Ambiguous:** N/A at tick level.

**Commissioner notification:** Digest only on failures or stuck (`automationStuckReason`).

**Override hooks:** Commissioner `POST /api/big-brother/commissioner/force-phase` sets phase + clears stuck flag; next tick no-ops until deadlines realign.

---

## 1. HOH mini game submission collection and scoring

### `collectAndLockHohMiniGameSubmissions` — `lib/big-brother/automation/hohMiniGame.ts`

**Trigger:** Cron tick when `cycle.phase === HOH_COMP_OPEN` and `now >= miniGameLockAt` (from `BigBrotherPhaseInstance.deadlines` JSON).

**Input parameters:** `{ cycleId, dryRun? }`

**Step-by-step logic**

1. Load `BigBrotherCycle` + `phaseInstance` + config + eligible roster ids (house, HOH rules).
2. For each eligible `redraftRosterId`, if no `BigBrotherHohMiniGameSubmission` row, create one with `status: DISQUALIFIED` or `PENDING`→`LOCKED` per policy (PRD: missing = 0 points).
3. Set all `PENDING` → `LOCKED` with `lockedAt = now`.
4. **Do not** compute winner here if scoring is async; enqueue `scoreHohMiniGameForCycle` or call inline.

**DB:** `updateMany` submissions; `update` phase deadlines.

**Audit:** `HOH_MINI_GAME_LOCKED` `{ cycleId, lockedCount, missingCount }`

**Errors:** Retry; if fail, commissioner notify "HOH mini-game lock failed".

**Ambiguous:** N/A.

**Commissioner notification:** If `missingCount > threshold`, optional email.

**Override:** Commissioner can `force-phase` to skip mini-game → `HOH_COMPLETE` with manual `BigBrotherHohRecord`.

---

### `scoreHohMiniGameForCycle` — `lib/big-brother/automation/hohMiniGame.ts`

**Trigger:** Immediately after lock **or** cron if `phase === HOH_COMP_LOCKED` and no `BigBrotherHohMiniGameResult`.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. Load submissions + rubric in `resultJson` rules from config `challengeMode`.
2. Rank rosters; apply tie-break from config (`evictionTieBreakMode` family or dedicated `hohTieBreak`).
3. Insert `BigBrotherHohMiniGameResult`; insert `BigBrotherHohRecord` (competitionType `CUSTOM_MINI_GAME`); set `cycle.hohRosterId` FK; transition `phase → HOH_COMPLETE` then `NOMINATIONS_OPEN` with new `phaseInstanceId` + deadlines.

**DB:** Insert result, hoh record, update cycle, new phase instance.

**Audit:** `HOH_MINI_GAME_SCORED`, `HOH_DECIDED`

**Errors:** Non-retry if invalid JSON; commissioner notify.

**Ambiguous (tie):** Use tie-break chain; if still tie → **commissioner pick window** (set `phaseDeadlineAt`, notify) — same as fantasy HOH.

**Commissioner notification:** Always on tie-break to commissioner pick.

**Override:** Manual HOH via commissioner API writes `BigBrotherHohRecord` + phase skip.

---

## 2. HOH weekly score detection and assignment

### `assignHohFromWeeklyFantasyScores` — `lib/big-brother/automation/hohMiniGame.ts`

**Trigger:** Cron when `cycle.phase === HOH_COMP_OPEN` or `HOH_COMP_LOCKED`, `competitionType === FANTASY_WEEK_SCORE`, and **redraft week scores finalized** OR `now >= lineupLockAt` and policy allows provisional.

**Input parameters:** `{ cycleId, allowProvisional?: boolean }`

**Step-by-step logic**

1. Resolve `scoringWeek` from cycle; load all **active** house `RedraftRoster` ids.
2. Compute team fantasy points for week via **existing redraft scoring service** (same path as matchup scoring) — aggregate starters per league rules.
3. Apply eligibility (e.g. cannot win back-to-back HOH if config).
4. Sort desc; tie-break: bench points → season PF → config `hohTieBreak`.
5. If still tied → set sub-phase **COMMISSIONER_HOH_TIE** with deadline (optional) or random with audit `HOH_TIE_RANDOM` per config.
6. Write `BigBrotherHohRecord` with `scoreBreakdown` JSON; update cycle `hohRosterId`; advance to `HOH_COMPLETE` → `NOMINATIONS_OPEN`.

**DB:** Insert HOH record, update cycle, phase instance.

**Audit:** `HOH_SCORES_COMPUTED`, `HOH_DECIDED`, tie events.

**Errors:** If scoring service throws → retry; if week not scorable → **no phase change**, audit `HOH_SCORES_PENDING`.

**Ambiguous (tie):** See step 5.

**Commissioner notification:** Tie needing pick; scoring delay > 2h.

**Override:** Commissioner sets HOH + force phase.

---

## 3. Nomination deadline enforcement (auto-select fallback)

### `enforceNominationDeadline` — `lib/big-brother/automation/nominations.ts`

**Trigger:** Cron when `phase === NOMINATIONS_OPEN` and `now >= nominationsCloseAt`.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. If `BigBrotherNomineeRecord` count already equals `nomineeCount`, advance to `NOMINATIONS_COMPLETE` → next phase.
2. Else read `autoNominationFallback` from config (`lowest_season_points` | `random` | `commissioner`).
3. **lowest_season_points:** pick distinct eligible rosters with lowest `RedraftRoster.pointsFor` (or weekly — spec in config).
4. **random:** crypto-random from eligible.
5. **commissioner:** **do not** auto-fill; set `cycle.automationStuckReason = 'NOMINATIONS_AWAIT_COMMISSIONER'`, notify commissioner, audit `NOMINATION_DEADLINE_COMMISSIONER_REQUIRED`.
6. Insert nominee rows; audit `NOMINATION_AUTO_FILLED`; advance phase to veto draw.

**DB:** Insert `BigBrotherNomineeRecord` × N; update cycle phase.

**Audit:** `NOMINATION_DEADLINE_ENFORCED`, `NOMINATION_AUTO_FILLED`

**Errors:** Retry; if DB unique conflict, re-read idempotent state.

**Ambiguous:** Not enough eligible players → **fatal** → commissioner notify + pause.

**Commissioner notification:** Always when auto-used or when stuck.

**Override:** Commissioner POST nominations replaces rows + advance.

---

## 4. Veto participant randomization

### `randomizeVetoParticipants` — `lib/big-brother/automation/veto.ts`

**Trigger:** Cron when `phase === POV_PLAYER_PICK_OPEN` and pick window expired **OR** `phase === NOMINATIONS_COMPLETE` → auto transition to build pool (product order).

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. Build base pool: HOH + nominees (from records).
2. If template needs extra slots: run **deterministic seeded shuffle** (seed = `cycleId + scoringWeek` for reproducibility) OR crypto random with **audit log of seed** in metadata.
3. Insert `BigBrotherVetoParticipant` rows with `source` enum.
4. If house pick required and missing → auto-random fill.
5. Advance `phase → POV_COMP_OPEN`; set POV lineup lock deadline.

**DB:** Insert participants; update cycle.

**Audit:** `VETO_POOL_RANDOMIZED` `{ participantIds, seed? }`

**Errors:** Retry; unique constraint on duplicate roster in pool.

**Ambiguous:** Pool smaller than minimum → commissioner notify; optional skip POV per config.

**Commissioner notification:** If POV skipped or pool edge case.

**Override:** Commissioner API replace pool rows + re-run.

---

## 5. POV score computation and announcement

### `computePovWinnerFromScores` — `lib/big-brother/automation/veto.ts`

**Trigger:** Cron when `phase === POV_COMP_OPEN` and (scores finalized OR lock time passed per policy).

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. Load `BigBrotherVetoParticipant` roster ids only.
2. Compute weekly fantasy points subset; tie-break same as HOH.
3. Persist POV winner on **`BigBrotherCycle`** (e.g. `vetoWinnerRosterId` / `povHolderRosterId` — align field name in schema migration). **Do not** insert `BigBrotherVetoResult` until the POV holder chooses *use* or *not_use* (system 6 creates the row). Transition `phase → VETO_CEREMONY_OPEN` and set `vetoDecisionDeadlineAt`.

**DB:** Update cycle (+ phase instance deadlines); no `BigBrotherVetoResult` row yet.

**Audit:** `POV_COMP_SCORED`, `POV_WINNER_SET`

**Errors:** Same as HOH scoring.

**Ambiguous (tie):** Same tie policy.

**Commissioner notification:** Tie / delay.

**Override:** Force POV winner.

---

## 6. Veto decision window enforcement

### `enforceVetoDecisionDeadline` — `lib/big-brother/automation/veto.ts`

**Trigger:** Cron when `phase === VETO_CEREMONY_OPEN` and `now >= vetoDecisionDeadline`.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. If `BigBrotherVetoResult` exists with `decidedAt`, advance appropriately (already done).
2. Else create result: `vetoUsed = false`, `winnerRosterId` from POV, `decidedByUserId` = system user null → store `decidedByUserId` as commissioner bot null with flag `autoDecision: true` in audit metadata.
3. Advance to `EVICTION_VOTE_OPEN` (if no veto) or stay if logic wrong — **PRD:** default **not_use**.
4. Phase → `EVICTION_VOTE_OPEN` with final nominees from cycle records.

**DB:** Insert/upsert `BigBrotherVetoResult`; update cycle.

**Audit:** `VETO_AUTO_NOT_USED`

**Errors:** Retry.

**Ambiguous:** N/A.

**Commissioner notification:** Optional low-priority.

**Override:** N/A.

---

## 7. Replacement nominee deadline enforcement (empty pool escalation)

### `enforceReplacementNomineeDeadline` — `lib/big-brother/automation/veto.ts`

**Trigger:** Cron when `phase === REPLACEMENT_OPEN` and deadline passed.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. If replacement already valid (nominee records consistent), close phase.
2. Else load **eligible replacement pool** = active house minus HOH, POV holder, current nominees still on block.
3. If pool **empty** → **escalation:** audit `REPLACEMENT_POOL_EMPTY`; notify commissioner **high priority**; set `automationStuckReason`; **do not** advance to vote until commissioner picks **or** config `allowRandomReplacementFromEmpty` (default false).
4. If pool non-empty: **random** or **lowest points** pick per config; insert nominee record / update `NomineeRecord`; audit `REPLACEMENT_AUTO_FILLED`.
5. Advance to `EVICTION_VOTE_OPEN`; open vote `voteOpenedAt`, `voteDeadlineAt`.

**DB:** Nominee updates; cycle phase.

**Audit:** `REPLACEMENT_DEADLINE_ENFORCED`, `REPLACEMENT_POOL_EMPTY`

**Errors:** Retry.

**Ambiguous:** Single eligible → auto-pick.

**Commissioner notification:** **Immediate** on empty pool or auto-pick.

**Override:** Commissioner sets replacement via API.

---

## 8. Vote window management and tiebreaker resolution

### `openEvictionVoteIfReady` — `lib/big-brother/automation/vote.ts`

**Trigger:** Phase transition into `EVICTION_VOTE_OPEN` (from other handlers) **or** cron sanity check.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. Set `voteOpenedAt`, `voteDeadlineAt` if null.
2. Compute eligible voters (strict BB); store snapshot json on `phaseInstance.deadlines` or separate `BbVoteEligibilitySnapshot` table (optional).
3. Queue reminder jobs (system 12).

**DB:** Update cycle + phase instance.

**Audit:** `VOTE_WINDOW_OPENED`

---

### `closeEvictionVoteAndDetectTie` — `lib/big-brother/automation/vote.ts`

**Trigger:** Cron when `phase === EVICTION_VOTE_OPEN` and `now >= voteDeadlineAt`.

**Input parameters:** `{ cycleId }`

**Step-by-step logic**

1. Lock vote: set `phase → EVICTION_VOTE_CLOSED`.
2. Aggregate ballots **in DB** grouped by `evictRosterId`; exclude invalid.
3. If tie between top two → apply `evictionTieBreakMode`:  
   - `hoh_vote` → create sub-phase `EVICTION_TIE_HOH` with deadline; notify HOH via DM template + commissioner.  
   - `season_points` → evict roster with **lower** season PF (define tie again → next rule).  
   - `random` / `commissioner` → audit + pick.
4. If not tie → set `winningEvictTargetRosterId` in memory for step 9.

**DB:** Phase update only here; tally in next step or same txn.

**Audit:** `VOTE_CLOSED`, `VOTE_TIE_DETECTED`, `VOTE_TIE_BROKEN`

**Errors:** Retry.

**Ambiguous:** Multi-way tie → reduce to two highest vote getters then tie-break.

**Commissioner notification:** On tie and on HOH tie-break open.

**Override:** Commissioner force evict target.

---

## 9. Vote tallying and eviction processing

### `tallyVotesAndRevealEviction` — `lib/big-brother/automation/vote.ts`  
### `processEvictionForCycle` — `lib/big-brother/automation/eviction.ts`

**Trigger:** After tie resolved OR immediately after `EVICTION_VOTE_CLOSED` if no tie.

**Input parameters:** `{ cycleId, evictedRosterId }`

**Step-by-step logic (`tallyVotesAndRevealEviction`)**

1. Compute **public** tally JSON (counts only); **never** write voter ids to public tables.
2. Insert `BigBrotherEvictionRecord`.
3. Set `phase → EVICTION_REVEAL` briefly then `EVICTION_PROCESSING`.

**Step-by-step logic (`processEvictionForCycle`)**

1. **Transaction start** (short): update `BigBrotherHouseMembership` to `EVICTED`, `evictedAt`, `evictedCycleId`.
2. Call **`releaseEvictedRosterToWaivers`** (system 10) — may be async job.
3. Void pending trades involving roster (PRD).
4. Update jury if threshold met (system 11).
5. Set `cycle.evictedRosterId`; `phase → WEEK_COMPLETE` or next `HOH_COMP_OPEN` (system 13).

**DB:** Eviction record, membership, cycle, trade updates, job queue.

**Audit:** `EVICTION_TALLIED`, `EVICTION_COMMITTED`, `TRADES_VOIDED`

**Errors:** If waiver job fails → **do not** roll back eviction decision; set `processingJobId` + retry job; audit `EVICTION_WAIVER_RETRY`.

**Ambiguous:** N/A if `evictedRosterId` explicit.

**Commissioner notification:** Summary post-eviction.

**Override:** Commissioner undo **not** supported v1 — only forward fixes with audit.

---

## 10. Roster release to waivers post-eviction

### `releaseEvictedRosterToWaivers` — `lib/big-brother/automation/eviction.ts`

**Trigger:** Called from `processEvictionForCycle` (async job acceptable).

**Input parameters:** `{ evictedRosterId, leagueId, redraftSeasonId, config }`

**Step-by-step logic**

1. Load all `RedraftRosterPlayer` for roster.
2. For each, **drop** to waivers / FA per `waiverReleaseTiming` on config (`immediate` | `next_waiver_run` | `faab_window`).
3. Use **existing redraft waiver transaction** primitives (same as guillotine roster release patterns conceptually).
4. Mark roster **non-scoring**: implement via `BigBrotherHouseMembership` + **league scoring engine** skip list OR `RedraftRoster` flag `bbEvictedAt` (**add column** in migration — scoring layer checks).

**DB:** Bulk player updates; waiver claims creation; optional roster flag.

**Audit:** `WAIVERS_RELEASED` `{ playerCount, timing }`

**Errors:** Retry per player batch; dead-letter after N attempts → commissioner alert.

**Ambiguous:** N/A.

**Commissioner notification:** Failure digest.

**Override:** Commissioner manual waiver fix tools (platform).

---

## 11. Jury routing

### `routeEvictedToJuryIfNeeded` — `lib/big-brother/automation/jury.ts`

**Trigger:** Inside `processEvictionForCycle` after eviction committed.

**Input parameters:** `{ configId, leagueId, evictedRosterId, scoringWeek }`

**Step-by-step logic**

1. Evaluate `juryStartMode` + commissioner overrides from config.
2. If jury active: upsert `BigBrotherJuryMember` (unique league+roster).
3. If finale threshold (e.g. remaining active house ≤ finale size): set `phase` family to `JURY_PHASE` / `FINALE_PREP` on **anchor** or cycle.

**DB:** Insert jury row; possibly update `BigBrotherSeasonAnchor`.

**Audit:** `JURY_MEMBER_ADDED`, `JURY_PHASE_STARTED`

**Errors:** Retry; unique violation idempotent.

**Ambiguous:** Overlapping rules → **strict order** in code comments + tests.

**Commissioner notification:** Jury phase start.

**Override:** Commissioner adjust jury start week (config save + audit in `BigBrotherOverrideLog`).

---

## 12. Deadline reminder scheduling

### `scheduleBbDeadlineReminders` — `lib/big-brother/automation/reminders.ts`  
### `runBbReminderSweep` — same file

**Trigger:** Cron `GET /api/big-brother/cron/reminders` **or** every 3rd automation tick.

**Input parameters:** `{ now }`

**Step-by-step logic**

1. For each active cycle with `phaseDeadlineAt` in (now+24h, now+1h] windows, check Redis key `bb:reminder:{cycleId}:{window}` SET NX.
2. If Chimmy + subscription on: enqueue `BigBrotherNotificationLog` rows (IN_APP + PUSH + EMAIL per prefs).
3. Message templates keyed by phase (`NOMINATION_REMINDER`, etc.).

**DB:** Insert notification log; external send worker updates status.

**Audit:** `REMINDER_SCHEDULED` (optional, can be noisy — sample 10% or only failures).

**Errors:** Non-blocking; log only.

**Ambiguous:** N/A.

**Commissioner notification:** Optional "3 managers haven’t voted" aggregate (privacy-safe counts only).

**Override:** Commissioner disable reminders toggle on config (add field `remindersEnabled`).

---

## 13. Weekly cycle reset

### `advanceToNextBbWeekOrComplete` — `lib/big-brother/automation/cycleReset.ts`

**Trigger:** After `WEEK_COMPLETE` processing when `phase` idle and fantasy week rolls (or immediately after eviction processing completes same week).

**Input parameters:** `{ configId, redraftSeasonId, lastCycleId }`

**Step-by-step logic**

1. If season over (final BB vote week reached) → `status → completed`, archive cycles.
2. Else create **new** `BigBrotherCycle` for `scoringWeek + 1` with fresh `phaseInstanceId`, `phase = HOH_COMP_OPEN`, deadlines from config template.
3. Increment `BigBrotherSeasonAnchor.currentBbWeek`.
4. If double eviction required (schedule math — PRD): set flag `doubleEvictionThisWeek` on new cycle.

**DB:** Insert cycle; update anchor.

**Audit:** `CYCLE_RESET`, `NEW_BB_WEEK`

**Errors:** Unique `(configId, scoringWeek)` conflict → idempotent return.

**Ambiguous:** Week alignment with redraft `currentWeek` — **source of truth** = redraft season week from platform.

**Commissioner notification:** "New BB week started."

**Override:** Pause prevents this.

---

## 14. Stat correction window management

### `handleBbStatCorrectionSignal` — `lib/big-brother/automation/statCorrection.ts`

**Trigger:** Cron hourly **or** webhook when redraft scoring marks week **corrected** (if platform has signal).

**Input parameters:** `{ leagueId?, redraftSeasonId?, week? }`

**Step-by-step logic (v1 PRD)**

1. For each affected week, detect if `BigBrotherHohRecord` or POV comp used **finalized** scores for that week **after** BB already advanced.
2. **Do not** re-assign HOH/POV automatically (PRD v1).
3. Insert audit `STAT_CORRECTION_NOTED` with `{ week, cycleIds[], hohRosterIdSnapshot }`.
4. Notify **commissioner**: "Scores changed for week W; Big Brother outcomes stand. Override manually if needed."
5. Optional **future flag** `allowStatCorrectionReplay` (P2): if true, enqueue commissioner-only confirmation flow.

**DB:** Audit only v1.

**Audit:** `STAT_CORRECTION_NOTED`

**Errors:** None critical.

**Ambiguous:** N/A.

**Commissioner notification:** Always when correction touches a BB week.

**Override:** Commissioner manual HOH/POV override + `BigBrotherOverrideLog`.

---

## Commissioner override hooks (summary)

| Hook | Route / function | Effect |
|------|------------------|--------|
| Force phase | `POST .../commissioner/force-phase` | Sets `cycle.phase`, new `phaseInstanceId`, clears `automationStuckReason` |
| Extend deadline | `POST .../extend-deadline` | Updates `phaseInstance.deadlines` JSON |
| Pause / resume | `POST .../pause` | `weekProgressionPaused` |
| Set HOH / nominees / veto | Destructive mutators | Writes rows + `BigBrotherOverrideLog` |
| Re-run automation | `POST .../cron/automation?leagueId=` + admin secret | Manual tick |

---

## Testing checklist

- [ ] Double cron: same phase not advanced twice (lock + unique constraints).
- [ ] Neon statement timeout: partial failure leaves auditable stuck state.
- [ ] Subscription off: no silent auto-eviction of nominations (per chosen policy).
- [ ] Tie at every tie point.
- [ ] Empty replacement pool.
- [ ] Waiver release failure retry.

---

**End of spec**
