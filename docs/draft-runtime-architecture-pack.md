# AllFantasy Draft Runtime Architecture Pack

## 1. Draft State Machine

```mermaid
stateDiagram-v2
  [*] --> CREATED
  CREATED --> SCHEDULED: commissioner schedules draft
  SCHEDULED --> IN_PROGRESS: draft starts
  IN_PROGRESS --> PAUSED: commissioner pauses
  PAUSED --> IN_PROGRESS: commissioner resumes
  IN_PROGRESS --> COMPLETED: all picks completed
  IN_PROGRESS --> CANCELLED: commissioner/admin cancels
  PAUSED --> CANCELLED: commissioner/admin cancels

  IN_PROGRESS --> PICK_LOCKED: pick transaction begins
  PICK_LOCKED --> IN_PROGRESS: pick committed + next team on clock
  PICK_LOCKED --> ERROR_RECOVERY: transaction fails
  ERROR_RECOVERY --> IN_PROGRESS: repair/retry succeeds
```

**Rule:** No manual pick, auto-pick, or AI-assisted pick may commit unless state is `IN_PROGRESS`.

Paused drafts may allow:

- queue edits
- chat
- commissioner messages
- trades if allowed

Paused drafts must block:

- normal picks
- expired timer autopicks
- AI autopicks

---

## 2. Draft Session Lifecycle Map

```mermaid
flowchart TD
  A[League Created] --> B[Commissioner Configures Draft]
  B --> C[Draft Pool Resolved by Sport]
  C --> D[Sport-Specific ADP Loaded]
  D --> E[Roster Slots Loaded]
  E --> F[Draft Order Generated]
  F --> G[Draft Scheduled]
  G --> H[Draft Started]

  H --> I[Team On Clock]
  I --> J{Pick Made?}
  J -->|Manual Pick| K[Validate Pick]
  J -->|Timer Expires| L[Auto-Pick]
  J -->|Commissioner Force Pick| M[Commissioner Override]

  K --> N[Commit Pick Transaction]
  L --> N
  M --> N

  N --> O[Update Draft Board]
  O --> P[Assign Player Draft Rights]
  P --> Q[Post Draft Chat Event]
  Q --> R[Notify Next User On Clock]
  R --> S{Draft Complete?}

  S -->|No| I
  S -->|Yes| T[Finalize Rosters]
  T --> U[Lock/Activate League]
  U --> V[Post Draft Complete Event]
```

---

## 3. Race-Condition Sequences

### Manual Pick vs Auto-Pick

```mermaid
sequenceDiagram
  participant User
  participant API
  participant DraftLock
  participant DB
  participant AutoPick

  User->>API: Draft player
  AutoPick->>API: Timer expired auto-pick
  API->>DraftLock: acquire session lock
  DraftLock-->>API: lock granted
  API->>DB: verify current pick/version
  API->>DB: commit player pick
  API->>DraftLock: release lock

  AutoPick->>DraftLock: acquire lock
  DraftLock-->>AutoPick: lock granted
  AutoPick->>DB: verify current pick/version
  DB-->>AutoPick: stale pick rejected
  AutoPick->>DraftLock: release lock
```

### Undo Pick vs Auto-Pick

```mermaid
sequenceDiagram
  participant Commish
  participant API
  participant DraftLock
  participant DB
  participant AutoPick

  Commish->>API: Undo latest pick
  AutoPick->>API: Timer expired
  API->>DraftLock: acquire session lock
  API->>DB: verify expected latest pick
  API->>DB: remove pick + restore player
  API->>DB: reset session pointer
  API->>DraftLock: release lock

  AutoPick->>DraftLock: acquire session lock
  AutoPick->>DB: verify current overall
  DB-->>AutoPick: stale/rejected
```

### Pause vs Pick

```mermaid
sequenceDiagram
  participant Commish
  participant User
  participant API
  participant DB

  Commish->>API: Pause draft
  API->>DB: set status = PAUSED

  User->>API: Draft player
  API->>DB: read session status
  DB-->>API: PAUSED
  API-->>User: reject pick
```

**Launch rule:** This must be enforced server-side, not only in the UI.

---

## 4. DB Transaction Flow Chart

```mermaid
flowchart TD
  A[Pick Request] --> B[Acquire Draft Session Lock]
  B --> C[Read Draft Session + Version]
  C --> D{Status IN_PROGRESS?}
  D -->|No| X[Reject]
  D -->|Yes| E{Correct Team On Clock?}

  E -->|No| X
  E -->|Yes| F{Player Eligible + Available?}

  F -->|No| X
  F -->|Yes| G[Create DraftPick Record]

  G --> H[Mark Player Drafted]
  H --> I[Remove Player From Queues]
  I --> J[Update Draft Session Pointer]
  J --> K[Create Draft Chat Event]
  K --> L[Create Notification For Next Manager]
  L --> M[Commit Transaction]
  M --> N[Publish Realtime Event]
```

**Important:** AI recommendations, chat fan-out, emails, SMS, and heavy notifications should not block the pick transaction.

---

## 5. WebSocket / Realtime Migration Strategy

### Current Model

```mermaid
flowchart LR
  A[Client Polls Draft API] --> B[Server Checks Draft State]
  B --> C[Runs Automation Ticks]
  C --> D[Returns Snapshot]
```

### Target Model

```mermaid
flowchart LR
  A[Draft Event Committed] --> B[Draft Event Stream]
  B --> C[Realtime Channel]
  C --> D[Draft Room Clients]
  B --> E[Notification Worker]
  B --> F[AI Context Cache]
  B --> G[Chat Event Feed]
```

### Migration Phases

**Phase 1**

- Keep polling.
- Add stronger locks and idempotency.

**Phase 2**

- Add draft event stream table.
- Every pick/pause/resume/undo/trade creates an event.

**Phase 3**

- Add WebSocket/realtime subscriptions.
- Clients update board from events.

**Phase 4**

- Polling becomes fallback only.

---

## 6. Event-Sourcing Recommendation

Use an append-only `draft_events` table.

Suggested event types:

```ts
type DraftEventType =
  | "DRAFT_STARTED"
  | "DRAFT_PAUSED"
  | "DRAFT_RESUMED"
  | "PICK_MADE"
  | "AUTO_PICK_MADE"
  | "PICK_UNDONE"
  | "TRADE_PROPOSED"
  | "TRADE_ACCEPTED"
  | "TRADE_REJECTED"
  | "TIMER_EXPIRED"
  | "QUEUE_UPDATED"
  | "USER_ON_CLOCK"
  | "DRAFT_COMPLETED";
```

Each event should include:

```ts
{
  id: string;
  draftSessionId: string;
  leagueId: string;
  eventType: DraftEventType;
  actorUserId?: string;
  teamId?: string;
  overallPick?: number;
  round?: number;
  payload: Json;
  createdAt: Date;
  idempotencyKey: string;
}
```

Benefits:

- easier replay
- easier debugging
- better chat sync
- better notification sync
- safer recovery after failures
- easier Sleeper-style realtime UX

---

## 7. Lock Strategy Recommendation

Use a single authoritative draft mutation lock.

```mermaid
flowchart TD
  A[Mutation Request] --> B{Is Draft Runtime Mutation?}
  B -->|No| C[Normal Handler]
  B -->|Yes| D[Acquire Lock draftSessionId]
  D --> E{Lock Acquired?}
  E -->|No| F[Return retryable conflict]
  E -->|Yes| G[Validate Session Version]
  G --> H[Run Transaction]
  H --> I[Write Draft Event]
  I --> J[Release Lock]
```

Runtime mutations requiring lock:

- manual pick
- auto-pick
- undo pick
- pause
- resume
- trade accept
- trade cancel
- force pick
- draft completion

Queue editing does **not** need the same lock unless the user is currently on clock and auto-pick is executing.

---

## 8. Realtime Synchronization Architecture

```mermaid
flowchart TD
  A[Draft Mutation] --> B[DB Transaction]
  B --> C[Draft Event Created]
  C --> D[Realtime Publisher]

  D --> E[Draft Board Client]
  D --> F[Draft Chat Client]
  D --> G[Notification Bell]
  D --> H[AI Draft Context Cache]

  E --> I[Update Pick Board]
  F --> J[Append Chat Event]
  G --> K[Show On-Clock Alert]
  H --> L[Refresh Recommendation Context]
```

Client should subscribe to:

- `draft:{draftSessionId}:board`
- `draft:{draftSessionId}:chat`
- `draft:{draftSessionId}:timer`
- `user:{userId}:notifications`

---

# Phase Rollout

## Phase 1 — Integrity

Must finish before beta.

1. Rotate exposed secrets.
2. Enforce paused pick hard-stop.
3. Add idempotency keys.
4. Add draft mutation lock.
5. Add DB uniqueness constraints.
6. Normalize AF Pro AI entitlement.
7. Add race-condition tests.

---

## Phase 2 — Sleeper Parity

1. Timer-after-trade behavior.
2. Undo pick behavior.
3. Queue editing while paused.
4. On-clock notifications.
5. Draft chat event reliability.
6. NCAA roster parity.
7. Soccer/Fantrax roster verification.

---

## Phase 3 — Scale

1. Add draft event stream.
2. Add realtime board updates.
3. Reduce polling.
4. Batch notifications.
5. Cache AI recommendations.
6. Move slow side effects off pick path.

---

## Phase 4 — Advanced Features

1. Live drafted-player trades.
2. AI trend-based queue recommendations.
3. AI roster-need analysis.
4. AI draft recap.
5. Commissioner recovery dashboard.
6. Full replay/debug draft timeline.

---

# Launch Gates

Do not beta launch until all are true:

- Pause hard-stop passes server-side tests.
- Manual pick vs auto-pick race test passes.
- Undo vs auto-pick race test passes.
- Trade accept vs timer expiry test passes.
- Draft completion assigns all rosters correctly.
- Draft chat events appear correctly.
- On-clock notification works.
- AI draft tools are AF Pro gated.
- NCAA roster parity passes.
- Soccer roster eligibility passes.
- p95 pick confirmation time is acceptable.
- secrets are rotated and secret scanning is enabled.
