# G15.2 — Event Producers

**Status:** complete (publishing only). Builds on G15.1 (`docs/g15-1-event-foundation.md`).
No Intelligence/Story/Commissioner/Chimmy features. No consumers/projections (G15.2+).

This phase adds (a) the **canonical event catalog** for all platform domains, (b) the
**publishing convention layer**, and (c) **proof-of-pattern instrumentation** of core
lifecycle workflows — all without changing business behavior.

---

## 1. Publishing conventions

Business code emits **only** through `PlatformEventProducer` (`@/lib/events` →
`getPlatformEvents()`), which is type-checked against the catalog.

| Mode | Method | Semantics | When to use |
|---|---|---|---|
| **Best-effort** | `emit(type, args)` | post-commit; **never throws**; returns `null` on failure | default for instrumentation — an event must never break the action it observes |
| **Transactional** | `emitInTx(tx, type, args)` | writes in the caller's tx (atomic with the state change); **propagates** errors | when the event must commit atomically with the business write |

Rules:
- **Sport/concept come from the league** (`args.sport`, `args.leagueConcept`) — never assumed.
- **`source`** tags origin (e.g. `engine:playoff`, `engine:draft-finalize`); defaults to `engine`.
- **Idempotency:** use a deterministic `idempotencyKey` (e.g. `champion.crowned:<seasonId>`) when
  an action is idempotent/repeatable so re-runs yield exactly one stored event (the unique
  constraint dedupes; best-effort swallows the collision). Omit it for naturally-distinct events
  (random key → no dedupe; consumers dedupe on `eventId`).
- **Privacy:** payloads carry ids/counts/status only — no message content, no PII, no secrets.
- **Versioning:** every type is v1 today. Evolve by **registering a new version** in the catalog
  (`EVENT_SCHEMA_VERSION`), never by mutating an existing payload shape.

---

## 2. Event catalog (v1)

All types are namespaced `domain.subject.verb`. Payloads are minimal; envelope fields
(`sport`, `leagueConcept`, `leagueId`, `seasonId`, `period`, `subjects`, `actor`) carry the rest.

| Domain | Type | Payload (v1) |
|---|---|---|
| League lifecycle | `lifecycle.league.created` | `{ leagueId, name?, teamCount? }` |
| | `lifecycle.league.archived` | `{ leagueId }` |
| | `lifecycle.season.activated` | `{ seasonId, season? }` |
| | `lifecycle.season.completed` | `{ seasonId }` |
| | `lifecycle.schedule.generated` | `{ seasonId, regularSeasonWeeks?, matchupCount? }` |
| Draft | `draft.session.started` / `.paused` / `.resumed` | `{ draftId }` |
| | `draft.session.completed` | `{ draftId, pickCount? }` |
| | `draft.pick.made` | `{ draftId, rosterId?, playerId?, overall?, round?, isAuto?, bidAmount? }` |
| Roster / lineup | `roster.player.added` / `.dropped` | `{ rosterId, playerId, via? }` |
| | `roster.lineup.set` | `{ rosterId, changeCount? }` |
| | `roster.lineup.locked` | `{ rosterId }` |
| Trades | `transaction.trade.proposed` | `{ tradeId, proposerRosterId?, receiverRosterId? }` |
| | `transaction.trade.accepted` / `.rejected` / `.canceled` / `.processed` | `{ tradeId }` |
| | `transaction.trade.vetoed` | `{ tradeId, byUserId? }` |
| Waivers | `transaction.waiver.submitted` | `{ claimId, rosterId?, addPlayerId?, dropPlayerId?, bid? }` |
| | `transaction.waiver.canceled` | `{ claimId }` |
| | `transaction.waiver.processed` | `{ claimId?, rosterId?, result, addPlayerId?, dropPlayerId?, bid? }` |
| | `transaction.waiver.window_processed` | `{ processed, succeeded?, failed? }` |
| Matchups | `competition.matchup.created` / `.updated` | `{ matchupId }` |
| | `competition.matchup.finalized` | `{ matchupId, homeScore?, awayScore?, winnerRosterId? }` |
| Scoring / standings | `competition.score.updated` | `{ subjectId, subjectKind, points? }` |
| | `competition.standings.updated` | `{ seasonId, changedRosterCount? }` |
| Playoffs | `competition.playoff.bracket_generated` | `{ seasonId, playoffTeams? }` |
| | `competition.playoff.advanced` | `{ seasonId, round?, advanced? }` |
| | `competition.champion.crowned` | `{ seasonId, championRosterId?, championUserId? }` |
| Governance | `governance.settings.changed` | `{ leagueId, section?, changedKeys? }` |
| | `governance.commissioner.action` | `{ leagueId, action, targetId? }` |
| User / chat | `user.activity.recorded` | `{ userId, action }` |
| | `chat.message.posted` | `{ channelId, messageId, authorUserId?, scope? }` |
| Auth | `auth.user.registered` | `{ userId }` |
| | `auth.user.signed_in` | `{ userId, method? }` |
| Billing | `billing.subscription.changed` | `{ userId, status, plan? }` |
| | `billing.entitlement.changed` | `{ userId, feature, granted }` |

Source of truth: `lib/events/catalog.ts` (`EVENT`, `EVENT_PAYLOAD_SCHEMAS`, `EVENT_SCHEMA_VERSION`).

---

## 3. Instrumentation coverage matrix

**Wired = a real call site emits it today (verified end-to-end on staging). Ready = catalog
type + producer exist; the call site is a one-line `emit(...)` away (documented below).**

| Domain | Wired now | Ready (not yet wired) |
|---|---|---|
| League lifecycle | `season.activated`, `season.completed` | `league.created`, `league.archived`, `schedule.generated` |
| Draft lifecycle | `draft.session.completed` | `started`, `paused`, `resumed` |
| Draft picks | — | `draft.pick.made` |
| Roster changes | — | `roster.player.added/dropped` |
| Trades | — | all `transaction.trade.*` |
| Waivers | — | all `transaction.waiver.*` |
| Lineup changes | — | `roster.lineup.set/locked` |
| Matchups | — | `competition.matchup.*` |
| Scoring updates | `competition.standings.updated` | `competition.score.updated` |
| Commissioner settings | — | `governance.*` |
| User activity | — | `user.activity.recorded` |
| Chat activity | — | `chat.message.posted` |
| Authentication | — | `auth.user.registered/signed_in` |
| Subscription / entitlement | — | `billing.subscription.changed`, `billing.entitlement.changed` |

**Wired call sites (verified):**
- `lib/redraft/finalizeDraftToRedraftSeason.ts` → `draft.session.completed` + `lifecycle.season.activated` (the draft-type-agnostic completion path from G12).
- `lib/redraft/standingsEngine.ts` (`updateStandings`) → `competition.standings.updated`.
- `lib/redraft/playoffEngine.ts` (`finalizeRedraftSeasonChampion`) → `competition.champion.crowned` + `lifecycle.season.completed`.

All wired points use **best-effort post-commit** emission (never throws) → zero behavior change.

**Documented integration points for the remaining domains** (one `getPlatformEvents().emit(...)`
each, sport/concept from the league):
- Draft started/paused/resumed/picks → `DraftSessionService` / `completeDraftSession` + pick write.
- Roster add/drop, lineup set/lock → `RosterAssignmentService` / lineup save path.
- Trades → `tradeSettlement` / trade accept + veto routes (`app/api/redraft/trades/*`).
- Waivers → `waiverEngine.processWaiverWindow` + waiver submit/cancel routes.
- Matchups / score.updated → `scoringEngine.recalculateMatchupsForSeasonWeek` / live-scoring runner.
- Playoff bracket/advance → `app/api/redraft/playoffs/{generate,advance}/route.ts`.
- League created / archived / schedule → canonical create path / `ensureScheduleForNewSeason`.
- Governance → `commissionerService` / settings save.
- User/chat/auth/billing → respective `app/api/**` routes (best-effort, post-commit).

> These were intentionally left as documented one-liners rather than bulk-edited in this phase:
> each is low-risk best-effort, but wiring + verifying all of them safely is a focused follow-up
> (recommended as G15.2b) so each call site gets the same end-to-end proof the core lifecycle got.

---

## 4. Transactional guarantees (recap)
- Best-effort `emit` cannot affect the business action (wrapped, never throws).
- `emitInTx` joins the caller's transaction — the event commits atomically or not at all.
- The durable record + dispatch are G15.1's `domain_events` + `event_outbox` (relay drains in
  G15.3; in G15.2 emitted events sit `pending` in the outbox, which is correct).

---

## 5. Tests
- `__tests__/events/catalog.test.ts` — every type registered (idempotent), versioned, all domains
  covered, payload validation good/bad.
- `__tests__/events/producers.test.ts` — emit records valid events; best-effort never throws /
  swallows invalid payloads; `emitInTx` passes the tx and propagates; schemas auto-registered.
- Backward-compat: `playoff-finalize`, `playoff-advance`, `standings-api`, `redraft-core-contract`
  all pass with instrumentation live.
- End-to-end: the NFL engine harness emits `draft.session.completed`, `lifecycle.season.activated`,
  `competition.standings.updated`, `competition.champion.crowned`, `lifecycle.season.completed`
  to staging `domain_events` (verified), with **PASS 32 / FAIL 0** (no behavior change).
