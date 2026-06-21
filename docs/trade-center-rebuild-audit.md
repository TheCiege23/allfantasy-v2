# Trade Center Rebuild — Backend Audit + Build Plan

Audit-first per directive. This documents the confirmed backend, the gaps, the Sleeper parity
matrix, and exactly what this PR wires vs. defers. **Do not merge until reviewed.**

Production trade world for the leagues we ship (redraft Steps 3A–3D) is the **native redraft**
system (`RedraftRoster` / `RedraftRosterPlayer`), surfaced by `redraft/TradeCenter.tsx` mounted in
[`RedraftTab.tsx`](app/league/[leagueId]/tabs/RedraftTab.tsx). This audit focuses there.

---

## Two trade engines exist (important)

| Engine | Storage | Settlement | Used by |
|---|---|---|---|
| **Canonical `league-trade-engine`** | `Roster.playerData` (JSON) + `Roster.faabRemaining` | `lib/league-trade-engine/tradeProcessor.ts::applyTradeAssetsInTransaction` **fully settles** players, FAAB, picks (from `playerData.draftPicks`), specialty assets | `/api/leagues/[leagueId]/trades/*` (Sleeper-import/legacy `Roster` world) |
| **Native redraft** | `RedraftRoster` + `RedraftRosterPlayer` (relational) + `RedraftTradeProposal/Asset/Vote/Decision` | `redraft/trade-votes::finalizeAcceptedTrade` → `applyRedraftTradeCapTransfers` is **IDP-only** (early-returns without `IDPCapConfig`; moves only `IDPSalaryRecord`) | `/api/redraft/trade-proposals` + `/api/redraft/trade-votes` (the production redraft Trade Center) |

### ⭐ Keystone gap
For a **standard (non-IDP) redraft league**, accepting a trade marks the proposal `accepted` and
mirrors a `RedraftLeagueTrade` history row, **but never moves `RedraftRosterPlayer` rows or transfers
`RedraftRoster.faabBalance`.** Players don't actually change teams. Shipping a Trade Center on top of
this would be "fake functionality." **This PR fixes settlement** (see Build Plan #1).

---

## Backend support — confirmed

### Proposal create / list — ✅ supported
- `POST/GET /api/redraft/trade-proposals` (`route.ts`). Two-party: `proposerRosterId` + `receiverRosterId`.
- Asset types accepted: `player`, `draft_pick`, `faab`, `future_consideration` (`RedraftTradeAsset`).
- Asset direction validated to the two parties only.

### Lifecycle — ✅ rich
`POST /api/redraft/trade-votes` actions: `accept` (receiver), `reject` (receiver), `cancel`
(proposer), `commissioner_approve` / `commissioner_veto` (commish/co), `vote_approve` / `vote_veto`
(non-parties; threshold-based `league_vote` mode), plus auto-expiry. Veto modes:
`commissioner` | `league_vote` | `no_veto` with `vetoThreshold` (default 4).
- ❌ **No native counter** (counter = create a new proposal; `RedraftTradeProposal` has no `parentTradeId`).
- ❌ **No reverse** (Sleeper supports trade reversal; redraft does not).

### Players — ✅ (after keystone fix settles `RedraftRosterPlayer`)
`fetchRedraftRoster` returns rich player data: pos/team/bye/injury/projection/confidence/locked.

### FAAB — ⚠️ partial → settled by this PR
`RedraftRoster.faabBalance Float? @default(100)` exists; `assetType:'faab'` accepted; amount carried
in `RedraftTradeAsset.metadata` (no dedicated column). **Not transferred today** → this PR settles it.

### Draft picks — ⚠️ reference-only
`RedraftTradeAsset` stores `pickSeason/round/number`, and `League.draftPickTrading Boolean @default(false)`
gates it. **But redraft has no owned-pick inventory model** and no draft-board update on trade. The
current UI even fabricates synthetic "next 2 seasons R1–4" picks (`buildPickOptions`) regardless of
ownership — that's fake. → This PR **gates pick assets behind `League.draftPickTrading`**, labels them
**reference-only** (recorded on the proposal, no ownership transfer / board update), and documents the
missing inventory. No fabricated picks.

### Multi-team — ❌ not supported
Engine is strictly two-party (asset direction validated to proposer/receiver). → UI shows a
**disabled "Multi-team (coming soon)"** affordance; documented as a backend gap.

### Trade Block — ⚠️ Sleeper-import only; native missing
`TradeBlockEntry` is keyed by `sleeperLeagueId`/`rosterId Int`/`createdByUsername` and served to
Sleeper-import leagues via `/api/league/trades-panel`. It is **not wired to `RedraftRoster`**. Native
redraft trade block requires a new model + routes (see Deferred). → This PR **surfaces the existing
Sleeper-league trade block where it already works** and **documents the native gap**; it does not fake
a native block.

### Trade Interest — ❌ no model → deferred
No `TradeInterest` model exists. Documented as deferred; no fake UI.

### Settings — ✅ exist, under-surfaced
- `League.tradeReviewHours` (def 48), `League.tradeDeadlineWeek`, `League.draftPickTrading` (def false)
- `RedraftLeagueExtendedSettings.commissionerTradeReviewType` (def `commissioner`)
- Per-proposal `vetoMode` + `vetoThreshold`
→ This PR surfaces these in the Trade Center (read for all; commissioner-editable where a route exists).

### Entry points
- In-league deep link `/trade-finder?leagueId=` **skips the picker** (shipped in PR #88).
- Global `/trade-finder` **shows the picker** (PR #88).
- **Player-click-to-trade:** no existing route/prop wires a roster/player-card click into the trade
  flow. → Documented as a follow-up; this PR adds the stepped flow entry from the Trade Center tab and
  leaves a typed `startTradeWith(rosterId, playerId?)` seam for a later player-card hook.

---

## Sleeper parity matrix

### Supported now (this PR makes real)
- Player-for-player trades, two-party
- FAAB in trades (now actually transferred)
- Review modes: none / commissioner / league-vote (threshold)
- Commissioner veto + force-through (`commissioner_approve`)
- Trade history (mirrored `RedraftLeagueTrade`)
- Active offers list + respond (accept/reject/cancel/vote)
- Trade block for Sleeper-import leagues (surfaced)

### Better than Sleeper
- **Web-first desktop** stepped Trade Center (partner → assets → review) in a scroll-correct AppModal
- Trade **summary side panel** with per-team sends/receives + warnings
- **Clearer commissioner/league trade settings** surfaced in-context (Sleeper buries these)
- Trade block intended on **web** (Sleeper web is mobile-only for block/interest)
- **AI-ready seams** (typed analysis hook) without adding AI yet

### Deferred (documented, not faked)
- Multi-team trades (engine is two-party)
- Native redraft Trade Block (needs `RedraftTradeBlock` model + routes)
- Trade Interest (needs `RedraftTradeInterest` model + routes)
- Native counter-offer + trade reversal
- Draft-pick **ownership inventory** + live-draft board update (picks are reference-only)
- Dedicated FAAB amount column (currently via asset metadata)

### Not supported intentionally (this PR)
- AI auto-decision / auto-accept (future-ready; no AI added now)

---

## Build plan (this PR)
1. **Keystone: settle native redraft trades.** Add `RedraftRosterPlayer` move + `faabBalance` transfer
   to `finalizeAcceptedTrade` (non-IDP path), atomic in a `$transaction`, with ownership/sufficiency
   validation; keep IDP cap path for IDP leagues. Unit tests.
2. **Stepped Trade Center** (AppModal): Step 1 partner cards (avatar/team/owner/roster preview, single
   partner; multi-team disabled+coming-soon). Step 2 asset selection (columns by team, rich player
   cards, FAAB input, pick cards gated by `draftPickTrading` + labeled reference-only, add/remove,
   summary side panel, back/next, internal scroll). Step 3 review + submit (per-team sends/receives,
   warnings: empty side / roster limit / deadline / locked, submit → success w/ proposal id).
3. **Settings exposure** (read; commissioner-edit where routed).
4. **Seeded QA fixtures** (NFL + NCAAF, commissioner + ≥4 managers, rosters, pending/accepted/rejected/
   counter-as-new/veto examples; FAAB balances; namespaced).
5. **Playwright trade smoke** (entry/picker/partner/asset/submit/respond/veto/FAAB/NCAAF/modal-scroll;
   pick + multi-team + native-block scenarios assert the gated/disabled states).
6. **Docs** (this file + smoke checklist), validation, PR (no merge).
