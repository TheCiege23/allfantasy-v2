# Survivor Full Concept Audit

Updated: 2026-06-14 (audit) / 2026-06-15 (build progress note)
Base commit audited: 54f309e87b01ef3dcea186ad6d15594f7058836a

> **Build progress:** Phase 1 (privacy + canonical settings) and Phase 2 (tribe assignment,
> tribe/league chats, host intro, hidden Vote Shield idol seeding) are now implemented and
> DB-runtime verified. See `docs/survivor-phase-2-tribes-idols-chat.md`. Powerup RESOLUTION,
> challenges, vote reveal, Exile, jury, and finale remain deferred to later phases.

## Scope

This audit covers the full requested Survivor league concept only. Redraft, Dynasty,
Keeper, and Best Ball are already shipped and must not be changed except to prevent
regressions. Guillotine, Tournament, Salary Cap, Devy, C2C, IDP, Zombie, Big Brother,
War Room expansion, and unrelated Chimmy features are out of scope until Survivor is
fully set up on frontend and backend.

The named reference documents were not present in the available workspace or attachment
folder during this audit. The pasted request is therefore the active product-rule proxy
for those documents until the original `.docx` files are available:

- KB Survivor Rooks vs Vets.docx
- KB Survivor Rooks vs Vets Rewrite.docx
- Welcome to the Island.docx
- Exile Island.docx
- Suvivor chat.docx
- Survivor for Replit.docx

Available media assets found in the repo include:

- `public/league-type-survivor.png`
- `public/league-type-survivor.mp4`
- `public/league-type-survivor-intro.mp4`
- `public/survivor/Survivor League Intro.mp4`
- `public/media/create-league/concept/videos/Survivor.mp4`
- `public/media/create-league/concept/thumbnails/Survivor.png`

## Status Decision

Survivor is not fully set up yet.

The repo contains substantial Survivor code, but the implementation is not safe to ship
as a complete game loop. The critical blockers are hidden-info privacy, inconsistent
creation defaults, incomplete end-to-end runtime coverage, placeholder/fabricated
frontend states, and missing or unproven durable flows for powers, chats, exile, jury,
and final vote.

## Inventory Snapshot

| Area | Current status | Evidence | Notes |
| --- | --- | --- | --- |
| Survivor library | Partial | 88 files under `lib/survivor` | Good foundation, but several engines are not proven in a DB-backed runtime. |
| Survivor frontend | Partial | 56 files under `components/survivor` and `app/survivor` | Several screens exist; some actions are preview/static and finale currently fabricates sample votes. |
| Consolidated league API | Partial | `app/api/leagues/[leagueId]/survivor/[...path]/route.ts` plus modules under `server/api-route-modules/league-survivor` | Preferred route shape exists. Keep future work inside this dispatcher. |
| Legacy/global Survivor API | Needs consolidation | `app/api/survivor/*` routes still exist | Route-budget risk. Do not add action-by-action route files. |
| Prisma schema | Partial / needs migration | Survivor models exist from config through weekly score | Many concepts exist, but some requested durable records are missing or represented indirectly. |
| League creation | Partial | `app/leagues/create/steps/SurvivorSetupStep.tsx`, `lib/league-concepts/survivorDefaults.ts` | UI defaults and canonical defaults disagree. Requested 20-player default/4x5 must win. |
| Draft and tribe bootstrap | Partial | `SurvivorDraftBootstrapService`, `SurvivorTribeService`, tribe models | Random/manual foundations exist, but draft-pattern assignment and private notices are not fully reliable. |
| Idol and powerup system | Unsafe / partial | `SurvivorIdolRegistry`, `SurvivorEffectEngine`, idol routes | Count rules conflict with request; hidden idol privacy leaks for participating commissioner. |
| Challenges | Partial / provider-limited | `SurvivorChallengeEngine`, `challengeEngine`, `tokenPoolEngine` | Need full challenge type matrix, lock/tally/reward audit, and truthful provider-limited states. |
| Tribal council and votes | Partial | `SurvivorVoteEngine`, `SurvivorTribalCouncilService`, vote routes | Private vote flow, late vote labeling, idol resolution, reveal, and roster/chats removal need runtime proof. |
| Chat and DMs | Partial / unsafe until proven | `SurvivorChatChannel`, `SurvivorChatMessage`, `chatPermissionGuard` | Main/tribe/exile/jury channels exist; private Chimmy/commissioner DM and side/alliance flows need durable membership and privacy tests. |
| Mentions and commands | Partial | `SurvivorCommandParser`, `SurvivorOfficialCommandService`, `chatMentionParser` | Explicit commands exist; natural language, combined Chimmy/commissioner routing, and confirmation flows remain. |
| Notifications | Partial | `SurvivorNotification`, `notificationEngine`, `notifications` | Need integration with shared in-app/push/email preferences and official-action coverage. |
| AI / Chimmy grounding | Partial / privacy-sensitive | `buildSurvivorContextForChimmy`, `SurvivorAIService`, prompts | Context exists, but role-aware redaction must be enforced and tested before hidden mechanics ship. |
| Exile Island | Partial | `SurvivorExileEngine`, `exileEngine`, Exile models | Need weekly empty roster, waiver claims, QB/team stack, boss reset, tokens, and return path runtime. |
| Jury / finale | Partial | `JurySession`, `JuryVote`, `SurvivorFinaleEngine` | Missing durable finalist speeches/Q&A and frontend currently uses fake finalist/jury data in at least one page. |
| Commissioner dashboard | Unsafe until fixed | `buildSurvivorCommissionerDashboard`, `commissionerBlindMode` | Participating commissioner must not see hidden idols, votes, DMs, or AI-only secrets. |
| Tests | Needs E2E | Existing unit tests plus route tests | No `e2e/survivor-full-runtime.spec.ts`; no full DB seed for the complete loop. |

## Requested Concept Map

| Requested concept | Existing repo support | Gap |
| --- | --- | --- |
| NFL and NCAAF Survivor initially | Partial | Canonical defaults support NFL/NCAAF, but older docs/code mention other sports and creation defaults conflict. |
| 20 teams default, range 16-20 | Partial | Creation UI supports 16-20; canonical defaults currently use NFL 16 and NCAAF 14. |
| Default 4 tribes of 5 | Partial | UI recommends 4x5 at 20; canonical defaults use 2 tribes. |
| Draft before tribe assignment unless manual pre-draft | Partial | Bootstrap exists after draft, but manual pre-draft and draft-pattern mode need hardening. |
| Draft types snake, auction, linear, real-time, by-team plus supported canonical IDs | Partial | Current canonical Survivor draft IDs are snake/auction; option catalogs disagree. |
| AI-generated editable tribe names/logos | Partial | Visual helpers and assets exist; generation/fallback pipeline is not proven. |
| Merge by week or active-player count | Partial | Fields and engines exist; lifecycle wiring needs runtime proof. |
| Jury threshold at 60 percent remaining | Missing/partial | Jury models exist; threshold semantics need canonical config and tests. |
| Idols valid until 5 left, invalid at 4 | Partial | Expiry fields exist; requested default must be normalized and tested. |
| Weekly Tribal schedule and late votes labeled "Does Not Count" | Partial | Vote models/routes exist; schedule, private vote windows, and reveal labels need proof. |
| Elimination to waivers or Exile | Partial | Roster mutation and exile engines exist; waiver release and chat removal must be tested end-to-end. |
| Sit-outs for uneven tribes, no consecutive sit-out | Partial | Sit-out engine exists; storage is indirect and needs durable history tests. |
| Participating commissioner blind mode | Unsafe | Blind-mode helper exists but is not consistently applied to idol routes/dashboard/AI context. |
| Co-commissioner restrictions | Partial | Role checks exist; hidden-info restrictions need same blind-mode contract. |
| Conduct rules and screenshot restrictions | Missing/partial | Needs settings copy, enforcement hooks, and audit policy. |
| One vote-shield idol per roster spot plus one per tribe | Missing | Current default idol count is low and capped; literal requested count needs new seeding logic. |
| Multiple idols per user allowed | Partial | Schema can represent multiple idol rows, but assignment currently avoids multiple initial owners. |
| Powerup pool and execution | Partial | Power templates/effects exist; required five initial powers are not all proven with UI, audit, and notifications. |
| Tribe/main/private/exile/jury/finale chats | Partial | Models exist; side/alliance/private DM flows and membership transitions need hardening. |
| Mention commands and natural language | Partial | Command parser exists; destructive confirmations and combined routing remain. |
| Weekly sports prediction challenges | Partial/provider-limited | Need type matrix, provider fallback, lock/tally, and no-gambling copy. |
| TV-style vote reveal | Partial | Components exist; needs real payload and no fake votes. |
| Exile waiver subgame | Partial | Engines exist; weekly empty rosters, claims, QB/team stack, boss reset, token leader return need runtime. |
| Finalist speeches, jury Q&A, private final vote | Partial | Finale engine and vote models exist; speech/Q&A persistence is missing. |
| Survivor videos | Partial | Assets exist; lazy loading/fallback and placement need verification. |
| Full frontend with no dead buttons | Partial | Screens exist but must be audited action by action. |

## Schema Audit

Models already present in `prisma/schema.prisma` include:

- `SurvivorLeagueConfig`
- `SurvivorTribe`
- `SurvivorTribeMember`
- `SurvivorIdol`
- `SurvivorIdolLedgerEntry`
- `SurvivorTribalCouncil`
- `SurvivorVote`
- `SurvivorExileLeague`
- `SurvivorExileToken`
- `SurvivorJuryMember`
- `SurvivorAuditLog`
- `SurvivorChallenge`
- `SurvivorChallengeSubmission`
- `SurvivorTribeChatMember`
- `SurvivorPlayer`
- `JurySession`
- `JuryVote`
- `SurvivorHostMessage`
- `SurvivorChatChannel`
- `SurvivorTribeSwap`
- `TokenPoolPick`
- `ExileIsland`
- `ExileWeeklyEntry`
- `SurvivorPowerTemplate`
- `SurvivorSeasonArcTemplate`
- `SurvivorChallengeTemplate`
- `SurvivorPowerBalance`
- `SurvivorTwistEvent`
- `SurvivorAuditEntry`
- `SurvivorGameState`
- `SurvivorPhaseTransition`
- `SurvivorNotification`
- `SurvivorChatMessage`
- `SurvivorChatReaction`
- `SurvivorCommissionerAction`
- `SurvivorSeasonSnapshot`
- `SurvivorWeeklyScore`

Schema pieces that must be verified or added with safe additive migrations:

| Need | Current likely backing | Decision needed |
| --- | --- | --- |
| Requested powerup ownership inventory | `SurvivorIdol` with `powerType`, templates, ledgers | Either canonicalize idols as the one advantage inventory or add `SurvivorPowerInventory`. |
| Sit-out history | `SurvivorCommissionerAction` | Prefer a dedicated sit-out history table if current audit rows cannot enforce no-consecutive safely. |
| Finalist speeches | None confirmed | Add `SurvivorFinalistSpeech` or extend finale session data. |
| Jury questions/comments | `JurySession` maybe | Add explicit Q&A rows if not already durable and scoped. |
| Side/alliance chat membership and invites | `SurvivorChatChannel.memberUserIds` | Verify enough for privacy/audit; add membership rows if not. |
| Private Chimmy/commissioner DM per user | `SurvivorChatChannel`, `SurvivorChatMessage` | Must ensure channel exists, member list is durable, and FK-compatible. |
| Mention command confirmations | None confirmed | Add pending command/action table or use commissioner action rows with typed state. |
| Public vote reveal events | `revealSequence` / messages | Verify stable payload for scroll UI and audit. |
| Exile weekly roster claims | `ExileWeeklyEntry`, token pool rows | Verify waiver/claim history and QB/team-stack assignment are durable. |
| Notification delivery bridges | `SurvivorNotification` | Connect to shared notification preferences/channels or document in-app only. |

No destructive migration is acceptable. If live DB drift is found, use scoped idempotent
SQL and Prisma migrations only. Do not use unsafe `db push`.

## Critical Blockers

1. Hidden idol privacy leak:
   `server/api-route-modules/league-survivor/idols/route.ts` returns every idol to
   the league owner. That is invalid when the commissioner is also a player. The route
   also selects non-existent or unverified fields in the non-commissioner projection.

2. Commissioner dashboard blind-mode gap:
   `buildSurvivorCommissionerDashboard` does not prove it filters hidden votes, idols,
   private DMs, AI-only secrets, or hidden challenge submissions for participating
   commissioner/co-commissioner roles.

3. Default mismatch:
   `lib/league-concepts/survivorDefaults.ts` defaults to NFL 16 / NCAAF 14, 2 tribes,
   merge at half, and snake/auction only. The requested product default is 20, 4 tribes
   of 5, draft options expanded to all supported canonical IDs.

4. Idol count mismatch:
   Current idol seeding is capped by a low `idolCount` default. The requested rule is
   one vote-shield idol per roster spot plus one per tribe, with multiple idols per user
   allowed after random/challenge acquisition.

5. Private DM creation risk:
   Some bootstrap paths attempt private Chimmy notification without proving compatible
   `SurvivorChatChannel` rows exist first. Silent failure is not acceptable for secret
   official notices.

6. Fake gameplay UI:
   The finale page currently fabricates finalist/juror/vote preview data. Survivor must
   not ship fake votes, jury votes, idol plays, challenge results, or roster movement.

7. No full runtime:
   There is no DB-backed `e2e/survivor-full-runtime.spec.ts` and no full runtime seed
   covering create, draft complete, tribes, idols, challenges, votes, reveal, elimination,
   exile, jury, finale, privacy, mobile, and videos.

## Route Budget Audit

Preferred route shape already exists:

- `GET /api/leagues/[leagueId]/survivor`
- `POST /api/leagues/[leagueId]/survivor/[action]`
- Internal dispatch through `server/api-route-modules/league-survivor`

Do not add one route file per Survivor action. Existing legacy `app/api/survivor/*`
routes should be consolidated or left untouched until replacement; new work should use
the league-scoped catch-all dispatcher.

The route budget script to run after route work is:

```bash
node scripts/audit-route-budget.cjs
```

## Safe Implementation Posture

- Fix privacy before adding more gameplay surface.
- Make settings canonical before creating migrations or UI branches.
- Prefer pure engines plus DB adapters over UI-driven state changes.
- Every official action must write audit log and notification records.
- Every hidden mechanic must have role-aware redaction tests.
- Every frontend action must call a real route, be truthfully disabled, or be hidden.
- Provider-limited sports results must show truthful commissioner-confirmed states.
- No route bloat and no unsafe database operations.
