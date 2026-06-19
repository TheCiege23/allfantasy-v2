# Redraft Core Contract Hardening

## Existing Creation Flow

AllFantasy currently has two redraft creation paths:

- Canonical concept-first creation in `lib/league-creation/canonical/createCanonicalLeagueInTransaction.ts`.
- Legacy redraft-only creation in `lib/redraft-creation/create-redraft-league.ts`.

Canonical creation already builds the league shell, commissioner roster, open slots, settings rows, homepage state, chat room, and draft session. Legacy redraft creation now consumes the same NFL/NCAAF redraft contract snapshot for football redraft leagues and creates a draft slot-order shell using the existing `placeholder-N` draft materialization convention.

PR #76 UX fixes are included on this branch: Trade Center label, Commissioner Hub label, closable settings modal, 40/35/25 league shell layout, and pre-draft draft-room setup actions.

## Gaps Found

- NFL/NCAAF defaults still used the older `QB, RB, RB, WR, WR, TE, FLEX, K, DST/DEF` contract.
- `FLEX`, `SUPERFLEX`, `DST`, and `DEF` were not consistently normalized across defaults, lineup validation, and draft room slot tracking.
- Redraft defaults did not expose one complete contract for waivers, trades, playoffs, commissioner settings, dashboard state, and AI context.
- Legacy redraft creation could create a draft session without a useful slot-order shell.
- Existing incomplete leagues needed an idempotent repair helper.

## Canonical Redraft Contract

Standard NFL/NCAAF redraft starter order:

`QB, RB, WR, WR, TE, DEF`

Optional ordering:

- `FLX` appears directly below `TE`.
- `SF` appears below `FLX`, or below `TE` if `FLX` is disabled.
- `DEF` stays above IDP slots.
- IDP slots appear below `DEF`: `DL, LB, DB, IDP`.
- `BN` appears after starters.
- `IR` appears after bench where supported.

Aliases are preserved:

- `FLEX` maps to `FLX`.
- `SUPERFLEX` / `SUPER_FLEX` map to `SF`.
- `DST` / `D/ST` map to `DEF`.
- `IDP_FLEX` maps to `IDP`.

## Scoring Defaults

NFL and NCAAF redraft default to Half PPR.

Canonical preset IDs:

- NFL: `fb_standard`, `fb_half_ppr`, `fb_full_ppr`.
- NCAAF: `ncaaf_standard`, `ncaaf_half_ppr`, `ncaaf_ppr`.

Legacy aliases such as `standard`, `ppr`, `fb_ppr`, `half_ppr_college`, and `ncaaf_half_ppr_college` resolve through the redraft scoring resolver.

Standard redraft scoring does not enable dynasty, devy, keeper, salary-cap, or IDP-only settings unless explicitly selected elsewhere.

## Draft Defaults

New NFL/NCAAF redraft leagues get:

- Draft type normalized to runtime core: `snake`, `linear`, or `auction`.
- Slow, mock, offline, and auto draft types mapped to safe runtime cores.
- 90 second timer.
- Queue-first autopick.
- Rounds derived from draftable roster size.
- Live draft shell and mock draft entry available before draft date is scheduled.
- Placeholder draft slot order for empty teams.

Repair does not overwrite active, paused, or completed draft sessions.

## Waiver Defaults

New redraft leagues include:

- Waivers enabled.
- FAAB mode enabled by default.
- FAAB budget `100`.
- Priority supported.
- Claim edit/cancel before processing.
- Game-time locked player protection.
- Roster legality validation after claims.
- Commissioner override rules present.

Core waiver actions do not require AI.

## Trade Defaults

New redraft leagues include:

- Trades enabled.
- Trade Center compatibility.
- Commissioner review/veto enabled.
- 24 hour review window.
- Roster legality validation.
- Trade history/audit setting.
- Draft pick trading disabled by default.
- Dynasty value/language hidden in standard redraft.

AI trade analysis is optional and premium-aware.

## Playoff And Matchup Defaults

New redraft leagues include:

- Weekly matchup phase defaults.
- Safe pre-draft schedule-not-generated state.
- Commissioner schedule generation path marker.
- 6-team playoffs for 10+ team football leagues.
- Points-for then head-to-head tiebreaker defaults.
- League phase initialized to `pre_draft`.

No playoff advancement or standings logic was changed in this pass.

## Commissioner Baseline

Commissioner settings include flags for:

- League settings, teams, invites, draft order, draft setup.
- Draft pause/resume, undo/force/skip pick where supported.
- Waivers, trades, schedule generation, locks, announcements.
- Future AI commissioner features defaulting safe/off or recommendation-only.

Non-commissioner destructive action protection remains handled by existing auth/permission paths.

## AI Context Compatibility

The redraft settings snapshot now exposes enough context for Chimmy and War Room:

- sport
- league type
- scoring preset
- roster slots
- draft status
- waiver settings
- trade settings
- playoff settings
- league phase
- provider-data availability status
- AI optional/premium flags

Missing provider data is represented as unavailable; the base league flow does not require AI.

## Repair Rules

`ensureRedraftLeagueContract(leagueId)` is callable from server paths and tests.

It:

- fills missing redraft settings
- normalizes known legacy default starter maps
- preserves customized roster slots
- preserves unknown/custom scoring presets
- creates missing settings/waiver/redraft profile/homepage rows
- creates a missing draft session shell
- repairs incomplete pre-draft slot order
- does not overwrite active, paused, or completed drafts
- can run more than once without additional changes

## Files Changed

- `lib/league-concepts/redraftDefaults.ts`
- `lib/redraft-core-contract/ensureRedraftLeagueContract.ts`
- `lib/redraft-core-contract/index.ts`
- `lib/league-defaults/getLeagueDefaults.ts`
- `lib/redraft-creation/create-redraft-league.ts`
- `app/league/[leagueId]/draft/page.tsx`
- `lib/sport-defaults/SportDefaultsRegistry.ts`
- `lib/redraft/sportConfig.ts`
- `lib/redraft/lineupValidation.ts`
- `lib/draft-room/rosterSlotOrder.ts`
- `components/app/draft-room/DraftRosterStrip.tsx`
- `lib/sportConfig/configs/nfl.ts`
- `lib/sportConfig/configs/ncaaf.ts`
- focused tests under `__tests__`

## Test Coverage Added

- Canonical NFL/NCAAF default roster order.
- Optional `FLX`, `SF`, and IDP ordering.
- DEF/DST alias compatibility.
- Scoring preset and legacy alias resolver.
- Redraft draft shell slot-order helper.
- Repair of incomplete legacy defaults.
- Preservation of custom roster/scoring.
- Completed draft protection.
- Repair idempotency.
- Draft room roster tracker alias compatibility.
- Lineup validation consuming canonical aliases.

## Manual Smoke Test Checklist

1. Create new NFL redraft league.
2. Confirm dashboard loads.
3. Confirm roster settings order: `QB, RB, WR, WR, TE, DEF, BN`.
4. Confirm Trade Center label.
5. Confirm Commissioner Hub label as commissioner.
6. Open settings and close via X.
7. Open settings and close via Escape.
8. Open settings and close via overlay if supported.
9. Open Draft tab.
10. Confirm mock draft action exists.
11. Confirm live draft setup action exists.
12. Confirm waiver tab loads.
13. Confirm trade center loads.
14. Confirm War Room loads.
15. Ask Chimmy: "What should I do first in this league?"
16. Repeat minimum smoke path for NCAAF redraft.

## Production Data

No production data writes, provider write syncs, or env-file changes are part of this work.
