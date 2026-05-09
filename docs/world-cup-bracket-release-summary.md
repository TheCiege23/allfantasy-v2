# World Cup Bracket — Release Summary

**Purpose:** Single-page snapshot for merge/deploy readiness (features already shipped in branch). Not a substitute for [world-cup-bracket-qa-checklist.md](./world-cup-bracket-qa-checklist.md).

---

## Stabilization verification (audit)

| # | Check | Result |
|---|--------|--------|
| 1 | **Dev QA routes** (`/api/dev/world-cup/qa-seed`, `/api/dev/world-cup/simulate-final`) require **`NODE_ENV === "development"`** OR **`Authorization: Bearer <WORLD_CUP_DEV_QA_SECRET>`**, plus **`requireWorldCupApiUser`** (`lib/world-cup/worldCupDevQaAccess.ts`, route handlers). | Pass |
| 2 | **Platform admin** routes under `/api/admin/world-cup/*` require auth + **`getWorldCupAdminState`**. **Challenge admin** routes under `/api/brackets/world-cup/[challengeId]/admin/*` require auth + **`assertWorldCupManager`** (league owner/admin for that challenge — not necessarily platform admin). See **Route protection** below. | Pass |
| 3 | **Private leagues:** `getWorldCupChallengeView` returns **`null`** for **private** challenges when caller is not a participant or authorized manager/admin → API surfaces **404**. **Events** require **`assertWorldCupChallengeMemberOrManager`**. **Entries** require auth and are **user-scoped**. | Pass |
| 4 | **AF Pro — Bracket Brain:** `POST .../commissioner-brain` checks **`userHasBracketBrainAi`** before AI generation. **`POST .../commissioner-brain/send-reminder`** with **`useAi: true`** requires AF Pro (**402** if missing). Settings PATCH gates Bracket Brain toggle via **`userHasAfPro`** / server validation in **`applyWorldCupBracketSettingsPatch`**. **`POST .../entries/[entryId]/ai/matchup`** uses the same entitlement for any OpenAI path; **`ask_ai` / `explain`** return **403** with *"Bracket Brain requires AF Pro."* when not entitled; **`panel`** returns deterministic (non-LLM) stats when not entitled. | Pass |
| 5 | **Non-Pro baseline:** Picks, scoring, leaderboard (subject to visibility), deterministic matchup intelligence core, **system** bracket events, **non-AI** reminder copy (`send-reminder` without `useAi`), lock reminder **preview** endpoints for commissioners remain available per existing routes/services. | Pass (product behavior) |
| 6 | **Docs:** [world-cup-env-vars.md](./world-cup-env-vars.md) lists chain providers (API-Sports primary, TheSportsDB, Reality/Clear, manual), **`WORLD_CUP_LIVE_PROVIDER_CHAIN`**, **`CRON_SECRET`**, **`WORLD_CUP_DEV_QA_SECRET`**, **`WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK`**, **`OPENAI_API_KEY` / `WORLD_CUP_BRAIN_MODEL`**, AF Pro entitlement note. [world-cup-launch-notes.md](./world-cup-launch-notes.md) covers crons and ops. | Pass |
| 7 | **Production UI:** No `NEXT_PUBLIC_*` World Cup secrets found under `components/brackets/world-cup`. Dev-only behavior uses **`process.env.NODE_ENV !== "development"`** guards (e.g. `console.debug` in `WorldCupBracketShell` / `WorldCupGuidedMatchupPicker`) — no bearer secrets in client code. | Pass |
| 8 | **Deployment DB:** Run **`npx prisma migrate status`** against the **target** database (correct **`DATABASE_URL`**). **`npx prisma generate`** for CI/build. | Operator action |

---

## What is built

- **Leagues:** Public/private bracket challenges, invite codes, discover, join gates (full pool, locked pool, join password).
- **Entries:** Up to **5** brackets per user (`maxEntriesPerParticipant`), default **Bracket 1** on create/join.
- **Picks:** Board + **guided matchup picker**, pick persistence per entry, lock strategies (`per_match` / `tournament_start`).
- **Scoring & leaderboard:** Round-weighted scoring, recalculation hooks, movement indicators; **private** challenges hide data from non-members/admins (`getWorldCupChallengeView`).
- **Live scores:** Provider chain (`WORLD_CUP_LIVE_PROVIDER_CHAIN`) with API-Sports, TheSportsDB, Reality Sports, Clear Sports, **manual** JSON fallback (`worldCupLiveProviderRegistry`, `worldCupLiveScoreSyncService`).
- **Simulation / test fixtures:** Commissioner/admin flows for demo tournaments (`loadWorldCupTestFixtures`, `simulateWorldCupMatchResult`).
- **Events:** Bracket chat events (system + optional AI-generated lines).
- **Commissioner:** Settings bundle, lock reminders, **Bracket Brain** (AF Pro + league toggle + OpenAI).
- **Dev QA:** `GET`/`POST` `/api/dev/world-cup/qa-seed`, `POST` `/api/dev/world-cup/simulate-final` — gated as in §1 above.

---

## How to QA

1. Follow **[world-cup-bracket-qa-checklist.md](./world-cup-bracket-qa-checklist.md)** (manual).
2. Env reference: **[world-cup-env-vars.md](./world-cup-env-vars.md)**.
3. Ops / crons: **[world-cup-launch-notes.md](./world-cup-launch-notes.md)**.

**Automated tests** — on **PowerShell**, avoid `__tests__/world-cup*.test.ts` globs (they may not expand). Use:

```bash
npx vitest run world-cup --maxWorkers=4
```

If Vitest reports fork/worker startup timeouts under heavy parallel load, reduce workers (`--maxWorkers=2`) or re-run once.

**Prisma:**

```bash
npx prisma generate
npx prisma migrate status
```

Run **`migrate status`** against the **same `DATABASE_URL`** as production/staging deploy targets.

**Optional full TypeScript** (large heap; **not** a World Cup merge gate when the repo fails broadly):

```bash
set NODE_OPTIONS=--max-old-space-size=8192
npx tsc --noEmit
```

**Repo-wide typecheck (2026-05-09):** `tsc --noEmit` with 8GB heap **exits non-zero** with **many** pre-existing errors outside World Cup (`lib/zombie/*`, `server/services/*`, `lib/xp-progression/*`, etc.) and some **`implicit any`** lines in `lib/world-cup/worldCupSimulationService.ts`. Treat as **monorepo technical debt** — **do not** block WC deploy on full-project `tsc` unless your team fixes scope.

---

## Route protection (audit snapshot)

| Surface | Protection |
|---------|------------|
| `/api/dev/world-cup/*` | `verifyWorldCupDevQaRequest` + `requireWorldCupApiUser` (including GET `qa-seed`). |
| `/api/admin/world-cup/scores/sync-live` | Auth + **platform admin** (`getWorldCupAdminState`). Body includes `challengeId`. |
| `/api/admin/world-cup/import` | Auth + **platform admin**. |
| `/api/admin/world-cup/seed-mock` | Auth + **`assertWorldCupManager`** for posted `challengeId`. |
| `/api/brackets/world-cup/[challengeId]/admin/sync-live` | Auth + **`assertWorldCupManager`** (commissioner/owner for **that** challenge — **not** platform-only). |
| `/api/brackets/world-cup/[challengeId]/events` | Auth + **member or manager** (`assertWorldCupChallengeMemberOrManager`). |
| `/api/brackets/world-cup/[challengeId]/leaderboard` | Uses `getWorldCupChallengeView` → **private** challenges → **404** for non-members/non-admin. |
| `/api/brackets/world-cup/[challengeId]/entries` | Auth + entries scoped to **current user**. |
| `/api/brackets/world-cup/[challengeId]/settings` | Auth + **manager only**; AF Pro flags for UI/brain toggle. |
| `/api/brackets/world-cup/[challengeId]/entries/[entryId]/ai/matchup` | Auth + challenge access + entry ownership; OpenAI only when **`userHasBracketBrainAi`**; **`ask_ai` / `explain`** → **403** *Bracket Brain requires AF Pro.* if not entitled. |
| `/api/brackets/world-cup/[challengeId]/ai/matchup-preview` | Auth + challenge access; LLM summary only when **`userHasBracketBrainAi`**. |
| `/api/brackets/world-cup/[challengeId]/commissioner-brain` | Auth + **manager**; POST AI actions require **AF Pro** (`userHasBracketBrainAi`). |
| `/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder` | Auth + **manager**; **`useAi`** requires **AF Pro**. |

---

## AF Pro vs non-Pro (behavioral)

| Capability | Non-Pro | AF Pro (+ OpenAI where configured) |
|------------|---------|-------------------------------------|
| Basic picks, scoring, leaderboard | Yes | Yes |
| System bracket events; deterministic reminder lines (`send-reminder` without AI) | Yes | Yes |
| Bracket Brain commissioner posts (hype, standings, …) | Blocked / upgrade path | Yes, if league brain enabled |
| Settings: Bracket Brain toggle | Server + bundle gates | Yes |
| Matchup intelligence (`.../ai/matchup`) | Deterministic core (**panel**); **Ask AI** / **Explain** blocked server-side without AF Pro; UI labels basic stats and disables AI-only actions | Full Bracket Brain matchup intelligence when entitled |

---

## Required / referenced env vars

Confirm in deployment secrets — details in [world-cup-env-vars.md](./world-cup-env-vars.md):

- **Core:** `DATABASE_URL`
- **Live chain:** `WORLD_CUP_LIVE_PROVIDER_CHAIN`; providers: API-Sports (`API_SPORTS_KEY`, league ids), TheSportsDB (`THESPORTSDB_*`), Reality/Clear URLs + keys, **manual** (`WORLD_CUP_MANUAL_LIVE_JSON` / `_BODY`)
- **Crons:** `CRON_SECRET` (`GET /api/cron/world-cup-bracket-reminders`)
- **QA helpers:** `WORLD_CUP_DEV_QA_SECRET` (staging; optional in prod)
- **Product:** `WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK`
- **Brain:** `OPENAI_API_KEY`, optional `WORLD_CUP_BRAIN_MODEL`
- **Entitlement:** AF Pro via `league_ai_coaching` / `EntitlementResolver`, not env-only

---

## Production cron recommendations

- **Lock reminders:** `GET /api/cron/world-cup-bracket-reminders` with `Authorization: Bearer <CRON_SECRET>` — cadence in [world-cup-launch-notes.md](./world-cup-launch-notes.md).
- **Live sync:** Call **`POST /api/admin/world-cup/scores/sync-live`** (platform admin) with `challengeId`, or run challenge-scoped sync via **`POST /api/brackets/world-cup/[challengeId]/admin/sync-live`** as the league manager — see launch notes.

---

## Known limitations

1. **Knockout slot mapping (2026):** May need template/data refresh when FIFA finalizes the bracket ([world-cup-launch-notes.md](./world-cup-launch-notes.md)).
2. **Matchup route + OpenAI + AF Pro:** **Resolved** — entitlement enforced on **`POST .../ai/matchup`** and **`POST .../ai/matchup-preview`** (`bracketBrainAiEntitled` / **`userHasBracketBrainAi`**).
3. **Vitest on PowerShell:** Use `npx vitest run world-cup --maxWorkers=4`, not shell globs.

---

## Launch blockers

**None** recorded as mandatory WC code defects when:

- **`npx prisma migrate status`** is clean on the **target** DB.
- **`npx vitest run world-cup --maxWorkers=4`** passes.
- Provider and cron secrets are configured.

**Unrelated:** Full-repo **`tsc --noEmit`** may fail — see **How to QA** — do not treat as World Cup-only blocker unless you scope typecheck.

---

## Related docs

- [world-cup-bracket-qa-checklist.md](./world-cup-bracket-qa-checklist.md)
- [world-cup-env-vars.md](./world-cup-env-vars.md)
- [world-cup-launch-notes.md](./world-cup-launch-notes.md)
- [world-cup-live-score-providers.md](./world-cup-live-score-providers.md)
