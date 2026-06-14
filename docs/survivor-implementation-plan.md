# Survivor Implementation Plan

Updated: 2026-06-14

## Execution Rule

Do not leave Survivor for another format or product area until Survivor is fully set up
or a precise blocker is documented. Each phase below is Survivor-only and must preserve
Redraft, Dynasty, Keeper, and Best Ball.

## Phase 0 - Audit and Architecture Docs

Status: complete for this docs pass.

Deliverables:

- `docs/survivor-full-concept-audit.md`
- `docs/survivor-full-product-spec.md`
- `docs/survivor-implementation-plan.md`
- `docs/survivor-runtime.md`
- `docs/war-room-format-readiness.md` update

Exit criteria:

- Existing code and schema are mapped to requested concept.
- Unsafe areas are called out explicitly.
- Migration and route-budget discipline are documented.

## Phase 1 - Privacy and Canonical Settings Foundation

Purpose: make Survivor safe before expanding gameplay.

Tasks:

- Normalize Survivor creation defaults to requested target: NFL/NCAAF, 20-team default,
  range 16-20, default 4 tribes of 5.
- Reconcile allowed draft IDs across concept defaults, option catalog, creation UI, and
  draft engine.
- Persist all setup fields required by the product spec.
- Add role helper for participating commissioner and co-commissioner blind mode.
- Apply blind-mode helper to idol routes, commissioner dashboard, AI context, command
  routes, chat APIs, challenge hidden picks, and vote routes.
- Remove or replace frontend fake gameplay data.
- Add tests proving hidden idols/votes/private channels are redacted from participating
  commissioner.

Acceptance:

- Survivor league can be created with canonical settings.
- Participating commissioner cannot see hidden idols, private votes, private DMs, or
  AI-only secrets.
- Settings are editable before lock/start.
- Dangerous post-start setting edits require confirmation and audit logs.

Potential migrations:

- Add missing config columns only if settings cannot be safely stored in existing config.
- Add typed command confirmation rows if existing tables cannot store pending actions.

Neon SQL posture:

- Idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` only.
- No destructive changes.
- No unsafe `db push`.

## Phase 2 - Draft Completion, Tribes, Chats, and Idol Seeding

Tasks:

- Wire draft-complete event to Survivor bootstrap for real leagues only.
- Support random, commissioner manual, and draft-pattern tribe assignment.
- Create main league chat, tribe chats, and private Chimmy/commissioner DM channels.
- Generate/edit tribe names and logo fallback.
- Seed vote-shield idols by requested formula: total drafted roster spots plus tribe count.
- Allow multiple idols per user where the rule permits.
- Ensure secret idol notices persist in valid private channels.
- Create audit logs and notifications for every bootstrap action.

Acceptance:

- Draft completion creates correct tribes, chats, and hidden inventory.
- Participating commissioner cannot see hidden assignments.
- Mock draft creates no game events.

Potential migrations:

- Add dedicated private-channel membership rows if `memberUserIds` is not sufficient.
- Add or canonicalize advantage inventory if `SurvivorIdol` cannot represent all powers.

## Phase 3 - Powerup Execution

Tasks:

- Implement shippable power flows for Vote Shield, Extra Vote, Skip Tribal, Auto Waiver
  Pickup, and Triple Steal.
- Validate ownership, expiry, timing, targets, roster legality, waiver rules, and one-time
  use.
- Add UI flows and mention-command flows with confirmation for destructive actions.
- Notify league, affected teams, user, commissioner/AI, and audit log.

Acceptance:

- Vote Shield disqualifies votes against holder.
- Extra Vote adds one valid ballot.
- Skip Tribal protects holder.
- Auto Waiver Pickup moves a legal player.
- Triple Steal moves three legal players from three separate teams.

## Phase 4 - Communications, Mentions, and Notifications

Tasks:

- Create/verify main, tribe, side/alliance, private host, exile, jury, and finale channels.
- Enforce channel membership transitions on elimination, exile, merge, jury, and finale.
- Extend mention parsing for `@chimmy`, commissioner, combined private routing, vote
  submissions, idol/power commands, and challenge submissions.
- Require confirmation for destructive actions.
- Bridge Survivor notifications to shared notification preferences when available.

Acceptance:

- Private vote by mention records a real vote.
- Idol/power mention opens the correct flow.
- Eliminated users lose active-player chats immediately.
- Notifications exist for every official action.

## Phase 5 - Challenge Engine

Tasks:

- Build challenge definitions for requested type matrix.
- Add challenge creation, submission, lock, resolution, reward, and audit flows.
- Support provider-backed results and commissioner-confirmed provider-limited states.
- Add no-gambling labels for spread/over-under style fantasy challenges.
- Post results to correct chats.

Acceptance:

- Commissioner/AI can create weekly challenges.
- Users can submit through UI or permitted chat/DM.
- Locked submissions cannot be edited.
- Rewards and penalties apply deterministically.

## Phase 6 - Tribal Council, Vote Reveal, and Elimination

Tasks:

- Open/close vote windows from schedule.
- Enforce private vote submission only.
- Resolve immunity, Skip Tribal, Extra Vote, Vote Shield, late votes, ties, and revotes.
- Build real reveal payload for scroll/parchment UI.
- Apply elimination outcome: waiver release or Exile.
- Update SurvivorPlayer, roster state, chats, notifications, audit logs, and jury threshold.

Acceptance:

- Full private voting works.
- Idol/power resolution affects tally correctly.
- "Does Not Count" appears for invalid late/blocked votes according to settings.
- Eliminated user state and chat membership update correctly.

## Phase 7 - Sit-Outs, Merge, and Individual Game

Tasks:

- Persist sit-out history if existing audit storage is insufficient.
- Enforce no consecutive sit-out.
- Equalize scoring for uneven tribes.
- Trigger merge by week or active-player count.
- Archive tribe chats and create merge state/channel if configured.
- Switch challenge/vote mode to individual.
- Expire idols by remaining-player rule.

Acceptance:

- Sit-outs affect scoring.
- Merge disbands tribe game mode correctly.
- Post-merge challenge/vote mode works.

## Phase 8 - Exile Island

Tasks:

- Enroll eliminated users into Exile when configured.
- Reset Exile roster weekly.
- Implement waiver claims and QB/team-stack assignment.
- Score Exile lineups.
- Award tokens and weekly wins.
- Run Boss lineup and token reset.
- Return token leader when main island reaches final 3.

Acceptance:

- Exile users can compete without active-player chat access.
- Token leader/wins logic returns a player to main island.
- Boss reset is audited and notified.

## Phase 9 - Jury and Finale

Tasks:

- Start jury at 60 percent threshold by default.
- Create jury chat and enforce no active-player leakage.
- Add durable finalist speeches and jury Q&A.
- Open private final jury vote.
- Reveal final votes with real scroll payload.
- Declare Sole Survivor.

Acceptance:

- Not every eliminated player is jury.
- Final winner is decided by jury vote, not fantasy score.
- No fake finale data remains.

## Phase 10 - Videos and Presentation

Tasks:

- Wire Survivor image/video assets in creation, league home, intro, and draft milestones.
- Lazy-load videos with muted autoplay where allowed.
- Add fallback images and non-blocking load behavior.
- Verify mobile layout.

Acceptance:

- Videos render or fall back without crashing/hydration issues.

## Phase 11 - AI Host and Chimmy Grounding

Tasks:

- Make `buildSurvivorContextForChimmy` role-aware and redacted.
- Add Survivor-specific deterministic intent handling where possible.
- Ensure model prompts say AI suggests/records through engine, never decides hidden outcomes.
- Add AI host narration for intro, challenge, Tribal, merge, Exile, jury, and finale.
- Add tests for secrecy boundaries.

Acceptance:

- AI can answer and route official actions without leaking secrets.
- Destructive actions require confirmation.

## Phase 12 - Frontend Completion

Tasks:

- Audit every Survivor screen and button.
- Replace fake/static actions with real routes, disabled truthful states, or hidden controls.
- Complete dashboard, tribe, chat, DM, inventory, challenge, vote, reveal, exile, jury,
  finale, settings, commissioner, and mobile views.

Acceptance:

- No dead buttons.
- No fake gameplay state.
- Mobile smoke passes.

## Phase 13 - Route Consolidation

Tasks:

- Keep new work inside league-scoped catch-all dispatcher.
- Avoid new action-specific route files.
- Consolidate legacy `app/api/survivor/*` routes when safe.
- Run route budget audit after route work.

Acceptance:

- Route budget remains green.
- Route count does not grow for each gameplay action.

## Phase 14 - Tests and Runtime

Required unit/integration coverage:

- settings normalization
- tribe assignment random/manual/draft-pattern
- tribe chat creation
- member privacy
- participating commissioner anti-cheat
- idol seeding counts
- multiple idols allowed
- Vote Shield, Extra Vote, Skip Tribal
- Triple Steal
- Auto Waiver Pickup
- idol expiry by remaining players
- challenge create/submit/lock/resolve
- private vote submission
- late vote "Does Not Count"
- reveal payload
- elimination to waivers
- elimination to Exile
- sit-outs and no consecutive sit-out
- merge
- Exile waiver/team-claim/token logic
- Boss reset
- jury threshold
- final speeches/votes/reveal
- mentions parser
- notifications
- chat privacy boundaries
- global Chimmy Survivor grounding
- videos lazy-load/fallback
- route budget

Runtime deliverables:

- `scripts/seed-survivor-full-runtime.ts`
- `e2e/survivor-full-runtime.spec.ts`

Acceptance:

- DB-backed Playwright runtime passes create/start through finale-critical flows.

## Phase 15 - Final Readiness Report

The final report must include:

- commit SHA
- route budget status
- migrations/Neon SQL status
- league creation status
- draft/tribe assignment status
- idol/powerup status
- challenge engine status
- chat/mentions/notifications status
- tribal/vote/reveal status
- Exile status
- jury/finale status
- commissioner dashboard/anti-cheat status
- video/media status
- AI/Chimmy grounding status
- frontend status
- Playwright runtime status
- tests run/results
- exact remaining Survivor-only gaps
- whether Survivor is fully set up or the exact blocker

## First Code Commit Recommendation

The first non-docs implementation commit should be small and safety-focused:

1. Add a shared Survivor blind-mode visibility helper.
2. Patch idol inventory route redaction.
3. Patch commissioner dashboard redaction.
4. Patch Chimmy context redaction.
5. Remove fake finale gameplay data or gate it behind non-production fixtures.
6. Add unit tests for participating commissioner secrecy.

Do this before expanding powers, Exile, jury, or presentation polish.
