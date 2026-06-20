# Redraft Waiver Walkthrough (Step 3B verification)

A dedicated, repeatable, dev/test-only seed + Playwright walkthrough that proves every Step 3B
waiver flow green in a real browser session, without touching production data or running provider
write syncs.

## Seed — `scripts/seed-redraft-waiver-walkthrough.ts`

Dev/test-only (refuses to run with `NODE_ENV=production` unless `ALLOW_S3B_SEED=true`). Creates
four lineup-legal redraft leagues plus a two-team privacy case, all namespaced under `s3b-*`:

| League id | Sport | Waiver type | Member roster | Proves |
|---|---|---|---|---|
| `s3b-nfl-fcfs-open` | NFL | FCFS | legal, open bench spots | Add direct |
| `s3b-nfl-fcfs-full` | NFL | FCFS | legal, filled to capacity | Add → requires drop |
| `s3b-nfl-faab` | NFL | FAAB | legal, open spots | Claim (+ opponent pending claim for privacy) |
| `s3b-ncaaf-fcfs` | NCAAF | FCFS | legal, open spots | Add + limited-data labels |

Rosters are made lineup-legal with the canonical draft builder chain
(`getRosterTemplate` → `buildLineupSectionsFromPicks` → `buildPersistedRosterDataFromRosterState`),
so the roster-legality gate ("Not enough starters") passes and real free agents (from the existing
`sportsPlayer` pool) can be added. `rosterSize` is capped at template capacity so a "full" roster
truly hits the limit and forces a drop. No provider writes, no env changes, no production data —
the seed clears and recreates only `s3b-*` rows and is fully re-runnable.

Logins (password `Password123!`): `s3b_member` (non-commissioner member, used by the walkthrough),
`s3b_opponent` (second team / pending claim), `s3b_commish` (league owner).

### Seed command
```bash
node --import tsx scripts/seed-redraft-waiver-walkthrough.ts
```

## Walkthrough — `e2e/redraft-waiver-walkthrough.spec.ts` (`@db`, chromium)

The five flow assertions run as the authenticated member through `page.request` — the exact routes
the UI buttons call — so they are deterministic and not gated on the compile-heavy league-shell
render. Each scenario also opens the league shell's Waivers tab to assert the Add/Claim CTA in the
real DOM and capture a screenshot (best-effort: the shell is environment-sensitive, mirroring
`redraft-war-room-runtime.spec.ts`, so a render flake degrades to a screenshot without failing the
flow proof).

Verified:
1. **FCFS open** — add succeeds (`{ok:true}` + transaction in history), CTA renders **Add**.
2. **FCFS full** — add with no drop → structured `DROP_REQUIRED`; add with a drop completes
   (transaction carries the `dropPlayerId`).
3. **FAAB** — `waiverType=faab`; claim submit, edit (FAAB bid), and cancel all succeed; CTA renders
   **Claim** (not Add).
4. **NCAAF** — available players exist, add works; UI shows **Limited data** labels and no NFL-only
   copy in the rows.
5. **Privacy** — member sees own pending claim, the opponent's pending claim is hidden, and the
   non-commissioner league-scope request returns **403**.

### Playwright command
```bash
# Fresh dev server on an isolated port; ClearSports (a read provider) blanked so the roster-legality
# check is not throttled during the run. NEXTAUTH_URL must match the served origin.
PLAYWRIGHT_PORT=3102 NEXTAUTH_URL=http://127.0.0.1:3102 \
CLEARSPORTS_API_KEY= CLEARSPORTS_API_BASE= CLEAR_SPORTS_API_KEY= CLEAR_SPORTS_API_BASE= \
npx playwright test e2e/redraft-waiver-walkthrough.spec.ts --project=chromium --workers=1
```
(The `@db` spec auto-runs the seed in `beforeAll` and skips when `DATABASE_URL` /
`NEXTAUTH_SECRET` are absent.)

### Artifacts
Screenshots are written to `e2e/__artifacts__/redraft-waiver-walkthrough/`:
`01-fcfs-open-add-cta.png`, `02-fcfs-full-add-cta.png`, `03-faab-claim-cta.png`,
`04-ncaaf-add-cta.png`, `05-privacy-claim-cta.png` (a `*-degraded.png` is captured instead if the
heavy league shell did not finish rendering in the run environment).

## Safety
No production writes, no provider syncs, no env files modified or committed, no exposure of hidden
pending claims. All data is `s3b-*`-namespaced dev/test fixtures.
