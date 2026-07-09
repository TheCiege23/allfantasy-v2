# Fantasy OS Suite — League Context Foundation

**Phase OS-A1.** First increment of the "Fantasy OS Operating-System Alignment" workstream — the
product-level shift toward Commissioner OS behaving like an operating system (multi-league command
center, AI as background infrastructure, Decision OS as global/app-wide intelligence) rather than an
AI dashboard bolted onto one league. This phase adds the provider-agnostic **League Context**
foundation: what Decision OS knows about a league's financial state, and how confident that knowledge
is — nothing more.

**Date:** 2026-07-09 · **Branch:** `g15-event-foundation`.

---

## 1. Why this is a new model, not a `LeagueFinance` extension

`LeagueFinance` (`prisma/schema.prisma`) already exists — a real, built AF-native payment/treasury
system: entry fees in cents, a treasury balance, Stripe/PayPal/Coinbase provider integration, payout
requests and approvals, an audit trail. It answers **"how does AllFantasy collect and hold money for
this league's own paid-league feature."**

The League Context this phase adds answers a different question: **"what do we believe about whether
real money is involved in this league at all, and how sure are we" — for ANY league, imported or
native, whether or not AllFantasy ever processes a cent of it.** A league can have real money riding
on it through LeagueSafe, FanCred, a Yahoo/ESPN native payment feature, or a plain Venmo handshake
between friends — none of which touch `LeagueFinance` at all. Conflating the two would either force
every imported league through an AF-native payment model it never opted into, or silently assume
"no `LeagueFinance` row" means "definitely free" — both wrong, and both exactly the kind of
fabricated certainty this phase explicitly forbids.

## 2. What was built

**New Prisma model, `DecisionOsLeagueContext`** (migration
`20260709000000_decision_os_league_context`, **not applied to any database this phase** — schema +
migration file only, per "do not touch production DB"):

```prisma
model DecisionOsLeagueContext {
  id                  String
  leagueId            String                               @unique
  financialStatus     DecisionOsLeagueFinancialStatus       @default(UNKNOWN)
  buyInAmount         Float?
  buyInCurrency       String?
  escrowProvider      DecisionOsLeagueEscrowProvider         @default(UNKNOWN)
  financialConfidence DecisionOsLeagueFinancialConfidence    @default(UNKNOWN)
  financialNotes      String?
  isUserConfirmed     Boolean                               @default(false)
  lastVerifiedAt      DateTime?
}
```

- `financialStatus`: `UNKNOWN | FREE | PAID | VERIFIED_PAID` — `VERIFIED_PAID` is a strictly higher
  tier than `PAID`, reachable only through a real escrow verification (see §3), never through a
  commissioner's own unverified word.
- `escrowProvider`: `LEAGUESAFE | FANCRED | YAHOO | ESPN | MANUAL | OTHER | UNKNOWN` — **adapter hooks
  only**. No provider is integrated. These values exist so a future integration has an
  already-designed enum to write into, not so anything reads from a real LeagueSafe/FanCred/Yahoo/ESPN
  API today.
- `financialConfidence`: `UNKNOWN | USER_CONFIRMED | PROVIDER_CONFIRMED | ESCROW_VERIFIED | INFERRED`
  — a genuinely separate axis from `financialStatus`. A league can be `PAID` with `USER_CONFIRMED`
  confidence (a commissioner said so) or `VERIFIED_PAID` with `ESCROW_VERIFIED` confidence (a real
  provider confirmed it) — status and confidence are tracked independently so nothing ever collapses
  "we were told" and "we verified" into the same bucket.
- Deliberately **NOT** foreign-key-related to `League` (a plain `leagueId` string) — matches the
  existing, precedented `DecisionOsImportedActivity`/`DecisionOsBehavioralSnapshot` convention of
  storage-decoupled, provider-agnostic Decision OS models.

**New pure module, `lib/decision-os/leagueFinancialContext.ts`** — zero I/O, zero Prisma, zero
network. Persistence and any route/UI wiring are explicitly a later phase; this one is the
interpretation layer only:

- `defaultLeagueFinancialContext(leagueId, provider)` — the honest starting state for ANY provider.
  Tested explicitly across `sleeper`, `espn`, `yahoo`, `allfantasy`, an unrecognized string, and an
  empty string — all produce the identical fully-`UNKNOWN` result. There is no provider-specific
  branch anywhere in this function, by design — no "Sleeper leagues are usually free" heuristic, no
  reading league chat, no reading league name for `$`/"buy-in"/"payout" keywords.
- `applyManualFinancialConfirmation(current, {financialStatus: 'FREE'|'PAID', ...}, now)` — the
  ONLY way to reach `FREE`, and the only way to reach `PAID` short of a real escrow verification.
  Sets `financialConfidence: 'USER_CONFIRMED'`, `isUserConfirmed: true`, stamps `lastVerifiedAt`.
- `applyEscrowVerification(current, {escrowProvider, ...}, now)` — the adapter hook for a REAL
  future escrow-provider verification. The only path to `VERIFIED_PAID`/`ESCROW_VERIFIED`. Not called
  from anywhere else in the codebase yet — exists so the first real LeagueSafe/FanCred integration has
  an already-designed, already-tested shape to call into.
- `isFinancialStatusConfident` / `isConfidentlyPaid` / `isConfidentlyFree` — boolean guards for any
  future consumer (Commissioner OS UI, notifications) to gate paid-league-specific behavior safely.
  All three are false for `UNKNOWN`, and — a deliberate, tested edge case — `isConfidentlyPaid` is
  also false for a context whose `financialStatus` is `PAID` but whose `financialConfidence` was
  never actually set to a real value (i.e., status alone can never imply confidence; both must agree).
- `describeEscrowProvider` / `describeLeagueFinancialContext` — human-readable labels, each tested to
  never invent a dollar amount, provider name, or certainty the underlying context doesn't have.

## 3. How Sleeper behaves

**Sleeper imports get no special treatment.** `defaultLeagueFinancialContext(leagueId, 'sleeper')`
returns the exact same fully-`UNKNOWN` result as every other provider string tested. Nothing in this
phase reads Sleeper league chat, league settings, or league name to guess at financial status — the
instruction "do not infer paid status from chat" is satisfied by simply never writing that code path,
not by adding a check that suppresses it. A Sleeper-imported league only moves off `UNKNOWN` when a
real person calls `applyManualFinancialConfirmation` (wiring that call into an actual commissioner-
facing control is explicitly out of scope for this foundation phase).

## 4. What remains — LeagueSafe / FanCred / Yahoo / ESPN

**Nothing beyond the enum value existing.** Per this phase's own instructions, no provider is
integrated:

- No LeagueSafe or FanCred API client, OAuth flow, or webhook exists.
- No ESPN/Yahoo financial-data adapter exists (their general league-import adapters, unrelated to
  financial context, are a separate, already-existing concern).
- `applyEscrowVerification` is a real, tested, callable function — but nothing calls it. Building the
  first real integration means: pick one provider, build its API client, map its response onto
  `EscrowVerificationInput`, and call this function — the interpretation and persistence shape are
  already done.
- No route, no UI control, no Commissioner OS card reads or writes `DecisionOsLeagueContext` yet —
  that is the natural next phase (see §6).

## 5. Boundaries honored

- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- PR #183 untouched, still draft, not merged.
- No DFS OS work.
- No fake/demo data — every test uses explicit, labeled test fixtures, never presented as real data.
- No production DB touched — the migration file was written and validated (`prisma validate`,
  `prisma generate`) but never applied to any database, per explicit instruction.
- No payment/escrow integration built — `applyEscrowVerification` is an adapter hook with no real
  provider behind it, exactly as instructed.
- No chat-based or heuristic inference of financial status, for Sleeper or any other provider.

## 6. Recommended next phase

**OS-A2 — League Context wiring**: a thin Prisma-backed resolver (mirroring
`defaultLoadImportedActivityRows`'s honest-degradation pattern — no row yet → the pure default, never
a crash) plus a real commissioner-facing control (a manual confirm-free/confirm-paid action,
presumably on Commissioner OS) so `applyManualFinancialConfirmation` actually gets called by a real
person instead of only by tests. That would be the first point at which League Context becomes
visible anywhere in the product, and a natural prerequisite before Platform OS or notifications ever
reference financial status.
