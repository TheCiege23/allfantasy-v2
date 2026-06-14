# Survivor Runtime Verification Plan

Updated: 2026-06-14

## Purpose

This document defines the DB-backed seed and Playwright runtime needed before Survivor
can be considered fully set up. Unit tests are not enough because the format depends on
cross-cutting flows: creation, draft, tribes, chats, idols, votes, roster movement,
Exile, jury, AI, notifications, privacy, and media.

## Current Runtime Status

Not built yet.

Missing runtime deliverables:

- `scripts/seed-survivor-full-runtime.ts`
- `e2e/survivor-full-runtime.spec.ts`

Existing Survivor tests are useful but do not prove the full product loop.

## Seed Requirements

The seed script must create deterministic data for:

- one Survivor NFL league
- one Survivor NCAAF league if provider/test fixtures support it
- 20 users
- 4 tribes of 5
- commissioner non-participating scenario
- commissioner participating scenario
- co-commissioner scenario if feature enabled
- draft-complete state
- rosters with legal players
- tribe chats with exact members
- main league chat
- private Chimmy/commissioner DM per user
- hidden idol/power inventory
- active challenge
- locked challenge scenario
- active vote window
- late vote scenario
- Vote Shield holder
- Extra Vote holder
- Skip Tribal holder
- Triple Steal holder
- Auto Waiver Pickup holder
- eliminated user
- Exile user and Exile weekly entry
- Exile token standings
- Boss lineup
- jury threshold scenario
- finalist scenario
- Survivor media enabled and disabled cases

Seed data must never use production secrets and must be safe to rerun locally.

## Playwright Runtime Coverage

The Playwright spec should verify:

1. League creation:
   - Survivor option is available.
   - NFL/NCAAF setup fields render.
   - 20-team default and 4x5 tribe default persist.
   - Participating commissioner mode warns about blind restrictions.

2. Draft-complete bootstrap:
   - Survivor players exist.
   - Tribes are created.
   - Tribe chats include only correct active members.
   - Private DM channels exist.
   - Hidden inventory exists but is redacted from unauthorized users.

3. Commissioner privacy:
   - Non-participating commissioner sees operational dashboard.
   - Participating commissioner cannot see hidden idols, private votes, private DMs, or
     hidden challenge picks before lock/reveal.

4. Idol/power inventory:
   - User can see own hidden idols/powers.
   - User cannot see another user's hidden inventory.
   - Vote Shield, Extra Vote, Skip Tribal, Auto Waiver Pickup, and Triple Steal flows
     open and validate.

5. Challenge flow:
   - User submits a challenge pick.
   - Lock prevents edits.
   - Result posts to chat.
   - Rewards/penalties create audit and notifications.

6. Private vote flow:
   - User submits vote via private DM or vote UI.
   - Public chat vote is rejected.
   - User receives vote-received notification.
   - Late invalid vote is labeled "Does Not Count".

7. Reveal and elimination:
   - Scroll reveal uses real reveal payload.
   - Vote Shield blocks votes correctly.
   - Eliminated user status changes.
   - Roster moves to waivers or user moves to Exile based on settings.
   - Active chats remove eliminated user.

8. Exile:
   - Exile user cannot see active tribe chat.
   - Exile waiver claim works.
   - QB/team stack assignment works when enabled.
   - Tokens/wins update.
   - Boss reset zeros tokens when Boss wins.
   - Exile leader returns at final 3.

9. Merge and sit-outs:
   - Uneven tribe sit-outs are assigned or voted.
   - No consecutive sit-out is enforced.
   - Merge archives tribe chats.
   - Individual mode activates.

10. Jury and finale:
    - Jury starts at 60 percent threshold.
    - Jury chat is accessible only to jurors/host as configured.
    - Finalist speeches persist.
    - Jury Q&A persists.
    - Final votes are private.
    - Sole Survivor reveal uses real votes.

11. AI / Chimmy:
    - Survivor context injects only for Survivor leagues.
    - AI can answer rules questions.
    - AI refuses or redacts hidden-info requests.
    - Destructive command requires confirmation.

12. Videos and mobile:
    - Intro/draft video cards render or fallback.
    - Video failure does not crash page.
    - Mobile viewport has no overlapping critical controls.

## Runtime Test Commands

Suggested local commands after implementation:

```bash
npm test -- --run survivor
node scripts/audit-route-budget.cjs
npx playwright test e2e/survivor-full-runtime.spec.ts
```

If the repo uses a DB tag convention, add an explicit `@db` tag to the Playwright spec
and wire it to the existing DB test runner.

## Route Budget Gate

Run after any route changes:

```bash
node scripts/audit-route-budget.cjs
```

The implementation should not add a route file for each Survivor action. New gameplay
actions should dispatch through the consolidated league-scoped Survivor route.

## Migration Gate

Before any DB change:

- inspect existing Prisma models and migrations
- prefer extending current Survivor tables when safe
- add new tables only for truly durable concepts that cannot fit existing models
- generate safe additive migration
- write Neon SQL notes for manual production application if needed
- never use unsafe `db push`
- never drop or rewrite live Survivor data

## Ship Gate

Survivor is not runtime-ready until:

- seed script runs from a clean database
- DB-backed Playwright passes
- route budget is green
- privacy tests pass
- no fake gameplay states remain
- final status report lists all remaining gaps or declares none
