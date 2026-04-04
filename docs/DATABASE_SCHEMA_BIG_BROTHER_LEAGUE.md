# Big Brother League — Database Schema (PostgreSQL / Prisma)

**Role:** Backend + data architecture handoff  
**Companion:** `docs/PRD_BIG_BROTHER_LEAGUE.md`, `docs/UX_BIG_BROTHER_JOURNEY_AND_COMMANDS.md`  
**Foundation:** Existing `League`, `RedraftSeason`, `RedraftRoster`, `RedraftMatchup`, `PlayerWeeklyScore` (and roster scoring paths). **BB data lives in separate tables** joined by FK — never embed BB state inside `RedraftRoster` rows as the source of truth.

---

## 1. Existing models in repo (baseline)

The Prisma schema already contains a **partial** BB engine under `BigBrotherLeagueConfig`, `BigBrotherCycle`, `BigBrotherEvictionVote`, `BigBrotherJuryMember`, `BigBrotherFinaleVote`, `BigBrotherAuditLog` (see `prisma/schema.prisma` ~6332–6488). Those models use **`String` phases** and **`rosterId` as `String @db.VarChar(64)` without Prisma relations** to `RedraftRoster`.

**This document:**

- Defines **canonical enums** and **new tables** required by the PRD/UX specs.
- Recommends **additive migrations**: add FK columns + new models; optionally **backfill** then enforce relations.
- Maps your requested names → **implementation names** (some already exist under different names).

| Requested name | Implementation |
|----------------|----------------|
| `BigBrotherLeague` | **`BigBrotherLeagueConfig`** (1:1 with `League`) — rename only if you accept a breaking migration |
| `BigBrotherCycle` | **`BigBrotherCycle`** (exists) — extend |
| `EvictionVote` | **`BigBrotherEvictionVote`** (exists) — extend |
| `JuryMember` | **`BigBrotherJuryMember`** (exists) — extend |
| `HOHRecord`, `NomineeRecord`, … | **New tables** below |

---

## 2. Enum definitions (Prisma `enum`)

Use native Prisma enums for **new** fields; existing `String` columns can be migrated in a follow-up migration.

```prisma
/// Canonical BB phase (aligns UX + state machine).
enum BigBrotherPhase {
  SETUP
  HOH_COMP_OPEN
  HOH_COMP_LOCKED
  HOH_COMPLETE
  NOMINATIONS_OPEN
  NOMINATIONS_COMPLETE
  POV_PLAYER_PICK_OPEN
  POV_COMP_OPEN
  POV_COMPLETE
  VETO_CEREMONY_OPEN
  REPLACEMENT_OPEN
  EVICTION_VOTE_OPEN
  EVICTION_VOTE_CLOSED
  EVICTION_REVEAL
  EVICTION_PROCESSING
  WEEK_COMPLETE
  JURY_PHASE
  FINALE_PREP
  JURY_VOTE_OPEN
  FINALE_COMPLETE
  ARCHIVED
}

enum BigBrotherCompetitionType {
  FANTASY_WEEK_SCORE
  MANUAL_COMMISSIONER
  CUSTOM_MINI_GAME
}

enum BigBrotherVetoParticipantSource {
  HOH
  NOMINEE
  RANDOM_DRAW
  HOUSE_PICK
}

enum BigBrotherVoteChannel {
  CHIMMY_DM
  CHIMMY_LEAGUE
  API_FALLBACK_UI
}

enum BigBrotherOverrideType {
  FORCE_PHASE_ADVANCE
  EXTEND_DEADLINE
  PAUSE_OVERLAY
  RESUME_OVERLAY
  UNDO_NOMINATION
  SET_HOH
  VOID_CYCLE
  JURY_TIMING_CHANGE
  MANUAL_EVICTION
}

enum BigBrotherNotificationChannel {
  PUSH
  EMAIL
  IN_APP
}

enum BigBrotherNotificationStatus {
  QUEUED
  SENT
  FAILED
  SKIPPED
}

enum BigBrotherHouseMembershipStatus {
  ACTIVE
  EVICTED
  FINALIST
  WINNER
  AUTO_EVICTED_ABANDONMENT
}

enum BigBrotherMiniGameSubmissionStatus {
  PENDING
  LOCKED
  DISQUALIFIED
  WITHDRAWN
}
```

**Migration note:** If `BigBrotherCycle.phase` stays `String` during transition, maintain a **view or app-layer** map `String ↔ BigBrotherPhase`; second migration converts column to enum.

---

## 3. Core relationship diagram (logical)

```
League 1──1 BigBrotherLeagueConfig
League 1──N RedraftSeason
RedraftSeason 1──N RedraftRoster

BigBrotherLeagueConfig 1──N BigBrotherCycle
BigBrotherLeagueConfig 1──N BigBrotherHouseMembership
BigBrotherLeagueConfig 1──N BigBrotherJuryMember (existing)
BigBrotherLeagueConfig 1──N BigBrotherAuditLog (existing)

RedraftSeason 1──1 BigBrotherSeasonAnchor (optional but recommended)
BigBrotherCycle N──1 RedraftSeason (recommended FK: which fantasy season this BB week belongs to)

BigBrotherCycle 1──1 BigBrotherPhaseInstance (idempotency / Chimmy)
BigBrotherCycle 1──0..1 BigBrotherHohRecord
BigBrotherCycle 1──N BigBrotherNomineeRecord
BigBrotherCycle 1──N BigBrotherVetoParticipant
BigBrotherCycle 1──0..1 BigBrotherVetoResult
BigBrotherCycle 1──N BigBrotherEvictionVote
BigBrotherCycle 1──0..1 BigBrotherEvictionRecord
BigBrotherCycle 1──N BigBrotherHohMiniGameSubmission
BigBrotherCycle 1──0..1 BigBrotherHohMiniGameResult

BigBrotherLeagueConfig 1──N BigBrotherFinalistRecord (finale)
BigBrotherLeagueConfig 1──N BigBrotherFinaleVote (existing)

BigBrotherLeagueConfig 1──N BigBrotherOverrideLog
BigBrotherLeagueConfig 1──N BigBrotherChatCommandLog
BigBrotherLeagueConfig 1──N BigBrotherNotificationLog
```

---

## 4. Model specifications

### 4.1 `BigBrotherLeagueConfig` (logical **BigBrotherLeague**) — *extend existing*

**Purpose:** One row per `League` when BB mode is enabled. **Source of truth for settings**; no fantasy scoring here.

| Field | Type | Null | Default | Purpose |
|-------|------|------|---------|---------|
| `id` | String (uuid/cuid) | NO | uuid | PK |
| `leagueId` | String | NO | — | FK → `League.id` **unique** |
| `redraftSeasonId` | String | YES | null | **Recommended add:** FK → `RedraftSeason.id` — BB season anchor (nullable until draft completes) |
| `commissionerUserId` | String | YES | null | FK → `AppUser.id` — owner of AF Commissioner subscription context |
| `chimmyAutomationEnabled` | Boolean | NO | false | False when subscription lapses |
| `status` | String or enum | NO | `active` | `active` \| `paused` \| `completed` \| `archived` |
| `houseMin` | Int | NO | 12 | PRD |
| `houseMax` | Int | NO | 18 | PRD |
| `nomineeCount` | Int | NO | 2 | Nominations |
| `finaleVoteWeekOffset` | Int | NO | 1 | Final BB vote = regular season end week − offset |
| `sealedBallotRevealAt` | DateTime | YES | null | When individual ballots may be shown |
| *…existing fields…* | | | | Keep `hohChallengeDayOfWeek`, `juryStartMode`, etc. |

**Indexes:** `@@unique([leagueId])`; add `@@index([redraftSeasonId])`, `@@index([status])`.

**Relations:** `league`, `redraftSeason?`, `commissionerUser?`, `cycles[]`, `houseMemberships[]`, …

---

### 4.2 `BigBrotherSeasonAnchor` (optional 1:1 with `RedraftSeason`) — *new*

**Purpose:** Explicit link “this redraft season runs BB overlay v1” and store BB-specific season counters.

```prisma
model BigBrotherSeasonAnchor {
  id             String        @id @default(cuid())
  redraftSeasonId String       @unique
  redraftSeason  RedraftSeason @relation(fields: [redraftSeasonId], references: [id], onDelete: Cascade)
  configId       String
  config         BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  /// Monotonic BB week index (1..N), may mirror redraft scoring week when aligned.
  currentBbWeek   Int       @default(1)
  evictionsSoFar  Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  archivedAt      DateTime?

  cycles BigBrotherCycle[]

  @@index([configId])
  @@map("big_brother_season_anchors")
}
```

---

### 4.3 `BigBrotherCycle` (weekly) — *extend existing*

**Purpose:** One row per **BB week** (eviction cycle). **Phase machine** row.

| Field | Type | Null | Default | Purpose |
|-------|------|------|---------|---------|
| `id` | String | NO | uuid | PK |
| `configId` | String | NO | — | FK → config |
| `leagueId` | String | NO | — | Denormalized from league for query perf (keep) |
| `redraftSeasonId` | String | NO | — | **Add FK** → `RedraftSeason` |
| `scoringWeek` | Int | NO | — | Aligns to redraft/fantasy week (rename from `week` if desired) |
| `phase` | BigBrotherPhase (or String) | NO | HOH_COMP_OPEN | State |
| `phaseInstanceId` | String | NO | cuid | **Add** — idempotency token for votes/commands |
| `phaseStartedAt` | DateTime | YES | null | |
| `phaseDeadlineAt` | DateTime | YES | null | Current sub-phase deadline |
| *existing:* `hohRosterId`, nominees, veto fields | | | | Prefer **migrate to FK** `RedraftRoster` below; keep JSON backup during migration |
| `archivedAt` | DateTime | YES | null | Soft archive |

**Indexes:** `@@unique([configId, scoringWeek])` or `@@unique([redraftSeasonId, scoringWeek])`; `@@index([leagueId, scoringWeek])`; `@@index([phase, phaseDeadlineAt])`.

**Relations:** `config`, `redraftSeason`, `votes[]`, `hohRecord?`, `nominees[]`, `vetoParticipants[]`, `vetoResult?`, `evictionRecord?`, `miniGameSubmissions[]`, `miniGameResult?`, `phaseInstance?`.

---

### 4.4 `BigBrotherPhaseInstance` — *new*

**Purpose:** Stable id for Chimmy idempotency (`phaseInstanceId`); stores sub-deadlines JSON.

```prisma
model BigBrotherPhaseInstance {
  id        String   @id @default(cuid())
  cycleId   String   @unique
  cycle     BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  openedAt  DateTime @default(now())
  closedAt  DateTime?
  /// JSON: { nominationsCloseAt, vetoDecisionAt, voteCloseAt, ... }
  deadlines Json?

  @@map("big_brother_phase_instances")
}
```

---

### 4.5 `BigBrotherHouseMembership` — *new*

**Purpose:** Map **`AppUser` + `RedraftRoster`** to BB house; status for eviction/jury/finalist. Avoid overloading `RedraftRoster` columns.

```prisma
model BigBrotherHouseMembership {
  id          String   @id @default(cuid())
  configId    String
  config      BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  redraftRosterId String
  roster      RedraftRoster @relation(fields: [redraftRosterId], references: [id], onDelete: Cascade)
  appUserId   String
  appUser     AppUser @relation(fields: [appUserId], references: [id], onDelete: Cascade)

  status      BigBrotherHouseMembershipStatus @default(ACTIVE)
  enteredAt   DateTime @default(now())
  evictedAt   DateTime?
  evictedCycleId String?
  deletedAt   DateTime? /// soft delete if roster reassigned (should be rare)

  @@unique([configId, redraftRosterId])
  @@index([configId, status])
  @@index([appUserId])
  @@map("big_brother_house_memberships")
}
```

---

### 4.6 `BigBrotherHohRecord` (requested **HOHRecord**) — *new*

**Purpose:** Immutable(ish) record of **how** HOH was decided for the cycle.

```prisma
model BigBrotherHohRecord {
  id              String   @id @default(cuid())
  cycleId         String   @unique
  cycle           BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  competitionType BigBrotherCompetitionType
  /// Fantasy: sum of weekly team points for scoringWeek; mini-game: separate result FK
  redraftWeek     Int
  hohRosterId     String
  hohRoster       RedraftRoster @relation("BbHohWinnerRoster", fields: [hohRosterId], references: [id], onDelete: Restrict)

  /// Final ranked scores snapshot for audit (rosterId -> points)
  scoreBreakdown  Json?
  tieBreakApplied String?  @db.VarChar(64)
  decidedAt       DateTime @default(now())
  decidedByUserId String?  /// commissioner manual HOH
  voidedAt        DateTime?
  voidReason      String?  @db.VarChar(512)

  @@index([hohRosterId])
  @@map("big_brother_hoh_records")
}
```

---

### 4.7 `BigBrotherNomineeRecord` (requested **NomineeRecord**) — *new*

**Purpose:** Normalized nominations (supports N nominees, reorder, audit).

```prisma
model BigBrotherNomineeRecord {
  id          String   @id @default(cuid())
  cycleId     String
  cycle       BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  nomineeRosterId String
  roster      RedraftRoster @relation("BbNomineeRoster", fields: [nomineeRosterId], references: [id], onDelete: Restrict)

  slotIndex   Int      /// 0..N-1
  nominatedAt DateTime @default(now())
  nominatedByUserId String /// HOH app user
  /// After veto: still on block or saved
  onBlock     Boolean  @default(true)
  removedAt   DateTime?

  @@unique([cycleId, nomineeRosterId])
  @@index([cycleId, onBlock])
  @@map("big_brother_nominee_records")
}
```

---

### 4.8 `BigBrotherVetoParticipant` (requested **VetoParticipant**) — *new*

```prisma
model BigBrotherVetoParticipant {
  id          String   @id @default(cuid())
  cycleId     String
  cycle       BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  rosterId    String
  roster      RedraftRoster @relation("BbVetoPoolRoster", fields: [rosterId], references: [id], onDelete: Restrict)

  source      BigBrotherVetoParticipantSource
  drawOrder   Int?     /// stable ordering for ceremony
  pickedByUserId String? /// house pick command

  createdAt   DateTime @default(now())

  @@unique([cycleId, rosterId])
  @@index([cycleId])
  @@map("big_brother_veto_participants")
}
```

---

### 4.9 `BigBrotherVetoResult` (requested **VetoResult**) — *new*

```prisma
model BigBrotherVetoResult {
  id              String   @id @default(cuid())
  cycleId         String   @unique
  cycle           BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  winnerRosterId  String
  winnerRoster    RedraftRoster @relation("BbVetoWinnerRoster", fields: [winnerRosterId], references: [id], onDelete: Restrict)

  vetoUsed        Boolean
  savedRosterId   String?
  savedRoster     RedraftRoster? @relation("BbVetoSavedRoster", fields: [savedRosterId], references: [id], onDelete: SetNull)

  decidedAt       DateTime @default(now())
  decidedByUserId String   /// POV holder

  @@index([winnerRosterId])
  @@map("big_brother_veto_results")
}
```

---

### 4.10 `BigBrotherEvictionVote` (requested **EvictionVote**) — *extend existing*

**Purpose:** **Sealed** ballot; one per voter per cycle.

| Add field | Type | Purpose |
|-----------|------|---------|
| `id` | cuid | PK (exists) |
| `phaseInstanceId` | String | FK → `BigBrotherPhaseInstance.id` (optional) |
| `voterUserId` | String | FK → `AppUser` (in addition to roster for DM verification) |
| `evictRosterId` | String | FK → `RedraftRoster` (replace loose `targetRosterId` naming) |
| `channel` | BigBrotherVoteChannel | DM vs league vs UI |
| `payloadHash` | String? | Optional integrity hash of (cycle, voter, choice) |
| `revealedAt` | DateTime? | null until season-end reveal |

**Indexes:** `@@unique([cycleId, voterRosterId])` → consider `@@unique([cycleId, voterUserId])` if one user one roster invariant breaks.

```prisma
/// Example additive shape (merge with existing table in one migration).
model BigBrotherEvictionVote {
  id              String   @id @default(cuid())
  cycleId         String
  cycle           BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  voterRosterId   String
  voterRoster     RedraftRoster @relation("BbEvictionVoter", fields: [voterRosterId], references: [id], onDelete: Cascade)
  voterUserId     String
  voterUser       AppUser @relation(fields: [voterUserId], references: [id], onDelete: Cascade)

  evictRosterId   String
  evictRoster     RedraftRoster @relation("BbEvictionTarget", fields: [evictRosterId], references: [id], onDelete: Restrict)

  channel         BigBrotherVoteChannel @default(CHIMMY_DM)
  phaseInstanceId String?
  revealedAt      DateTime?

  createdAt       DateTime @default(now())

  @@unique([cycleId, voterRosterId])
  @@index([cycleId])
  @@index([voterUserId])
  @@map("big_brother_eviction_votes")
}
```

---

### 4.11 `BigBrotherEvictionRecord` (requested **EvictionRecord**) — *new*

**Purpose:** **Public** outcome row post-tally; separate from individual ballots.

```prisma
model BigBrotherEvictionRecord {
  id                String   @id @default(cuid())
  cycleId           String   @unique
  cycle             BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  evictedRosterId   String
  evictedRoster     RedraftRoster @relation("BbEvictedRoster", fields: [evictedRosterId], references: [id], onDelete: Restrict)

  /// Public counts only (e.g. { "rosterA": 4, "rosterB": 3 }) — no voter ids
  publicTallyJson   Json
  tieBreakMode      String   @db.VarChar(32)
  revealedAt        DateTime @default(now())
  processingJobId   String?  @db.VarChar(64) /// waivers release job

  @@index([evictedRosterId])
  @@map("big_brother_eviction_records")
}
```

---

### 4.12 `BigBrotherJuryMember` (requested **JuryMember**) — *extend existing*

Add FKs:

- `redraftRosterId` → `RedraftRoster` (replace plain string)
- `configId` (exists)
- `evictedCycleId` → `BigBrotherCycle` optional

```prisma
model BigBrotherJuryMember {
  id              String   @id @default(cuid())
  leagueId        String   @db.VarChar(64)
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  redraftRosterId String
  roster          RedraftRoster @relation("BbJuryRoster", fields: [redraftRosterId], references: [id], onDelete: Cascade)

  evictedWeek     Int
  evictedCycleId  String?

  joinedAt        DateTime @default(now())

  @@unique([leagueId, redraftRosterId])
  @@index([configId])
  @@map("big_brother_jury_members")
}
```

---

### 4.13 `BigBrotherFinalistRecord` (requested **FinalistRecord**) — *new*

```prisma
model BigBrotherFinalistRecord {
  id              String   @id @default(cuid())
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  redraftRosterId String
  roster          RedraftRoster @relation("BbFinalistRoster", fields: [redraftRosterId], references: [id], onDelete: Cascade)

  finalistSlot    Int      /// 1 or 2 (or 3)
  clinchedAt      DateTime @default(now())
  clinchedCycleId String?

  @@unique([configId, redraftRosterId])
  @@index([configId])
  @@map("big_brother_finalist_records")
}
```

**`BigBrotherFinaleVote`** (existing): add FKs to `redraftRoster` for `juryRosterId` / `targetRosterId`; optional `phaseInstanceId`, `revealedAt`.

---

### 4.14 `BigBrotherOverrideLog` (requested **OverrideLog**) — *new*

**Purpose:** Commissioner overrides; **separate** from generic `BigBrotherAuditLog` for compliance queries (or unify via `eventType` — two tables preferred for clarity).

```prisma
model BigBrotherOverrideLog {
  id            String   @id @default(cuid())
  configId      String
  config        BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  actorUserId   String
  actor         AppUser @relation(fields: [actorUserId], references: [id], onDelete: Restrict)

  overrideType  BigBrotherOverrideType
  cycleId       String?
  cycle         BigBrotherCycle? @relation(fields: [cycleId], references: [id], onDelete: SetNull)

  reason        String   @db.VarChar(1024)
  payloadBefore Json?
  payloadAfter  Json?
  createdAt     DateTime @default(now())

  @@index([configId, createdAt])
  @@index([actorUserId])
  @@map("big_brother_override_logs")
}
```

---

### 4.15 `BigBrotherChatCommandLog` (requested **ChatCommandLog**) — *new*

```prisma
model BigBrotherChatCommandLog {
  id            String   @id @default(cuid())
  configId      String
  config        BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  leagueId      String
  senderUserId  String
  sender        AppUser @relation(fields: [senderUserId], references: [id], onDelete: Cascade)

  surface       String   @db.VarChar(16) /// league_chat | dm
  rawMessage    String   @db.Text
  parsedCommand String?  @db.VarChar(64)
  success       Boolean
  errorCode     String?  @db.VarChar(64)

  cycleId       String?
  phaseInstanceId String?

  createdAt     DateTime @default(now())

  @@index([configId, createdAt])
  @@index([senderUserId, createdAt])
  @@index([leagueId, createdAt])
  @@map("big_brother_chat_command_logs")
}
```

---

### 4.16 `BigBrotherNotificationLog` (requested **BBNotificationLog**) — *new*

```prisma
model BigBrotherNotificationLog {
  id            String   @id @default(cuid())
  configId      String
  config        BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  targetUserId  String
  targetUser    AppUser @relation(fields: [targetUserId], references: [id], onDelete: Cascade)

  channel       BigBrotherNotificationChannel
  templateKey   String   @db.VarChar(64)
  payloadJson   Json?
  status        BigBrotherNotificationStatus @default(QUEUED)
  sentAt        DateTime?
  errorMessage  String?  @db.Text

  cycleId       String?

  createdAt     DateTime @default(now())

  @@index([targetUserId, status])
  @@index([configId, createdAt])
  @@map("big_brother_notification_logs")
}
```

---

### 4.17 `BigBrotherHohMiniGameSubmission` (requested **HOHMiniGameSubmission**) — *new*

**Purpose:** Non–fantasy-score HOH (quiz, pick’em) or **lock token** before fantasy lock.

```prisma
model BigBrotherHohMiniGameSubmission {
  id            String   @id @default(cuid())
  cycleId       String
  cycle         BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  rosterId      String
  roster        RedraftRoster @relation("BbHohMiniSubRoster", fields: [rosterId], references: [id], onDelete: Cascade)

  appUserId     String
  appUser       AppUser @relation(fields: [appUserId], references: [id], onDelete: Cascade)

  status        BigBrotherMiniGameSubmissionStatus @default(PENDING)
  /// Answers, picks, or reference to external game id
  payloadJson   Json
  lockedAt      DateTime?

  @@unique([cycleId, rosterId])
  @@index([cycleId, status])
  @@map("big_brother_hoh_mini_game_submissions")
}
```

---

### 4.18 `BigBrotherHohMiniGameResult` (requested **HOHMiniGameResult**) — *new*

```prisma
model BigBrotherHohMiniGameResult {
  id            String   @id @default(cuid())
  cycleId       String   @unique
  cycle         BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  /// Ranked rosterIds, scores, tie-break
  resultJson    Json
  source        String   @db.VarChar(32) /// engine version / quiz id
  computedAt    DateTime @default(now())

  @@map("big_brother_hoh_mini_game_results")
}
```

**Note:** When HOH = **fantasy week score**, you may **skip** mini-game tables and use **`BigBrotherHohRecord.scoreBreakdown`** fed from **roster weekly points** (aggregated from existing scoring pipeline / `PlayerWeeklyScore` via join through `RedraftRosterPlayer` — not a direct FK to `PlayerWeeklyScore`).

---

## 5. `PlayerWeeklyScore` and redraft integration

- **Do not** add BB columns to `PlayerWeeklyScore`.
- **Read path:** HOH/POV competitions that use fantasy points: compute `SUM(points)` for starters (or league rules) in application or SQL view joining `RedraftRosterPlayer` → player IDs → weekly scores for `(sport, season, week)`.
- **Optional materialized table** (P1): `BigBrotherWeeklyTeamScore` (`cycleId`, `rosterId`, `fantasyPoints`, `computedAt`) for fast leaderboard — invalidate on stat correction.

---

## 6. Redis cache keys (real-time)

**Namespace:** `bb:{leagueId}:{redraftSeasonId}` or `bb:cycle:{cycleId}`.

| Key pattern | TTL | Payload (example) |
|-------------|-----|-------------------|
| `bb:cycle:{cycleId}:phase` | 24h | `{ phase, deadlineAt, phaseInstanceId }` |
| `bb:cycle:{cycleId}:public` | 1h | `{ hohRosterId, nominees[], vetoHolder }` — **no sealed votes** |
| `bb:league:{leagueId}:counts` | 5m | `{ activeHouseguests }` |
| `bb:cycle:{cycleId}:vote_progress` | 15m | `{ submitted: n, eligible: m }` — **not** who voted |
| `bb:cmd:dedupe:{hash}` | 60s | idempotency for command ingest |
| `bb:lock:cycle:{cycleId}:advance` | 30s | distributed lock for cron advance |

**Invalidation:** On any successful phase mutation, `DEL bb:cycle:{cycleId}:*` and league summary.

---

## 7. Audit log structure

**Two layers:**

1. **`BigBrotherAuditLog`** (existing): high-volume **event stream** — `eventType` (string enum in app), `metadata` JSON, `createdAt`. Use for: scoring finalized, phase transition, waiver job started/completed.

2. **`BigBrotherOverrideLog`**: **human commissioner** actions with before/after.

**Suggested `eventType` strings (app constant):**

`PHASE_TRANSITION`, `HOH_DECIDED`, `NOMINATION_SUBMITTED`, `VETO_POOL_SET`, `VETO_DECIDED`, `VOTE_CAST`, `VOTE_TALLIED`, `EVICTION_COMMITTED`, `WAIVERS_RELEASED`, `TRADE_VOIDED`, `JURY_ADDED`, `FINALE_VOTE_CAST`, `CHIMMY_COMMAND`, `NOTIFICATION_SENT`.

---

## 8. Soft-delete and archival

| Entity | Pattern |
|--------|---------|
| `BigBrotherLeagueConfig` | `status = archived`; keep rows **10y** per retention |
| `BigBrotherCycle` | `archivedAt` set when season ends; **no hard delete** |
| `BigBrotherHouseMembership` | `deletedAt` rare; prefer `status = EVICTED` with `evictedAt` |
| Votes | **Never hard delete**; `revealedAt` for disclosure |
| `ChatCommandLog` / `NotificationLog` | TTL archival job → cold storage after 90d (product decision) |

---

## 9. Migration notes (shared / existing models)

1. **`League`:** No change required; relation `bigBrotherConfig` exists.
2. **`RedraftSeason`:** Add **reverse** relation to `BigBrotherSeasonAnchor` and/or `BigBrotherLeagueConfig.redraftSeasonId`.
3. **`RedraftRoster`:** Add reverse relations for all `Bb*Roster` relations (Prisma will require `@relation` name disambiguation as shown).
4. **`AppUser`:** Add reverse arrays for `BigBrotherHouseMembership`, `BigBrotherChatCommandLog`, etc.
5. **`BigBrotherCycle`:** Backfill `redraftSeasonId` from active season for `leagueId`; then `NOT NULL` + FK.
6. **`BigBrotherEvictionVote`:** Migrate `voterRosterId`/`targetRosterId` → proper FKs; backfill `voterUserId` from roster owner.
7. **Enum migration:** Add enums + new columns; backfill from string `phase`; cut over reads; drop string in later migration.

**Order:** `enums` → `BigBrotherSeasonAnchor` / config columns → `BigBrotherPhaseInstance` → new child tables → backfill → FK constraints → Redis consumers deploy.

---

## 10. Prisma schema block (consolidated **new** models — merge manually)

Below is **illustrative**; relation names must be merged with existing `BigBrother*` models and `RedraftRoster` / `AppUser` back-relations in your actual `schema.prisma`.

```prisma
// --- Add enums from §2 above ---

model BigBrotherSeasonAnchor {
  id              String   @id @default(cuid())
  redraftSeasonId String   @unique
  redraftSeason   RedraftSeason @relation(fields: [redraftSeasonId], references: [id], onDelete: Cascade)
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  currentBbWeek   Int      @default(1)
  evictionsSoFar  Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  archivedAt      DateTime?

  cycles BigBrotherCycle[]

  @@index([configId])
  @@map("big_brother_season_anchors")
}

model BigBrotherPhaseInstance {
  id        String   @id @default(cuid())
  cycleId   String   @unique
  cycle     BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  openedAt  DateTime @default(now())
  closedAt  DateTime?
  deadlines Json?

  @@map("big_brother_phase_instances")
}

model BigBrotherHouseMembership {
  id              String   @id @default(cuid())
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  redraftRosterId String
  roster          RedraftRoster @relation(fields: [redraftRosterId], references: [id], onDelete: Cascade)
  appUserId       String
  appUser         AppUser @relation(fields: [appUserId], references: [id], onDelete: Cascade)
  status          BigBrotherHouseMembershipStatus @default(ACTIVE)
  enteredAt       DateTime @default(now())
  evictedAt       DateTime?
  evictedCycleId  String?
  deletedAt       DateTime?

  @@unique([configId, redraftRosterId])
  @@index([configId, status])
  @@index([appUserId])
  @@map("big_brother_house_memberships")
}

model BigBrotherHohRecord {
  id              String   @id @default(cuid())
  cycleId         String   @unique
  cycle           BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  competitionType BigBrotherCompetitionType
  redraftWeek     Int
  hohRosterId     String
  hohRoster       RedraftRoster @relation("BbHohWinnerRoster", fields: [hohRosterId], references: [id], onDelete: Restrict)
  scoreBreakdown  Json?
  tieBreakApplied String?  @db.VarChar(64)
  decidedAt       DateTime @default(now())
  decidedByUserId String?
  voidedAt        DateTime?
  voidReason      String?  @db.VarChar(512)

  @@index([hohRosterId])
  @@map("big_brother_hoh_records")
}

model BigBrotherNomineeRecord {
  id                String   @id @default(cuid())
  cycleId           String
  cycle             BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  nomineeRosterId   String
  roster            RedraftRoster @relation("BbNomineeRoster", fields: [nomineeRosterId], references: [id], onDelete: Restrict)
  slotIndex         Int
  nominatedAt       DateTime @default(now())
  nominatedByUserId String
  onBlock           Boolean  @default(true)
  removedAt         DateTime?

  @@unique([cycleId, nomineeRosterId])
  @@index([cycleId, onBlock])
  @@map("big_brother_nominee_records")
}

model BigBrotherVetoParticipant {
  id             String   @id @default(cuid())
  cycleId        String
  cycle          BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  rosterId       String
  roster         RedraftRoster @relation("BbVetoPoolRoster", fields: [rosterId], references: [id], onDelete: Restrict)
  source         BigBrotherVetoParticipantSource
  drawOrder      Int?
  pickedByUserId String?
  createdAt      DateTime @default(now())

  @@unique([cycleId, rosterId])
  @@index([cycleId])
  @@map("big_brother_veto_participants")
}

model BigBrotherVetoResult {
  id             String   @id @default(cuid())
  cycleId        String   @unique
  cycle          BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  winnerRosterId String
  winnerRoster   RedraftRoster @relation("BbVetoWinnerRoster", fields: [winnerRosterId], references: [id], onDelete: Restrict)
  vetoUsed       Boolean
  savedRosterId  String?
  savedRoster    RedraftRoster? @relation("BbVetoSavedRoster", fields: [savedRosterId], references: [id], onDelete: SetNull)
  decidedAt      DateTime @default(now())
  decidedByUserId String

  @@index([winnerRosterId])
  @@map("big_brother_veto_results")
}

model BigBrotherEvictionRecord {
  id              String   @id @default(cuid())
  cycleId         String   @unique
  cycle           BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  evictedRosterId String
  evictedRoster   RedraftRoster @relation("BbEvictedRoster", fields: [evictedRosterId], references: [id], onDelete: Restrict)
  publicTallyJson Json
  tieBreakMode    String   @db.VarChar(32)
  revealedAt      DateTime @default(now())
  processingJobId String?  @db.VarChar(64)

  @@index([evictedRosterId])
  @@map("big_brother_eviction_records")
}

model BigBrotherFinalistRecord {
  id              String   @id @default(cuid())
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  redraftRosterId String
  roster          RedraftRoster @relation("BbFinalistRoster", fields: [redraftRosterId], references: [id], onDelete: Cascade)
  finalistSlot    Int
  clinchedAt      DateTime @default(now())
  clinchedCycleId String?

  @@unique([configId, redraftRosterId])
  @@index([configId])
  @@map("big_brother_finalist_records")
}

model BigBrotherOverrideLog {
  id            String   @id @default(cuid())
  configId      String
  config        BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  actorUserId   String
  actor         AppUser @relation(fields: [actorUserId], references: [id], onDelete: Restrict)
  overrideType  BigBrotherOverrideType
  cycleId       String?
  cycle         BigBrotherCycle? @relation(fields: [cycleId], references: [id], onDelete: SetNull)
  reason        String   @db.VarChar(1024)
  payloadBefore Json?
  payloadAfter  Json?
  createdAt     DateTime @default(now())

  @@index([configId, createdAt])
  @@index([actorUserId])
  @@map("big_brother_override_logs")
}

model BigBrotherChatCommandLog {
  id              String   @id @default(cuid())
  configId        String
  config          BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  leagueId        String
  senderUserId    String
  sender          AppUser @relation(fields: [senderUserId], references: [id], onDelete: Cascade)
  surface         String   @db.VarChar(16)
  rawMessage      String   @db.Text
  parsedCommand   String?  @db.VarChar(64)
  success         Boolean
  errorCode       String?  @db.VarChar(64)
  cycleId         String?
  phaseInstanceId String?
  createdAt       DateTime @default(now())

  @@index([configId, createdAt])
  @@index([senderUserId, createdAt])
  @@index([leagueId, createdAt])
  @@map("big_brother_chat_command_logs")
}

model BigBrotherNotificationLog {
  id           String   @id @default(cuid())
  configId     String
  config       BigBrotherLeagueConfig @relation(fields: [configId], references: [id], onDelete: Cascade)
  targetUserId String
  targetUser   AppUser @relation(fields: [targetUserId], references: [id], onDelete: Cascade)
  channel      BigBrotherNotificationChannel
  templateKey  String   @db.VarChar(64)
  payloadJson  Json?
  status       BigBrotherNotificationStatus @default(QUEUED)
  sentAt       DateTime?
  errorMessage String?  @db.Text
  cycleId      String?
  createdAt    DateTime @default(now())

  @@index([targetUserId, status])
  @@index([configId, createdAt])
  @@map("big_brother_notification_logs")
}

model BigBrotherHohMiniGameSubmission {
  id          String   @id @default(cuid())
  cycleId     String
  cycle       BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  rosterId    String
  roster      RedraftRoster @relation("BbHohMiniSubRoster", fields: [rosterId], references: [id], onDelete: Cascade)
  appUserId   String
  appUser     AppUser @relation(fields: [appUserId], references: [id], onDelete: Cascade)
  status      BigBrotherMiniGameSubmissionStatus @default(PENDING)
  payloadJson Json
  lockedAt    DateTime?

  @@unique([cycleId, rosterId])
  @@index([cycleId, status])
  @@map("big_brother_hoh_mini_game_submissions")
}

model BigBrotherHohMiniGameResult {
  id         String   @id @default(cuid())
  cycleId    String   @unique
  cycle      BigBrotherCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  resultJson Json
  source     String   @db.VarChar(32)
  computedAt DateTime @default(now())

  @@map("big_brother_hoh_mini_game_results")
}
```

**Note:** You must add matching `BigBrotherCycle` relation fields for each `BigBrotherCycle @relation` above, and disambiguate `RedraftRoster` / `AppUser` back-relations with the quoted relation names.

---

## 11. Summary checklist for eng

- [ ] Align `BigBrotherCycle.phase` with `BigBrotherPhase` enum (migration plan).
- [ ] FK all loose `rosterId` strings to `RedraftRoster`.
- [ ] Add `redraftSeasonId` on config + cycle.
- [ ] Add `phaseInstanceId` + `BigBrotherPhaseInstance` for Chimmy idempotency.
- [ ] Split **vote** (`BigBrotherEvictionVote`) vs **outcome** (`BigBrotherEvictionRecord`).
- [ ] Implement Redis invalidation on phase writes.
- [ ] Do not modify `PlayerWeeklyScore` schema for BB; compute via joins.

---

**End of document**
