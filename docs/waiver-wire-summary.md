# Waiver Wire Engine – Supported Modes & Deliverables

## Supported waiver modes

| Mode | Description | Priority / tiebreak | After claim |
|------|-------------|---------------------|-------------|
| **FAAB** | Free-agent acquisition budget. Users bid FAAB; highest bid wins. | By faabBid descending, then priorityOrder. | FAAB deducted from roster; optional rolling adjustment if also using priority. |
| **Rolling** | Waiver priority order; after a successful claim, that team moves to last. | By roster.waiverPriority ascending (lowest number = first). | roster.waiverPriority incremented for the claiming team. |
| **Reverse standings** | Worst team gets first claim (e.g. by standings rank). | By waiverPriority ascending (1 = worst = first). | No automatic priority change (standings updated separately). |
| **FCFS** | First come, first served. | By claim createdAt ascending. | No priority change. |
| **Standard** | Fixed priority order per claim. | By claim priorityOrder ascending. | No automatic priority change. |

League settings (LeagueWaiverSettings) support:
- **waiverType**: faab | rolling | reverse_standings | fcfs | standard
- **processingDayOfWeek**, **processingTimeUtc**: when to run (cron uses this; engine does not auto-schedule).
- **claimLimitPerPeriod**: optional cap (engine does not enforce per-period limit yet; can be added).
- **faabBudget**, **faabResetDate**: FAAB config.
- **tiebreakRule**, **lockType**, **instantFaAfterClear**: for future use / display.

---

## Deliverables (file list)

### 1. Audit
- **docs/waiver-wire-audit.md** [NEW] – Current waiver/roster/settings audit.

### 2. Schema
- **prisma/schema.prisma** [UPDATED] – LeagueWaiverSettings, WaiverClaim, WaiverTransaction; Roster.waiverPriority; League relations.

### 3. Backend
- **lib/waiver-wire/types.ts** [NEW]
- **lib/waiver-wire/roster-utils.ts** [NEW]
- **lib/waiver-wire/settings-service.ts** [NEW]
- **lib/waiver-wire/claim-service.ts** [NEW]
- **lib/waiver-wire/process-engine.ts** [NEW]
- **lib/waiver-wire/index.ts** [NEW]
- **app/api/waiver-wire/leagues/[leagueId]/settings/route.ts** [NEW] – GET/PUT settings
- **app/api/waiver-wire/leagues/[leagueId]/claims/route.ts** [NEW] – GET pending/history, POST claim
- **app/api/waiver-wire/leagues/[leagueId]/claims/[claimId]/route.ts** [NEW] – PATCH/DELETE claim
- **app/api/waiver-wire/leagues/[leagueId]/process/route.ts** [NEW] – POST run processing
- **app/api/waiver-wire/leagues/[leagueId]/players/route.ts** [NEW] – GET available players

### 4. Frontend
- **components/waiver-wire/WaiverWirePage.tsx** [NEW] – Full waiver wire page (available players, claim form, pending, history, settings display).
- **components/app/tabs/WaiversTab.tsx** [UPDATED] – Renders WaiverWirePage + existing AI/legacy panel.

### 5. QA & summary
- **docs/waiver-wire-qa-checklist.md** [NEW]
- **docs/waiver-wire-summary.md** [NEW] (this file).

### 6. Fix
- **app/api/league/roster/route.ts** [UPDATED] – Roster lookup by platformUserId (was incorrectly userId).

---

## Run migrations

After pulling schema changes:

```bash
npx prisma generate
npx prisma migrate dev --name add_waiver_wire
```

(Or use your existing migration workflow.)
