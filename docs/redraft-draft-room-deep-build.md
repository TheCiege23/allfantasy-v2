# Redraft Draft Room Deep Build

Date: 2026-06-19
Branch: `hardening/redraft-draft-room`
Base: `hardening/redraft-core-contract` at `ffb37116109704df1501474334c21e7357e7b807`

## Scope

This pass hardens the NFL/NCAAF redraft draft room without touching production data, provider write syncs, env files, payments, World Cup, or unrelated sports.

The existing draft room already had the main runtime spine:

- `DraftSession` / `DraftPick` as the live source of truth.
- `PickSubmissionService.submitPick` as the transaction-authoritative pick path.
- Stale-pick and race retry codes.
- Queue and expired-timer autopick paths.
- Auction, offline banner, slow-draft timer settings, draft chat, War Room popup, player search/filter, commissioner controls, draft board, and roster strip surfaces.
- Draft completion and roster assignment services.

This branch adds explicit redraft draft-room contracts around that spine so modes, errors, AI-managed teams, War Room suggestions, and Chimmy context are deterministic and testable.

## Mode Contract

New module: `lib/redraft-draft-room/draftRoomModeContract.ts`

The contract normalizes draft room behavior into the production modes requested for Redraft V1:

- `live`
- `mock`
- `offline`
- `slow`
- `auto`
- `auction`

For each mode it exposes:

- engine core: `snake`, `linear`, or `auction`
- safe state: `ready`, `setup_required`, `paused`, `complete`, or `blocked`
- user pick eligibility
- commissioner pick-entry eligibility
- timer, queue, autopick, chat, War Room, Chimmy, and auction-budget capabilities
- reason codes for blocked/setup states

Important behavior:

- Mock mode is explicitly marked as non-mutating for real rosters.
- Offline mode disables user picks and enables commissioner pick entry.
- Auto mode disables user picks and keeps deterministic autopick/queue behavior available.
- Slow mode is inferred from `slow_draft`, long timers, or overnight pause settings.
- Auction mode uses the auction engine and budget capability.
- Missing roster config or draft order blocks starts and picks.

## Pick Engine Validation

Existing engine authority codes are preserved for backward compatibility. New module `lib/redraft-draft-room/pickErrorContract.ts` maps them into the UX-safe redraft contract:

- `NOT_ON_CLOCK`
- `DRAFT_PAUSED`
- `PLAYER_UNAVAILABLE`
- `PLAYER_INELIGIBLE`
- `STALE_PICK`
- `DRAFT_COMPLETE`
- `UNAUTHORIZED`
- `COMMISSIONER_REQUIRED`
- `VALIDATION_FAILED`

This is intentionally a normalization layer. It does not replace the transaction path in `PickSubmissionService`, so current race, stale overall, duplicate player, paused draft, and invalid payload protections remain intact.

## Deterministic AI-Managed Teams

Expanded the NPC draft personality contract from 8 to 21 supported personas in `lib/live-draft-engine/npcDraftPersonalityTypes.ts`:

1. `BALANCED`
2. `NEED_BASED`
3. `BEST_PLAYER_AVAILABLE`
4. `ADP_VALUE_HUNTER`
5. `UPSIDE_SWINGER`
6. `FLOOR_SAFE`
7. `ZERO_RB`
8. `HERO_RB`
9. `RB_HEAVY`
10. `WR_HEAVY`
11. `ELITE_QB`
12. `LATE_QB`
13. `EARLY_TE`
14. `YOUTH_DYNASTY_UPSIDE`
15. `WIN_NOW_VETERAN`
16. `STACK_TEAM_CORRELATION`
17. `BYE_WEEK_DIVERSIFIER`
18. `INJURY_AVOIDANT`
19. `CONTRARIAN_CHAOS`
20. `HOMER_TEAM_FAVORITE`
21. `IDP_SPECIALIST`

New module: `lib/redraft-draft-room/personaEngine.ts`

The redraft persona engine is deterministic and does not call paid AI. It:

- assigns stable personas from a seed
- filters illegal picks first
- excludes drafted players
- excludes wrong-sport players
- excludes explicitly ineligible players
- scores by ADP, projections, need, queue priority, injury risk, bye week awareness, team stacking, and persona strategy

The existing live-draft NPC scoring path was also expanded so assigned commissioner AI managers can use the new persona IDs during autopick decisions.

The commissioner AI manager API already accepted `npcDraftPersonality` in the schema, but the PATCH route was dropping it. This branch preserves:

- `npcDraftPersonality`
- `npcFavoriteTeamAbbr`

and includes those values in the API response for active AI-managed teams.

## War Room Suggestions

New module: `lib/redraft-draft-room/warRoomSuggestions.ts`

The redraft War Room helper wraps the existing deterministic recommendation engine and adds proof-focused safeguards:

- drafted players are excluded by id or normalized name
- wrong-sport and ineligible rows are excluded
- best pick and alternatives are returned from the legal pool only
- injury and bye week warnings are surfaced
- missing ADP/projection/confidence labels are returned for UI/Chimmy context

The existing `/api/ai/draft/recommend` route already sanitizes incoming player rows before the War Room engine, and this branch does not loosen that boundary.

## Chimmy Draft Context

New module: `lib/redraft-draft-room/chimmyDraftContext.ts`

The context builder creates a structured, grounded draft-room payload for Chimmy from:

- league and scoring metadata
- mode contract
- current pick
- roster slots
- legal available players
- drafted players
- queue
- War Room output
- data quality labels

It intentionally sanitizes player rows down to safe fields only:

- id
- name
- position
- team
- ADP
- bye week
- injury status
- weekly projection
- rest-of-season projection
- projection confidence

Raw provider payload keys such as `raw`, `payload`, `providerPayload`, `rollingInsightsPayload`, `rolling_insights_payload`, `riRaw`, and `sourcePayload` are not propagated into the generated context.

## Player Pool, Board, Chat, Timer, Completion

Audited existing implementation and kept it in place:

- Player search/filter/media: `PlayerPanel`, `DraftPlayerCard`, image and provider fallback helpers.
- Board construction: `DraftBoard`, `DraftTeamStrip`, `buildDraftRoomCoreState`, and `buildDraftRoomPageDerivedState`.
- Queue/timer/autopick: `DraftQueue`, `autopickBestAvailableSubmit`, expired autopick routes, soft/overnight timer services.
- Draft chat: `DraftChatPanel`, `DraftChatDock`, and `/draft/chat` route polling.
- Commissioner controls: `CommissionerControlCenterModal`, controls route, pick editor, pause/resume/reset/undo paths.
- Auction: auction nomination/bid/resolve services and auction spotlight panel.
- Post-draft completion: `DraftSessionService` completion and `RosterAssignmentService` roster materialization.
- Mobile: sticky draft bar, mobile quick actions, bottom dock tabs, War Room popup/bottom sheet.

No large client rewrite was needed in this pass.

## Fully Built

- Explicit mode contract for mock/live/offline/slow/auto/auction.
- Pick error normalization contract for UX-safe handling.
- 21 deterministic AI missing-team personas.
- Persona scoring expansion in the existing NPC autopick path.
- Persona field preservation through commissioner AI manager PATCH/API response.
- Deterministic redraft War Room helper with drafted-player exclusion and risk labels.
- Grounded Chimmy draft context builder with raw-provider payload guard.
- Focused regression coverage for all new contracts.

## Safely Deferred

These are already present in the existing app or require browser/DB validation rather than new feature scope in this branch:

- Full browser verification across every draft size and viewport.
- Live provider data freshness.
- Autonomous NPC trade negotiation loop.
- Auction end-to-end Playwright coverage beyond existing route/service tests.
- Full post-draft roster materialization in a live Neon branch.

## Manual Smoke Checklist

Run on staging/preview only:

1. Create NFL redraft snake league, 4 teams.
2. Open Draft tab before start; verify setup/start path is visible.
3. Start draft as commissioner.
4. Search player pool; verify projections, injury, bye, team, and confidence fields are visible where available.
5. Add top players to queue.
6. Submit user pick while on clock.
7. Attempt stale pick from old board state; verify refresh/retry message.
8. Enable autopick; let timer expire; verify legal queue-first pick.
9. Pause and resume draft; verify user picks are blocked while paused.
10. Assign orphan AI team with a persona; verify persona is returned by commissioner AI managers API.
11. Trigger AI pick for orphan team; verify pick is legal and audited.
12. Open War Room; verify drafted players do not appear as recommendations.
13. Ask Chimmy about the draft; verify answer cites only available/drafted/queue/War Room context and labels fallback data.
14. Send draft chat message; refresh; verify message persists.
15. Complete final round; verify completed banner and roster sync.
16. Repeat for NCAAF snake league.
17. Repeat quick smoke for mock draft route.
18. Repeat quick smoke for offline mode commissioner pick entry.
19. Repeat quick smoke for slow draft overnight/long timer mode.
20. Repeat quick smoke for auction nomination/bid/resolve.

## Validation Commands

Targeted:

```powershell
npm test -- __tests__/redraft/redraft-draft-room-hardening.test.ts
npm test -- __tests__/redraft
npm test -- __tests__/draft
npm test -- __tests__/live-draft-engine
npm run lint
git diff --check
```

Browser regression when `.env.redraft-test` is available:

```powershell
node --env-file=.env.redraft-test node_modules/@playwright/test/cli.js test --grep "@draft-room|@mock-draft-room" --project=chromium
```

Build:

```powershell
npm run build
```

If the local Next build cache resolves stale absolute paths, clean `.next`, `.next-playwright-*`, and `node_modules/.cache`, then rebuild from the current worktree.
