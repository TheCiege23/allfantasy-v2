# User OS / Manager OS — Sleeper Proof Audit

**Status: audit + plan. No code implemented, except where explicitly noted as a candidate for a
tiny, obvious wiring change (none was found safe enough to do in this increment — see §11).**

**Date:** 2026-07-08 · **Branch:** `g15-event-foundation`. **Phase D Increment 2** (successor to
[`FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md`](FANTASY_OS_SUITE_CLIENT_AGNOSTIC_ROADMAP.md)'s
Increment 1 reframing). Depends on
[`DECISION_OS_PHASE_A_IMPLEMENTATION.md`](DECISION_OS_PHASE_A_IMPLEMENTATION.md) and
[`COMMISSIONER_OS_SURFACE_ALIGNMENT.md`](COMMISSIONER_OS_SURFACE_ALIGNMENT.md).

---

## 1. Executive Summary

Commissioner OS is real, visible, and Decision OS-aligned. User OS / Manager OS is not — but this
audit found something more useful than "nothing exists": **the exact same Decision OS composition
that already powers Commissioner OS's Manager DNA and Recommendations already runs per-signed-in-user,
already merges imported/Sleeper activity, and is already reachable from a code path that does not
gate on commissioner role** (`LeagueTab.tsx`'s unconditional `manager-intelligence` fetch). That is
a real, low-risk foundation — not a hypothetical one.

Separately, a fully independent system (the "Manager Intelligence Platform" / Manager Hub) already
gives any league member — commissioner or not — real Team Health / Weekly Outlook / Transaction
Readiness views. It is role-agnostic by design, but it is **provider-specific**: every resolver reads
AF-native `RedraftRoster`/`RedraftSeason` tables directly, with zero dependency on the Decision OS
behavioral pipeline. It would not work for a Sleeper-only imported league without its own AF-native
roster/season records — a different gap than Commissioner OS ever had.

**The real finding of this audit: User OS's gap is not "nothing exists for a manager."** It's that
the ONE piece which is both role-agnostic AND provider-agnostic (Manager DNA/Recommendations via
`dashboard-intelligence.ts`) has no dedicated manager-facing presentation of its own — it's currently
only surfaced as a card inside pages built for other purposes (the Commissioner Hub dashboard, the
league tab). Building User OS's minimum surface is therefore much closer to Increment 5/6's own
playbook (compose over already-real data, add a thin presentation layer) than to a from-scratch
build.

---

## 2. Why User OS Matters

Most fantasy platform users are managers, not commissioners — a majority of any league's membership.
An OS suite that only serves the commissioner leaves the majority of users with nothing. The same
retention logic that motivates Commissioner OS applies at the manager level: a manager who is
quietly disengaging, or who doesn't understand their own team's weaknesses, has no system telling
them so today — only their own perception. A platform licensing Commissioner OS alone gets one
persona's value; User OS is what makes the suite relevant to the platform's actual user base.

---

## 3. Difference Between Commissioner OS and User OS

| | Commissioner OS | User OS / Manager OS |
| --- | --- | --- |
| Audience | The league's commissioner | Any manager, including the commissioner viewing their own team |
| Core question | "What should I do to keep this league healthy?" | "What should I do to compete better?" |
| Scope | League-wide (all managers, aggregate counts) | Single manager/team |
| Data needed | League-wide activity (all trades/waivers/drafts/roster moves) | The same activity, filtered/framed around one manager |
| Status today | Built, visible (Mission Control, League Analytics) | Not built as a dedicated surface (see §4) |

Critically, User OS does **not** need new Decision OS derivation — `ManagerBehavioralIntelligence`
(participation tier, retention risk + reasons, per-dimension engagement) is already computed for
**every** active manager in a league, including the signed-in user whether or not they commission
it. Commissioner OS already reads this per-manager data to build its retention-risk list. User OS
would show that same kind of signal, framed for the manager themselves, not their commissioner.

---

## 4. Existing Manager/User Intelligence Inventory

**A. Decision OS-aligned, provider-agnostic, role-agnostic (the strongest foundation):**
- `resolveManagerIntelligencePayload({ leagueId, managerId })` (`lib/decision-os/dashboard-intelligence.ts`)
  — real Manager DNA + Recommendations + League Trend for **one manager** in one league. Already
  merges imported/Sleeper activity (Commissioner OS Surface Alignment Increment 1). Consumed by:
  - `app/api/decision-os/manager-intelligence/route.ts` — always resolves the **signed-in session
    user's own** `managerId` (never a URL param), so it inherently shows "my own" data, not
    "whichever manager I pick."
  - `CommissionerHubPageClient.tsx` — fetches it, but **only** for `representativeLeagueId`
    (`commissionerLeagues[0]?.id`) — i.e. only ever for a league the signed-in user commissions.
  - `LeagueTab.tsx` — fetches it **unconditionally for the current league, regardless of
    `isCommissioner`** — `isCommissioner` is used elsewhere on that page for UI branching, not to
    gate this fetch. This means a plain manager viewing their own league's tab already gets their
    own real Manager DNA/Recommendations/Trend today, powered by the same Decision OS pipeline
    Commissioner OS uses — **this is the closest thing to "User OS already works" in the codebase.**
  - `ManagerDnaCard.tsx` renders the result with a `variant` prop (`dashboard` | `league` |
    `commissioner`) — `dashboard`/`league` variants show the viewer's **own** profile; the
    `commissioner` variant is how a commissioner views it on their own hub (still their own profile
    today, not another manager's — Commissioner Hub does not currently let a commissioner browse
    other managers' DNA one-by-one).

**B. Role-agnostic, but provider-specific (a separate, independent system):**
- Manager Intelligence Platform / Manager Hub (`app/league/[leagueId]/manager-hub/page.tsx` →
  `components/manager-intelligence/ManagerIntelligenceHub.tsx`) — three deterministic contracts:
  - **Team Health** (`lib/decision-os/manager-intelligence/team-health/`)
  - **Weekly Outlook** (`lib/decision-os/manager-intelligence/weekly-outlook/`)
  - **Transaction Readiness** (`lib/decision-os/manager-intelligence/transaction-readiness/`)
  - All three resolvers read `RedraftRoster`/`RedraftSeason` **directly via Prisma**, resolved
    through `resolveRedraftRosterLookupReadOnly({ userId, leagueId })` — **zero calls into
    `lib/decision-os/behavioral/*`.** Confirmed role-agnostic (any authenticated league member sees
    their own data; a 403 for non-members) — but **provider-specific to AF-native redraft
    leagues.** A Sleeper-only imported league has no `RedraftRoster`/`RedraftSeason` rows to read,
    so these resolvers would return null/404 for it today, independent of the manager's role.

**C. A real, narrower Sleeper-sourced precedent:**
- `ManagerReplayInsightsCard.tsx` — a default-off (`NEXT_PUBLIC_MANAGER_REPLAY_INSIGHTS_DASHBOARD_ENABLED`),
  session-scoped, manager-facing card showing historical trade-pattern insights, genuinely derived
  from real Sleeper trade history (the Replay Framework — 238 trades/1,260 lineup decisions per
  prior validation). Reused in both the Manager Hub and the league home dashboard. Proves Sleeper-
  sourced, per-manager intelligence CAN reach a real card — but it is deliberately narrow (trade
  patterns only, "backtest/validation only, never calibration"), and is a separate system from both
  A and B above.

**D. Adjacent, not Decision OS-integrated:**
- **AI Coach** (`lib/ai-coach/`) and **Fantasy Coach** (`lib/fantasy-coach/`) — query-driven
  start/sit/waiver/trade advice services (deterministic-first, optional LLM explanation layered on
  top). Team/week-scoped, not wired to the Decision OS behavioral pipeline or to Manager Hub. More
  like an on-demand advice tool than an always-on dashboard signal — out of scope for this audit's
  "minimum User OS surface" (§9), but a real, separate asset worth knowing about.
- **IDP Team Dashboard** (`app/idp/components/IDPTeamDashboard.tsx`) — roster visualization with
  scoring/cap UI, not an intelligence/recommendation surface.

---

## 5. Sleeper Manager-Only League Proof Path

The concrete scenario to prove: an AllFantasy user has an imported Sleeper league where they are a
manager but **not** the commissioner. Today:

- **Ingestion (real, already proven):** trades/waivers/roster moves/draft picks from that league can
  be ingested via the Sleeper emitter → normalizer → writer → `DecisionOsImportedActivity`,
  idempotently, with correct manager attribution (including for managers with no AllFantasy
  account) — proven on realistic fixtures + a throwaway non-prod database.
- **Data-layer reachability (real, confirmed this audit):** `defaultLoadImportedActivityRows`
  (`lib/decision-os/behavioral/api/real-data-provider.ts`) matches on `afLeagueId` **OR**
  `providerLeagueId` — meaning a caller can pass either the AF-side league id or the raw
  Sleeper league id as `leagueId` and imported activity still resolves. This removes one identifier-
  shape ambiguity that could otherwise have blocked the whole path.
- **Presentation (unverified, the real open question):** whether the **page/route** a manager would
  actually land on for that imported league is reachable at all for a non-commissioner member, and
  whether it calls `resolveManagerIntelligencePayload`/an equivalent with the correct `leagueId`.
  `LeagueTab.tsx` already does this unconditionally (§4A) — but whether an imported Sleeper league
  (as opposed to an AF-native one) has a `League` record that routes into `LeagueTab` the same way,
  for a manager who isn't the importing/commissioner account, has not been verified in this audit
  and is flagged as the first thing to check before building anything (§11).

---

## 6. What Data Exists Today

- Real, idempotent imported activity: trades, waivers, roster moves, draft picks — attributed to
  manager identities regardless of AllFantasy account (`DecisionOsImportedActivity`).
- Real roster composition signal in Sleeper's own raw types: `SleeperRosterRaw.starters` /
  `.reserve` / `.taxi` — a genuine starter-vs-bench distinction exists in the data model.
- Real (but limited) matchup data: `SleeperMatchupRaw` carries `roster_id`, `matchup_id`, and a
  **final** `points` value only — no live projection, no per-player breakdown. Enough to know a
  team's result for a week; not enough for a "you should have started X" lineup-decision signal
  without additional derivation that doesn't exist yet.
- Real per-manager behavioral intelligence (`ManagerBehavioralIntelligence`) — participation tier,
  retention risk + reasons, per-dimension engagement (trade/waiver/lineup/draft) — already computed
  for every active manager, Sleeper-sourced activity included.

## 7. What Decision OS Already Provides

Everything a minimum User OS surface would need, without new derivation:
- `ManagerBehavioralIntelligence` per manager (via `assembleManagerBehavioralFacts` →
  `deriveManagerBehavioralIntelligence`) — the same computation Commissioner OS's retention-risk
  list already uses, just not yet exposed to the manager themselves.
- `ManagerDnaProfile` + `RecommendationSet` (manager-tier) via `resolveManagerIntelligencePayload` —
  already real, already provider-agnostic, already reachable without commissioner gating on at
  least one existing page (`LeagueTab.tsx`).
- League-level trend (`leagueTrend`) — already part of the same payload, giving a manager the same
  "is this league trending up or down" context Commissioner OS shows, without needing a new
  composition.

## 8. What Is Missing

- **A dedicated User OS surface.** Today, a manager's own Decision OS-derived signal is a card
  embedded in pages built for other purposes (a league tab, a commissioner's own dashboard) — there
  is no page/card that says "here is your team, here's what to know, here's what to do," parallel
  to Mission Control.
- **Verification that imported (non-AF-native) leagues route a manager-only viewer through a page
  that fetches manager-intelligence at all** — unverified, flagged in §5/§11.
- **A "team health"/"activity summary" framing built on Decision OS data** — the closest existing
  thing (Manager Hub's Team Health) is provider-specific (redraft-only) and structurally
  independent; it does not read Decision OS's imported-activity-aware facts at all.
- **Any lineup-decision-quality signal** ("you started X, should have started Y") — the raw data
  exists (starters/reserve + final points) but no derivation connects them into a signal yet, for
  any provider, native or imported.
- **Any User OS-specific honest-degradation contract** — Mission Control/League Analytics both have
  one (§ patterns in `COMMISSIONER_OS_SURFACE_ALIGNMENT.md`); nothing analogous has been designed
  for a manager-facing surface yet (see §9 for what one would need).

---

## 9. Minimum User OS Demo Surface

Following the exact same discipline Mission Control/League Analytics used — compose over already-
real data, add a thin presentation layer, zero new derivation — a minimum User OS surface would
show, for the signed-in user's own team in one league:

- **Team health** — reuse `ManagerBehavioralIntelligence`'s `participationTier` and
  `overallEngagementScore` (already real, already computed).
- **Activity summary** — this manager's own trade/waiver/lineup/draft engagement counts (already
  present as `tradeEngagement`/`waiverEngagement`/`lineupEngagement`/`draftEngagement` on
  `ManagerBehavioralIntelligence`).
- **League context** — reuse the SAME `leagueTrend` Mission Control/League Analytics already show,
  so a manager sees the same "is this league active" signal their commissioner sees.
- **Waiver/trade/draft signals** — the same per-dimension engagement data, framed as "here's how
  active you've been," not a recommendation to act (recommendations are Recommendation-tier, see
  below).
- **Risk/opportunity list** — reuse `ManagerDnaProfile`'s traits + the manager-tier
  `RecommendationSet` already computed by `resolveManagerIntelligencePayload` — the exact same
  recommendations engine already running for the commissioner's own profile, just surfaced as the
  manager's own view instead of buried in a commissioner-context card.
- **Decision OS explanation** — a short, honest note (mirroring Mission Control's own pattern) that
  this is derived from real activity, degrades honestly, and is not a guaranteed outcome.

**Honest degradation this surface must have** (mirroring Mission Control/League Analytics exactly):
- No activity for this manager → real zero engagement, `primaryIdentity: 'unknown'`, not fabricated.
- League trend unavailable → the same `no_snapshots`/`insufficient_history` states, unchanged.
- The underlying composition failing → an explicit unavailable state, not a crash.
- Matchup/lineup data unavailable for this provider/league → an explicit "not available for this
  league" state — never inferred or guessed.

**This is deliberately NOT proposed as a build target this increment** — the audit instruction was
to plan, not implement, and one open verification item (§5/§11) should be resolved first.

---

## 10. Recommended Implementation Sequence

1. **Verify the manager-only-imported-league reachability question** (§5/§11) — confirm whether a
   non-commissioner member of an imported Sleeper league lands on a page that already fetches
   manager-intelligence, or whether that path needs new routing/access-control work first. This is
   the one unresolved fact that most changes the size of the next real increment.
2. **Build the minimum User OS surface (§9)** as a thin composition + card, the same shape as
   Mission Control (`resolveMissionControlSnapshot` → `MissionControlCard`) — likely
   `lib/decision-os/userOs.ts` (or similarly named) composing `ManagerBehavioralIntelligence` +
   `resolveManagerIntelligencePayload` directly, and a card reusing the same
   `DecisionOsCardPrimitives` — no new visual system, matching the whole workstream's established
   discipline.
3. **Prove it on a real Sleeper manager-only league** — the concrete site-wide proof point this
   audit was requested to plan toward.
4. **Only after User OS exists:** revisit whether/how to align Manager Hub (subsystem D) with
   Decision OS, since doing so before a Decision-OS-native manager surface exists would mean solving
   the harder, larger migration problem first for no immediate gain.

## 11. Risks / Honest Gaps

- **The single biggest unverified fact:** whether an imported Sleeper league, viewed by a
  non-commissioner AF user, actually routes through `LeagueTab.tsx` (or an equivalent) the same way
  an AF-native league does. This audit did not trace that routing/access-control path exhaustively
  and treats it as open — **not a "tiny, obvious, low-risk wiring change,"** so nothing was
  implemented this increment per instruction.
- **No lineup-decision-quality signal exists for any provider** — proposing one is a real, separate
  Decision OS feature-gap increment (parallel to the still-open "retention risk signal" gap
  Commissioner OS Surface Alignment already flagged), not something this audit resolves.
- **Manager Hub (subsystem D) and the Decision OS-aligned path (§4A) are genuinely separate
  systems** — this audit does not recommend merging them, only notes that building on §4A is lower-
  risk because it's already provider-agnostic, matching the same "federate vs replace" reasoning
  Commissioner OS Surface Alignment used for League Health.
- **No real, multi-manager imported Sleeper league has been used to validate any of this end-to-end**
  — all proofs to date are single-league or fixture-based; a genuine "commissioner of league A,
  manager-only in league B, both imported from Sleeper" scenario has not been run.
- **No retention/engagement/performance-improvement outcome has been measured** for any manager,
  on any data — this audit makes no such claim and none should be implied from it.

---

## 12. Manager-Only League Proof Requirements

Concrete, checkable goals for actually proving this (not yet executed):

- [ ] Identify (or construct, via realistic fixtures — never fabricated demo data in a real
      environment) an imported Sleeper league where the test AllFantasy user is a manager but not
      the commissioner.
- [ ] Map that user's team/roster correctly for that league (owner/roster identity resolved
      correctly, including if they have no prior AllFantasy account tie to that specific roster).
- [ ] Show real team-level activity for that manager (their own trades/waivers/roster moves/draft
      picks, correctly attributed, not another manager's).
- [ ] Show real league position/context (the same league-wide trend/health context Commissioner OS
      already computes, reused not re-derived).
- [ ] Show user-specific trade/waiver/draft/roster signals (their own engagement dimensions from
      `ManagerBehavioralIntelligence`).
- [ ] Show honest unavailable states wherever lineup/matchup data is genuinely missing — never
      fabricate a "you should have started X" signal without a real derivation behind it.

---

## 13. Boundaries honored (this increment)

- No code implemented — audit + plan only, per explicit instruction (no "tiny, obvious, low-risk"
  wiring change was found safe enough to also ship this increment).
- No DFS OS work.
- No adapter code, no `IMPORT_PROVIDERS` change.
- No fake/demo data anywhere in this document.
- No production DB touched; no production cron enabled.
- PR #183 untouched, still draft, not merged.
- No Redraft/Start-Draft/PR-#166/AF-hosted-league work touched.
- No retention-lift, ROI, or user-performance-improvement claims anywhere in this document.
