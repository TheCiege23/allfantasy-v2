# Survivor Phase 1 Foundation

Updated: 2026-06-14

## Scope Completed

Phase 1 establishes the Survivor foundation without pretending gameplay engines are complete.

- Canonical Survivor setup settings: NFL/NCAAF only, 20 default managers, 16-20 cast range, 4 default tribes, merge at 10 active players.
- Commissioner participation privacy model: non-playing host can see operational hidden state; playing commissioner keeps player visibility for hidden idols, private votes, DMs, and unrevealed strategy state.
- Central access helper: `lib/survivor/survivorAccessControl.ts`.
- Safe state service: `lib/survivor/survivorStateService.ts`.
- Consolidated foundation routes:
  - `GET /api/leagues/[leagueId]/survivor`
  - `POST /api/leagues/[leagueId]/survivor/[action]`
- Phase 1 actions:
  - `get-state`
  - `update-settings`
  - `assign-tribes-placeholder`
  - `validate-tribe-settings`
  - `set-commissioner-participation-mode`
  - `open-vote-window-placeholder`
  - `submit-vote-placeholder`
  - `close-vote-window-placeholder`
  - `privacy-check`
  - `audit-log`
- DB-backed runtime scaffold:
  - `scripts/seed-survivor-foundation-runtime.ts`
  - `e2e/survivor-foundation-runtime.spec.ts`

## No Fake Gameplay State

The foundation routes expose setup, access decisions, counts, vote-window status, own vote submitted state, own idols, public idols, visible chat shells, and audit counts from the database only.

The following remain deferred and are returned as placeholders or locked UI, not simulated state:

- idol/power resolution
- Exile return and token contests
- challenge resolution
- tribe assignment execution
- jury/finale reveal
- all special powerups

## Privacy Audit Findings

Fixed in this phase:

- `server/api-route-modules/league-survivor/votes/route.ts` no longer gives all unrevealed votes to a commissioner who is also playing.
- `server/api-route-modules/league-survivor/idols/route.ts` no longer gives hidden idol ownership to a playing commissioner or normal member.
- `lib/survivor/getSurvivorLeagueState.ts` no longer selects stale idol fields (`foundWeek`, `playedWeek`).
- `lib/survivor/commissionerBlindMode.ts` no longer selects missing `League.survivorCommissionerPlays`.
- `lib/survivor/faqGenerator.ts` no longer selects missing `League.survivorCommissionerPlays`.
- Finale and Chimmy UI fallback gameplay examples were removed.

Remaining follow-up:

- Legacy `GET /api/survivor/season` still serves the older UI payload shape, but it now uses the central access model to force redaction for playing commissioners.
- Chat-message fetch/post routes should adopt `canSeeSurvivorChannel` before tribe, Exile, jury, and private DM chats move beyond shell state.
- Chimmy AI context should consume `SurvivorAccessContext` before it receives any hidden vote/idol/challenge data.

## Schema/Migration Audit

No migration was required for Phase 1.

Existing models cover the foundation:

- `League.settings` stores the normalized Survivor foundation settings snapshot.
- `League` Survivor columns store the runtime-compatible top-level flags/counts.
- `SurvivorLeagueConfig` stores tribe, merge, idol count, voting deadline, and challenge toggles.
- `SurvivorGameState` stores phase/week/active council coordination.
- `SurvivorPlayer`, `SurvivorTribe`, `SurvivorTribeMember`, and `Roster` cover cast and tribe membership.
- `SurvivorTribalCouncil` and `SurvivorVote` cover vote-window status and own vote detection.
- `SurvivorIdol` covers own/public idol summaries without adding a new table.
- `SurvivorAuditEntry` covers foundation audit visibility.
- `SurvivorChatChannel` covers visible chat shell membership.

## Runtime Seed Contract

The runtime seed creates two deterministic leagues:

- `survivor-foundation-runtime-host-league`: non-playing commissioner host.
- `survivor-foundation-runtime-player-league`: commissioner participates as a player.

Both use 20 players, 4 tribes, an open council, tribe chats, a hidden idol row, and audit rows. The Playwright spec verifies auth, settings, no fake gameplay flag, and privacy decisions.

## Verification Commands

```bash
npm test -- __tests__/survivor-foundation-settings.test.ts __tests__/survivor-access-control.test.ts __tests__/survivor-state-sanitizer.test.ts __tests__/survivor-defaults-nfl-ncaaf.test.ts __tests__/survivor-commissioner-dashboard-payload.test.ts
node scripts/audit-route-budget.cjs
npx playwright test e2e/survivor-foundation-runtime.spec.ts --list
```
