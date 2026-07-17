# Local Verification Environment — Setup, Reset, and Findings

**Status:** Phase 1 complete (auth recovered, environment proven in-browser) · **Prepared:** 2026-07-17
· **Branch:** `claude/verification-loop-recovery`

The purpose of this document is that a developer can go from a fresh checkout to *seeing the real
AllFantasy dashboard render with real league data in a browser*, which was not possible before this
pass.

---

## 1. TL;DR — exact commands

```sh
# 1. Confirm you are NOT pointed at production (see §3 — do this every time)
node -e "console.log(new URL(process.env.DATABASE_URL.replace(/^postgres(ql)?:\/\//,'http://')).host)" \
  --env-file=.env
# EXPECTED: ep-curly-block-...  (shadow/dev)
# ABORT IF:  ep-spring-tooth-... (PRODUCTION)

# 2. Bring the DB schema up to date (both steps are required — see §4)
npx prisma migrate deploy
npx prisma db push --skip-generate      # closes schema-ahead-of-migrations drift

# 3. Seed a real NFL redraft league with a commissioner, member, and rosters
node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx \
  scripts/seed-redraft-war-room-runtime.ts

# 4. Run
npx next dev -p 3000        # use 3000 — NEXTAUTH_URL is pinned to it (see §6)

# 5. Log in — open http://localhost:3000/login and click "Continue as Local Dev User"
```

### Seeded test accounts (created by `seed-redraft-war-room-runtime.ts`)

| Login | Password | Role |
|---|---|---|
| `rwr_runtime_commish` | `Password123!` | Commissioner of the seeded league |
| `rwr_runtime_member` | `Password123!` | Member (non-commissioner) |
| `rwr_runtime_outsider` | `Password123!` | No league membership |
| *Local Dev User* (button) | n/a | `DEV_AUTH_BYPASS` — **owns no leagues** (see §7) |

---

## 2. Environment & branch inventory

- **Worktree:** `C:/tmp/af-decision-os-activation` (isolated; the shared primary checkout at
  `F:/allfantasy-v2-main` has had two concurrent-session collisions this session — see
  [[concurrent-session-shared-git-index]]).
- **Surfaces present on `main`:** `/dashboard`, `/commissioner-hub`, `/manager-hub`, `/af-legacy`,
  `/fantasy-os`, `/fantasy-os/executive`, `/war-room`, `/ai`, `/ai-chat`.
- **Surfaces ABSENT on `main`:** `/v2`, `/v3`.
- **`docs/design/V1_*.md`: does not exist on `main` and was not found on any scanned remote branch.**
  The design-system memory describing 7 V1 specs + `/v2` + `/v3` shells appears to describe work that
  was never merged (or never existed at these paths). **This is a stop-gate item: the intended design
  specifications could not be located.** What *does* exist is design *infrastructure*: 492 CSS custom
  properties in `app/globals.css`, `components/ui/` primitives, a theme/mode system, i18n × 5 locales.

## 3. Database identity — the safety check

**Both `.env` and `.env.local` point at `ep-curly-block-ad0dlt9o-pooler.../mydb_shadow`.** Production
(`ep-spring-tooth`) appears **only** in `.env.prod-deploy`.

> **This corrects a stale memory** ([[redraft-verification-and-local-prod-db]] /
> [[prisma-cli-env-override-danger]]) which asserted `.env` = production. That was true on 2026-07-14;
> it is not true now. Because the Prisma CLI reads `.env`, this change is what makes `prisma migrate`
> safe to run locally at all. **Re-verify with the §1 step-1 command before every schema command** —
> this fact has already changed once.

Verified by content, not by name: at the time of this pass the shadow DB held 2 users, **0 leagues, 0
rosters, 0 players, 0 user profiles**. It also contains one real account (`theciege22`) — do not purge
it blindly.

## 4. Root causes of the authentication failure (three, all real defects)

The `DEV_AUTH_BYPASS` 401 that blocked in-browser verification all session was **three stacked
causes**, not one:

1. **The shadow DB was 119 of 120 migrations behind** — a near-empty skeleton. `time_mismatch_flag`
   (`prisma/migrations/20260418210000_user_profile_time_engine`) did not exist, so
   `prisma.userProfile.upsert()` threw and `authorize()` 401'd.
   *Fixed by:* `npx prisma migrate deploy`.
   *One migration conflicted* — `20260509061103_live_draft_autopick_preferences` failed with
   `42P07 relation already exists` (created historically outside migration history). Before resolving
   it, the live table was compared against the migration's intent: **all columns and types matched
   exactly**, so `prisma migrate resolve --applied` was accurate rather than papering over drift.

2. **The Prisma schema has drifted AHEAD of the migration history.** `chimmyTtsVoiceId`
   (`prisma/schema.prisma:5087`, `@map("chimmy_tts_voice_id")`) is required by the client but **no
   migration in `prisma/migrations/` creates it**. Any database built purely from migration history is
   missing columns the app requires.
   *Worked around by:* `npx prisma db push`.
   **This is a real, unfixed defect — see §8.**

3. **The `dev-bypass` provider never returned `username`.** `lib/auth.ts`'s JWT callback stamps
   `token.username` by reading `user.username` off the `authorize()` return. The `credentials`
   provider returns it; **`dev-bypass` omitted it**. The consequence is documented in the file's own
   comment at line ~543 (*"without this, token.username is always null"*): the username gate in
   `middleware.ts` then redirected **every** dev-bypass session to `/choose-username`, so the bypass
   could never reach any gated page — including the dashboard it exists to reach.
   *Fixed in this branch:* one line, `username: user.username`, mirroring the `credentials` provider.
   **This is a genuine bug fix, not a safety bypass** — the dev user is a real `AppUser` row with a real
   username already in the database.

## 5. Runtime verification evidence (in a real browser)

Verified against `http://localhost:3011`, Chrome, authenticated session:

| Check | Result |
|---|---|
| Login succeeds | ✅ `signin: 200`; session `{"username":"local_dev_user","id":"local-dev-user"}` |
| Seeded user reaches the dashboard | ✅ `/dashboard` → `200` (was `307 → /choose-username`) |
| Global Command Center renders | ✅ "GLOBAL COMMAND CENTER / This is Fantasy HQ.", All-Leagues pill, breadcrumb |
| Renders with **real seeded data** | ✅ leagues counter `0 → 1`; "MY LEAGUES" shows *Runtime Seed NFL Redraft War Room*, `2-1`, `In Season`, health badge `EXCELLENT` |
| Commissioner context resolves | ✅ COMMISSIONER HUB panel appears for the commissioner-owned league; nav swaps "Run a League" → "Commissioner Hub" |
| **No fabrication when data is absent** | ✅ Signed in with zero leagues: `0/0/0/0` counters, AF Rank/Tier/XP all `—`, "You're all caught up", "Next Opponent: Not available right now". Nothing invented. |

## 6. Defect & error log (found during this pass, NOT fixed)

| # | Severity | Finding |
|---|---|---|
| D1 | **High** | Prisma schema drifted ahead of migrations (`chimmy_tts_voice_id`, §4.2). A migration-only deploy produces a broken DB. Needs a real migration generated — but that affects production deploys, so it is a decision, not a drive-by fix. |
| D2 | Medium | `NEXTAUTH_URL=http://localhost:3000` in `.env.local` is **port-pinned**. Running on any other port makes NextAuth emit `callbackUrl`/`signinUrl` pointing at `:3000`, producing cross-port redirects. Use port 3000, or override `NEXTAUTH_URL`. |
| D3 | Medium | `seed-redraft-war-room-runtime.ts` has **no production guard** — no host check, no refusal. It is only safe because `.env` currently points at the shadow DB. The brief requires seeds be "clearly prevented from executing against production"; this one is not. |
| D4 | Low | The login page copy reads *"Sign in to access the Sports App, Brackets, and **AI Tools**."* — an "AI" customer-copy violation per the brand rule. |
| D5 | Low | Default theme renders **Light** (top bar shows `Theme: Light`) with a dark navy hero, i.e. a mixed light/dark presentation, while the stated direction is "premium dark". Worth confirming the intended default. |
| D6 | Low | Clicking the login page's Google button initiates a **real** Google OAuth flow against `localhost:3000` — expected, but a trap in a dev environment. |

## 7. Seed architecture — current state and the gap

`scripts/seed-redraft-war-room-runtime.ts` (reused rather than rebuilt) is **idempotent** (fixed
deterministic IDs, upserts) and produces: 1 NFL redraft league + season, commissioner/member/outsider
users with real logins, 2 rosters, 21 roster players, synthetic provider rows.

**It does not yet satisfy the full brief.** Delta against the requirement list:

| Required | Status |
|---|---|
| One authenticated test user | ✅ (three) |
| One commissioner-owned NFL redraft league | ✅ |
| One non-commissioner league membership | ⚠️ `seed-managed-only-dev-league.ts` exists for this; not yet composed in |
| 8–12 managers | ❌ (2 rosters) |
| Full rosters | ⚠️ 21 players across 2 rosters |
| Scoring + lineup settings | ✅ (league/season created) |
| Draft history / upcoming draft | ❌ |
| ≥1 pending trade | ❌ (`seed-redraft-trade-walkthrough.ts` exists — compose in) |
| ≥1 waiver item | ❌ (`seed-redraft-waiver-walkthrough.ts` exists — compose in) |
| ≥1 incomplete lineup | ❌ |
| ≥1 inactive-manager signal | ❌ |
| History/activity for health, rankings, Legacy, notifications | ❌ (AF Rank/Tier/XP render `—`) |
| Production-guarded | ❌ (D3) |
| Documented / re-runnable | ✅ (this document) |

**Critical gap:** the seeded league belongs to `rwr-runtime-commissioner-user`, **not** to the
`local-dev-user` that the one-click bypass authenticates as. So the bypass button reaches the dashboard
but sees zero leagues; seeing data currently requires logging in as `rwr_runtime_commish`. The
composed seed should attach both a commissioner league and a non-commissioner membership to
`local-dev-user`.

## 8. Recommended next steps (no destructive action taken)

1. **Compose one `seed:dev` entrypoint** from the existing pieces (`redraft-war-room-runtime` +
   `managed-only-dev-league` + `trade-walkthrough` + `waiver-walkthrough`), attach them to
   `local-dev-user`, add a production host guard, and register it in `package.json`.
2. **Decide on D1** — generating the missing `chimmy_tts_voice_id` migration touches production deploy
   behavior and needs an explicit call.
3. **Do not** retire `/war-room`, `/fantasy-os`, `/v2`, `/v3`, or any surface on the strength of this
   pass. `/v2` and `/v3` are absent from `main` and from every scanned remote branch, but "absent" is
   not "obsolete" — the intended design specs could not be located and that gate is unresolved.

## 9. Explicitly not done

Phase 3 convergence (`/api/ai/manager-dna`) not started — the environment work consumed this pass.
Team Focus and league-switching screenshots not captured (the seeded league is commissioner-owned; a
non-commissioner membership for the same user is the missing seed piece). Light/dark/AF mode matrix,
locale matrix, and mobile-layout checks not performed. No production data touched; no route retired.
