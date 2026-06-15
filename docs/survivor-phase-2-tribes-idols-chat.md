# Survivor Phase 2 — Tribes, Tribe Chat, Intro/Rules, Idol Seeding

Updated: 2026-06-15. Builds on Phase 0 docs + Phase 1 foundation
(`docs/survivor-phase-1-foundation.md`). Survivor-only; no other format/product touched.

## Exact Phase 2 scope (what this phase builds)

1. **Tribe assignment engine** — random / commissioner_manual / draft_pattern, balanced,
   deterministic audit seed, excludes eliminated/exiled/jury + non-participating commissioner.
2. **Tribe membership persistence** — `SurvivorTribe` + `SurvivorTribeMember` +
   `SurvivorPlayer.tribeId`, idempotent, lock-aware (no re-assign after lock unless reset).
3. **Tribe chat creation / membership** — one main league `SurvivorChatChannel` + one private
   per-tribe channel; `memberUserIds` = that tribe's active members (+ AI host + non-playing
   commissioner host when settings allow). Participating commissioner is NOT added to tribes
   they are not a member of.
4. **Survivor intro/rules announcement** — a real AI host `SurvivorChatMessage` posted to the
   league channel (Outwit/Outplay/Outlast, information-is-currency, private votes, tribe
   chats, idols may exist, anti-harassment, screenshots policy). No hidden idol/power leakage.
5. **Media/video config** — optional, safe: tribe `colorHex`/`logoUrl` defaults + a league
   intro video URL hook if present in settings; never blocks initialization.
6. **Canonical idol seeding** — Vote Shield idols seeded at `rosterSpots + tribeCount`
   (e.g. 15 roster spots + 4 tribes = 19), hidden, randomly distributed (multiple per user
   allowed), expiry at the final-5 boundary (invalid at 4 remaining). Power-type catalog
   registers all 5 canonical types; only Vote Shield is auto-seeded at start.
7. **Idol inventory visibility rules** — owner sees own; others cannot see hidden ownership;
   participating commissioner cannot see hidden assignments; non-participating host/AI may see
   operational counts/status. Enforced by the existing state sanitizer + access control.
8. **Idol audit logs** — `SurvivorIdolLedgerEntry` (assign) + `SurvivorAuditEntry` (hidden,
   commissioner-only) per seeded idol; tribe-assignment + chat-creation + intro audits.
9. **Runtime seed/spec proving privacy** — `scripts/seed-survivor-phase2-runtime.ts` +
   `e2e/survivor-phase2-runtime.spec.ts`.

## Intentionally deferred (NOT built this phase)

- Full powerup RESOLUTION (Extra Vote / Skip Tribal effects at Tribal, Auto Waiver Pickup
  roster moves, Triple Steal execution) — Phase 3/4. Phase 2 only registers their type
  metadata + allows inventory ownership.
- Exile Island, jury, finale, full challenge-type library, full mentions command router.
- Vote engine reveal/tally (stays on the existing vote route; Phase 2 does not fake ballots).

## Schema / migration needs

**No migration required.** All Phase 2 models already exist and are migrated:
`SurvivorTribe`, `SurvivorTribeMember`, `SurvivorPlayer` (`tribeId`, `idolIds`,
`canAccessTribeChat`), `SurvivorIdol` (powerType/status/isSecret/isPubliclyKnown/
expiresAtWeek/validUntilPhase/currentOwnerUserId/auditLog), `SurvivorIdolLedgerEntry`,
`SurvivorChatChannel` (memberUserIds/channelType/tribeId), `SurvivorChatMessage`
(senderIsHost/isSystemMessage), `SurvivorAuditEntry`, `SurvivorGameState`,
`SurvivorLeagueConfig`. `League.rosterSize` supplies "roster spots" for the idol count.

## Privacy assumptions (enforced, tested)

- Tribe membership unit is `SurvivorPlayer` (the cast). Member rosterId =
  `SurvivorPlayer.redraftRosterId ?? userId` (so the state sanitizer's roster→player map
  resolves).
- `canSeeSurvivorChannel` (Phase 1) already gates tribe channels to own-tribe or
  non-participating host/AI — reused as-is for tribe chat visibility.
- Idol visibility uses the Phase 1 `idolWhere` rule in the state service (own/public/played
  for non-hosts). Seeding sets `status='hidden'`, `isSecret=true`, `isPubliclyKnown=false`.
- Participating commissioner: `canSeeHiddenIdolAssignments=false` → cannot see hidden idol
  owners or other tribes' chats.

## Route / action plan (no route bloat — extends the existing 2-file consolidated route)

`POST /api/leagues/[leagueId]/survivor/[action]` (foundation route) gains:
- `initialize-survivor` — orchestrates assign-tribes → create-tribe-chats → seed-idols →
  post-intro → set stage; idempotent (returns existing state, no duplicates).
- `assign-tribes` — real assignment (replaces `assign-tribes-placeholder`).
- `create-tribe-chats`, `seed-idols`, `post-intro` — individually runnable, idempotent.
- `reset-phase-2-test-state` — dev/test-only (guarded), clears tribes/chats/idols for re-seed.

All Phase 2 mutating actions require `canPerformAdminAction` (commissioner/co-commissioner);
a participating commissioner can run operational init but never sees hidden idol owners.

## Tests / runtime plan

Unit: assignment balance (random), manual validation, draft-pattern limited-data, tribe-name
uniqueness, idempotent init, chat membership + participating-commissioner exclusion, idol seed
count = rosterSpots + tribeCount, multiple idols/user, owner-sees-own, others-cannot-see-hidden,
participating-commissioner-cannot-see-hidden, state sanitizer privacy, intro template, no fake
chat message when infra missing, route auth/scope, route budget unaffected.

Runtime: `seed-survivor-phase2-runtime` (host + participating-commissioner leagues) +
`e2e/survivor-phase2-runtime.spec.ts` verifying init, tribes, chats, own tribe, idol counts,
privacy (participating commissioner blind to hidden owners), non-participating operational
counts, intro presence, mobile, no fake finale/exile/challenge data.

## Status — SHIPPED (2026-06-15)

**Delivered files (Survivor-only):**
- Engines (pure): `lib/survivor/survivorTribeAssignmentEngine.ts`,
  `lib/survivor/survivorIdolSeedingEngine.ts`, `lib/survivor/survivorPromptTemplates.ts`.
- Services (server-only): `lib/survivor/survivorTribeProvisioning.ts`,
  `lib/survivor/survivorTribeChatProvisioning.ts`, `lib/survivor/survivorIdolProvisioning.ts`,
  `lib/survivor/survivorAnnouncementService.ts`, `lib/survivor/survivorPhase2Init.ts`
  (orchestrator + `getSurvivorPhase2Status` + dev-only `resetSurvivorPhase2State`).
- Route: `server/api-route-modules/league-survivor/foundation/route.ts` gains
  `initialize-survivor`, `assign-tribes`, `create-tribe-chats`, `seed-idols`, `post-intro`,
  `phase-2-status`, `reset-phase-2-test-state`. **No new `app/api/**/route.ts` file → route
  budget unchanged.** Mutating actions require `canPerformAdminAction`; reset is blocked in
  production unless `SURVIVOR_ALLOW_TEST_RESET=true`.
- State sanitizer: `lib/survivor/survivorStateService.ts` now returns an `initialization`
  block (tribesAssigned / chatsProvisioned / idolsSeeded / voteShieldCount / introPosted /
  phase2Complete) — non-private aggregate counts only.
- Frontend: `components/league/SurvivorFormatTab.tsx` Phase 2 admin panel (status pills +
  per-step buttons), commissioner-gated.

**Verification (all green):**
- Unit: `__tests__/survivor-phase2-tribes-idols.test.ts` (17) + updated
  `__tests__/survivor-state-sanitizer.test.ts`; full Survivor suite 243/243.
- Completed-format regression: 972/972 (redraft/dynasty/keeper/best-ball/guillotine/war-room).
- Runtime E2E (`@db`, real Neon, chromium): 4/4 — initialize builds 4 tribes + 4 tribe chats +
  19 Vote Shield idols + intro; idempotent re-run (alreadyAssigned/alreadySeeded, still 19);
  participating commissioner cannot see hidden idols or other tribes; non-commissioner member
  gets 403 on admin actions.
- `npx tsc --noEmit` clean on all touched files; ESLint clean; `git diff --check` clean.

**Idol rule confirmed in runtime:** rosterSpots (`League.rosterSize`=15) + tribeCount (4) = 19
Vote Shield idols, hidden, multiples-per-user allowed, expiry at final-5 boundary.
