# Survivor Phase 3 — Tribal Council Voting, Idol Resolution, TV-Style Reveal

Updated: 2026-06-15. Builds on Phase 0 docs, Phase 1 foundation
(`docs/survivor-phase-1-foundation.md`), and Phase 2 tribes/chats/idols
(`docs/survivor-phase-2-tribes-idols-chat.md`). SURVIVOR-only; no other format/product touched.
Goal: make the Phase 2 hidden Vote Shield idols **meaningful** by shipping real private voting,
idol resolution, deterministic tally, and a TV-style reveal — with anti-cheat privacy.

## Exact Phase 3 scope (what this phase builds)

1. **Tribal Council + vote window** — open a council for the losing tribe pre-merge, or for all
   active players post-merge; schedule open/close; status `scheduled → open → closed → revealed`
   (+ `cancelled`). Eligible voters/targets, immunity/skip-safe sets, self-vote policy, late-vote
   policy, vote-change policy (`first_valid_locks` default / `allow_until_close`). Audit on every
   state change.
2. **Private vote submission** — eligible-voter/target validation, self-vote block (default),
   window/late enforcement, first-valid-locks, Extra-Vote extra ballot, late ballots recorded as
   `does_not_count` when late votes are disallowed. Sanitized confirmation to the voter only.
3. **Idol resolution for voting** — Vote Shield (disqualify all votes against the holder →
   `blocked_by_idol`/`does_not_count`), Extra Vote (one extra valid ballot), Skip Tribal (holder
   becomes an ineligible target; optionally forfeits their own vote). One-time-use, status →
   `played`, ledger + audit. Triple Steal / Auto Waiver Pickup remain inventory-only (disabled,
   truthful copy) — not resolved this phase.
4. **Deterministic tally + elimination scaffolding** — apply late invalidation + idol effects +
   extra ballots, exclude invalid targets, final counts, tie detection (→ `needs_revote` /
   `commissioner_tiebreak_required`, never a faked auto-result), deterministic reveal order, and a
   scroll/reveal payload. Elimination: `removed_to_waivers` → mark eliminated + pending roster
   release event (real waiver release only if the existing service is safe; otherwise truthful
   pending state); `exile_island` → mark pending-exile placeholder (no Exile Island engine). Remove
   eliminated/exiled user from active tribe-chat membership; update tribe active membership.
5. **TV-style reveal payload + UI** — one-by-one parchment vote scrolls, `Does Not Count` display
   for late/blocked ballots, final tally, eliminated-user announcement, idol-play reveal where
   allowed, no private voter attribution unless settings allow. Mobile-safe.
6. **State sanitizer + consolidated route actions** — expose council/window status, own eligible
   targets, own vote confirmation only, own playable idols, public reveal payload after reveal,
   operational missing-vote count for allowed hosts, eliminated/exiled status. Never leak other
   users' private votes, hidden idol plays, or pre-reveal results.

## Intentionally deferred (NOT built this phase)

- Exile Island engine (only a truthful pending-exile outcome).
- Jury / finale voting.
- Full challenge library (council is opened by commissioner/host action, not by a challenge
  engine; challenge auto-immunity is out of scope beyond idol/skip safety).
- Full mentions command router (votes are submitted via the consolidated route action, not chat).
- Triple Steal / Auto Waiver Pickup resolution (inventory-only, disabled with truthful copy).
- Rocks / fire-making tie-breakers (Phase 3 records the tie state; resolution is later).

## Schema / migration needs

**No migration required.** `SurvivorTribalCouncil` already carries every Phase 3 field:
`status`, `votingOpensAt`, `votingDeadline`, `voteDeadlineAt`, `closedAt`, `isRevealed`,
`revealSequence`, `revealStartsAt`, `doesNotCountVoteIds[]`, `idolsPlayed`, `nullifiersPlayed`,
`isTie`, `tiePhase`, `tiePlayerIds[]`, `eliminatedRosterId`, `eliminatedUserId`, `eliminatedName`,
`councilNumber`, `auditLog`. `SurvivorVote` carries `doesNotCount`, `isLateVote`, `isDoubleVote`,
`nullifiedBy`, `voterUserId`, `targetUserId`, names, and `@@unique([councilId, voterRosterId])`
(one ballot per voter — the **Extra Vote** extra ballot is stored in `council.idolsPlayed` and
applied at tally, not as a second SurvivorVote row). `SurvivorIdol` (`status`, `usedAt`,
`usedAtCouncilId`, `playWindowRule`, `auditLog`), `SurvivorIdolLedgerEntry`, `SurvivorPlayer`
(`playerState`, `eliminatedWeek`, `tribeId`, `idolIds`, `canAccessTribeChat`), `SurvivorGameState`,
and `SurvivorChatChannel.memberUserIds` cover the rest.

## Privacy model (reuses Phase 1 access control — enforced + tested)

- `canSeePrivateVotes` / `canSeeVoteTallyBeforeReveal` / `canRevealVotes` /
  `canOverrideVoteDeadline` = **non-participating host or AI only**. A **participating
  commissioner has these false** — they may run admin council ops (`canPerformAdminAction`) but
  every response is sanitized so they never see private ballots or pre-reveal tallies.
- A voter sees only their own ballot confirmation. Non-participating host sees the operational
  **missing-vote count** (who has not voted), never ballot contents, unless settings allow.
- Hidden idol plays are not shown to others until reveal; owner sees their own play options.
- After `isRevealed`, the public reveal payload is visible to all league members; voter
  attribution is shown only if league settings permit (default: anonymized "Does Not Count" and
  target tallies without naming voters of valid ballots beyond the reveal sequence policy).

## Route / action plan (no route bloat — extends the existing consolidated route)

`POST /api/leagues/[leagueId]/survivor/[action]` (foundation route) gains:
`open-tribal`, `submit-vote`, `play-idol`, `play-extra-vote`, `play-skip-tribal`,
`close-vote-window`, `tally-votes`, `reveal-votes`, `resolve-elimination`, `tribal-status`.
- `submit-vote` / `play-*` require an **eligible participant** (the acting user).
- `open-tribal` / `close-vote-window` / `tally-votes` / `reveal-votes` / `resolve-elimination`
  require `canPerformAdminAction`; their responses are sanitized by `canSeeVoteTallyBeforeReveal`.
No new `app/api/**/route.ts` file → route budget unchanged.

## Services (canonical Phase 3; legacy PascalCase engines left intact)

- `lib/survivor/survivorCouncilService.ts` (Tribal Council lifecycle + vote window; named to avoid
  the Windows case-insensitive collision with the legacy `SurvivorTribalCouncilService.ts`).
- `lib/survivor/survivorVoteService.ts` (private vote submission).
- `lib/survivor/survivorIdolResolutionService.ts` (vote_shield / extra_vote / skip_tribal plays).
- `lib/survivor/survivorVoteTallyService.ts` (deterministic tally + reveal payload).
- `lib/survivor/survivorEliminationService.ts` (elimination outcome scaffolding + chat removal).
- `lib/survivor/survivorBallotEligibility.ts` (pure eligible voter/target computation; distinct
  filename from legacy `SurvivorCouncilEligibility.ts` due to the Windows case-insensitive FS).

## Tests / runtime plan

Unit: open pre-merge losing tribe, eligible voters/targets, self-vote blocked, first-valid-locks,
late does-not-count, participating-commissioner cannot see private votes, host sees missing-vote
count only, Vote Shield blocks votes against holder, Extra Vote adds a ballot, Skip Tribal makes
holder an ineligible target, tally excludes invalid votes, tie → `needs_revote`/tiebreak, reveal
scroll order, "Does Not Count" reveal, elimination pending-exile, elimination removed-to-waivers/
pending-release, chat membership removal, state sanitizer privacy, route auth/scope, idempotent
reveal, no fake finale/exile state.

Runtime: `scripts/seed-survivor-phase3-runtime.ts` + `e2e/survivor-phase3-runtime.spec.ts`
(real Neon, `@db`) verifying open → private vote → self-vote block → late does-not-count →
Vote Shield block → Extra Vote ballot → Skip Tribal safety → participating-commissioner privacy →
tally/reveal scroll payload → eliminated status + chat removal → mobile reveal → no fake
exile/finale state.

## Status — SHIPPED (2026-06-15)

**Delivered files (Survivor-only):**
- Pure: `lib/survivor/survivorBallotEligibility.ts`.
- Server-only services: `lib/survivor/survivorCouncilService.ts` (council + vote window + shared
  context), `survivorVoteService.ts`, `survivorIdolResolutionService.ts`,
  `survivorVoteTallyService.ts`, `survivorEliminationService.ts`, `survivorTribalView.ts`
  (privacy-aware per-user view).
- State sanitizer: `survivorStateService.ts` now returns a `tribalCouncil` block.
- Route: `foundation/route.ts` gains `open-tribal`, `submit-vote`, `play-idol`,
  `play-extra-vote`, `play-skip-tribal`, `close-vote-window`, `tally-votes`, `reveal-votes`,
  `resolve-elimination`, `cancel-tribal`, `tribal-status`. **No new `app/api/**/route.ts` →
  route budget unchanged.** Admin actions require `canPerformAdminAction`; the `tally-votes`
  response is sanitized for a participating commissioner (no pre-reveal tally).
- Frontend: `SurvivorTribalCouncilPanel`, `SurvivorVoteRevealScrolls`, `SurvivorVoteWindowCard`,
  `SurvivorIdolPlayPanel`, wired into `SurvivorFormatTab`. No dead buttons; Triple Steal / Auto
  Waiver Pickup disabled with truthful copy.

**Verification (all green):**
- Unit: `__tests__/survivor-phase3-voting.test.ts` (15) + updated sanitizer test; full Survivor
  suite 259/259.
- Completed-format regression: 972/972.
- Runtime E2E (`@db`, real Neon, chromium): 6/6 — private vote + self-vote block + first-valid
  lock; Vote Shield / Extra Vote / Skip Tribal plays; member 403 on admin actions; host
  close→tally→reveal→resolve (shield blocks 2 ballots, clean target eliminated, removed from tribe
  chat); participating commissioner blocked from pre-reveal tally + reveal; mobile page render.
- `npx tsc --noEmit` clean on all touched files; ESLint clean; `git diff --check` clean.

**No migration required** — every field used already exists on `SurvivorTribalCouncil` /
`SurvivorVote` / `SurvivorIdol`. Deferred: Exile Island engine (pending-exile placeholder only),
jury/finale, full challenge library, mentions router, Triple Steal / Auto Waiver Pickup
resolution, rocks/fire-making tie-breakers. Full Survivor is **not** complete.
