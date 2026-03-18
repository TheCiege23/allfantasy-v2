# PROMPT 337 — AllFantasy Salary Cap League: Research-Aligned Product Spec

AllFantasy-native design for a first-class **Salary Cap League** format. Concepts are inspired by public salary-cap and contract-dynasty formats; terminology and flows are AllFantasy-native. This format is **never redraft**.

**League modes:** Salary Cap Dynasty · Salary Cap Best Ball  
**Team size:** 4–32 teams  
**Sports:** NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER (`lib/sport-scope.ts`)

---

## 1. Salary cap rules spec

### 1.1 Core concepts

| Concept | Definition |
|--------|------------|
| **Team salary cap** | Maximum total cap hit a roster may carry in a given season. Set per league (e.g. startup cap) with optional annual growth. |
| **Player salary** | Dollar amount assigned to a player for cap purposes. Counts against the team cap for each season the contract is active. |
| **Contract length** | Number of seasons (years) the player is under contract. Min/max set by league (e.g. 1–4 or 1–5). |
| **Contract year** | Current year of the contract (year 1, 2, …). Used for extension eligibility and option rules. |
| **Cap hit** | Amount that counts against the cap in a given season. For standard contracts, cap hit = salary for that season. For back-loaded or option deals, defined by league rules. |
| **Future cap projection** | Sum of known cap hits for future seasons (current roster + dead money). Used for trade and extension decisions. |
| **Dead money** | Cap charge applied when a player is cut or traded before contract end. Formula: e.g. percentage of remaining salary × remaining years (e.g. 25% per remaining year). Configurable on/off and by formula. |
| **Cap floor** | Optional minimum cap spend. If enabled, total cap hit cannot fall below floor. |

### 1.2 Contract acquisition rules

- **Startup draft:** Auction is the primary default. Winning bid becomes year-1 salary; contract length chosen at nomination or post-draft within league min/max (or fixed by league).
- **Rookie / free-agent draft (future seasons):** If linear or snake draft is used, drafted players receive **rookie contract** terms: fixed length (e.g. 3 years) and salary by draft slot (slot-based salary scale) or league default.
- **Free-agent contract bidding:** Teams bid (salary + years). Highest bid wins; tie-break by waiver priority or blind-bid rules. Minimum salary and max years enforced.
- **Post-auction / post-draft signing:** One-time assignment of salary and years within league rules before cap is enforced.

### 1.3 Contract lifecycle rules

- **Extensions:** If enabled, eligible players (e.g. in final contract year or meeting years-served rule) may be extended. **Extension pricing formula:** e.g. current salary × multiplier + growth, or fixed percentage bump per year; max extension length.
- **Franchise tag (optional):** One player per team per offseason at a premium (e.g. top-5 position average or percentage of cap). Single-year control; rules for second tag (higher premium) if supported.
- **Rookie option / team option (optional):** Extra year(s) at a predetermined salary or formula; decision deadline in offseason.
- **Cut / release:** Player removed from roster; dead money applied per league formula (e.g. 25% of remaining salary per remaining year). Cap hit in current and future years.
- **Trade:** Player’s contract (and cap hit) moves to acquiring team. No dead money for trading team unless league has “trade penalty” rule. Acquiring team must be cap-compliant after trade.
- **Contract expiration:** At end of final year, player becomes free agent unless extended or tagged. Offseason calendar defines when expirations are processed.

### 1.4 Cap enforcement

- **Real-time:** Every roster move (add, drop, trade, extend, tag, cut) is validated: projected cap hit (current + future) ≤ cap, and ≥ cap floor if enabled.
- **Lock dates:** After season lock (or offseason lock), no moves until next period; cap state is finalized for that period.
- **Rollover (optional):** Unused cap space may roll over to next season (e.g. up to a max amount) to reward cap discipline.

### 1.5 Waivers / free agency

- **Contract bidding:** Free-agent acquisitions use (salary, years) bids. System enforces min salary, max years, and cap room.
- **FAAB (optional):** FAAB can coexist: FAAB used for priority or tie-break; winning bid still must be (salary, years) for cap.
- **Blind vs visible:** If architecture supports, commissioner may choose blind or visible bidding windows.
- **Waiver contract defaults:** Default contract length and min salary for waiver pickups if not fully bid.

---

## 2. Sport-by-sport recommended defaults

| Setting | NFL | NHL | NBA | MLB | NCAAB | NCAAF | SOCCER |
|--------|-----|-----|-----|-----|-------|-------|--------|
| **Startup cap** | 250 | 250 | 250 | 250 | 200 | 200 | 200 |
| **Cap growth %** | 5 | 5 | 5 | 5 | 0 | 0 | 5 |
| **Contract min/max years** | 1–4 | 1–4 | 1–4 | 1–4 | 1–3 | 1–3 | 1–4 |
| **Rookie contract years** | 3 | 3 | 3 | 3 | 2 | 2 | 3 |
| **Dead money % (per rem. year)** | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| **Rollover max** | 25 | 25 | 25 | 25 | 0 | 0 | 25 |
| **Season length (weeks)** | 18 | 28 | 26 | 26 | 14 | 15 | 38 |
| **Default startup draft** | Auction | Auction | Auction | Auction | Auction | Auction | Auction |
| **Rookie draft type** | Linear | Linear | Linear | Linear | Linear | Linear | Linear |

- **NCAAB / NCAAF:** Shorter contract max and no/minimal rollover to reflect shorter college windows and roster turnover.
- **SOCCER:** Align contract lengths and windows with transfer/season cycles; cap and rollover similar to pro leagues.
- All sports: use `lib/sport-scope.ts` and sport-aware resolvers for any schedule or position logic.

---

## 3. Dynasty mode workflow

1. **League creation** — Commissioner sets league size (4–32), salary cap dynasty mode, startup cap, contract rules, roster/scoring, draft type (auction default).
2. **Startup auction** — Teams draft via auction; each winning bid becomes (salary, years). Cap enforced during draft (e.g. holdback so cap space remains for in-draft bids).
3. **Season play** — Full dynasty: keep roster year-over-year. Waiver/FA acquisitions via contract bidding. Trades include salary/cap checks and future cap preview.
4. **In-season cap** — Cap tracking, contract year countdown, extension eligibility flags, dead money on cuts. No lineup submission if best ball; otherwise standard lineup.
5. **Offseason** — Contract expiration processing, extension window, franchise tag window (if on), rookie/free-agent draft (linear/auction/lottery per config), free-agent bidding opens. Rollover applied if enabled.
6. **New season** — Cap resets with new cap number (plus rollover); contract years decrement; repeat.

---

## 4. Best Ball mode workflow

1. **League creation** — Same as dynasty but mode = Salary Cap Best Ball. Best ball lineup automation: optimal lineup from roster each week, no manual set.
2. **Startup auction** — Same as dynasty; contracts and cap unchanged.
3. **Season play** — No lineup submission. System computes best possible lineup per week from roster; scoring and standings are best-ball. Waiver/trade and cap rules identical to dynasty.
4. **Offseason / new season** — Same as dynasty (contracts, draft, extensions, tag, rollover). Best ball only changes lineup handling, not cap or contract lifecycle.

---

## 5. Startup draft workflow

1. **Pre-draft** — Commissioner locks settings: cap, holdback (reserved cap for in-draft bids), contract min/max, auction timer, nomination order.
2. **Auction** — Teams nominate players and bid. Winning bid = (salary, years). System enforces: bid ≤ (cap space − holdback), years within min/max. Optional: assign years at nomination or at end of draft.
3. **Cap holdback** — Portion of cap reserved (e.g. 50) so teams cannot spend entire cap in draft; ensures in-season FA bidding room.
4. **Post-draft** — All contracts committed; cap state saved; league moves to “in-season” or “offseason” per calendar. Optional: single “assign contracts” step for any undetermined deals (e.g. default 1-year at min).

---

## 6. Offseason workflow

1. **Lock** — Season locks; final standings and cap state recorded.
2. **Contract expiration** — All expiring contracts (final year ended) marked; players become free agents at defined date.
3. **Rollover** — If enabled, unused cap space added to next season’s cap (up to rollover max).
4. **Extension window** — Eligible players (per extension rules) can be extended; extension pricing applied; cap updated.
5. **Franchise tag window** — If enabled, teams may assign tag; premium applied; deadline.
6. **Rookie / free-agent draft** — Draft type (linear, auction, weighted lottery) runs; rookie contracts assigned per scale/defaults.
7. **Free-agent bidding opens** — Contract bidding (salary + years) for remaining free agents.
8. **New season starts** — Cap year advances; contract years decrement; in-season or best ball play begins.

---

## 7. Contract lifecycle map

```
[ACQUISITION]
    │
    ├── Startup auction ──► (salary, years) assigned ──► Active contract
    ├── Rookie draft ────► Rookie scale/default ──────► Active contract
    ├── FA bidding ──────► (salary, years) assigned ──► Active contract
    └── Trade ───────────► Contract transfers ───────► Active contract (new team)
    │
[ACTIVE CONTRACT]
    │
    ├── Each season ─────► Cap hit applied; contract year advances
    ├── Extension (if eligible) ──► New (salary, years); old contract replaced
    ├── Franchise tag (if enabled) ──► One-year premium; then FA or extend
    └── Option exercised (if enabled) ──► Extra year(s) at formula salary
    │
[EXIT]
    │
    ├── Contract end ────► Becomes free agent (expiration processing)
    ├── Cut ─────────────► Dead money applied; player to FA pool
    └── Trade ───────────► Contract + cap move to new team (no dead $ for sender unless league rule)
```

---

## 8. Automation map

| Area | What is automated | When / trigger |
|------|-------------------|----------------|
| **Cap tracking** | Sum of cap hits per roster; current + future | On every roster change; displayed in UI and API |
| **Contract year countdown** | Years remaining, “expiring this year” flag | Season roll; displayed in roster/contract views |
| **Cap legality** | Validation that cap hit ≤ cap and ≥ floor | On add/drop/trade/extend/tag/cut; block if invalid |
| **Dead money** | Compute and apply on cut/release per formula | On cut transaction; store in cap state |
| **Extension eligibility** | Flag who can be extended per league rules | Offseason extension window; UI and API |
| **Franchise tag calculation** | Premium amount, one per team | Tag window; enforce tag limit and cap |
| **Rookie contract defaults** | Assign length + salary by draft slot/scale | On rookie draft pick selection |
| **Weighted lottery** | Compute draft order from odds; auditable | After lottery run; store order and seed |
| **Offseason status transitions** | Move league through expiration → rollover → extend → tag → draft → FA | Commissioner or scheduled transitions per calendar |
| **Contract expiration** | Mark expiring contracts; move to FA pool | Offseason transition at configured date |
| **Best ball lineup** | Optimal lineup from roster each week | Weekly after games final; scoring from optimal |
| **Future cap visualization** | Projected cap by season from current roster + dead money | On demand in UI and trade/extension preview |
| **Transaction cap preview** | “If you do this trade/extend/cut, cap impact is X” | Before submit on trade, extend, cut, bid |

---

## 9. AI opportunities map

| Opportunity | Description | Context needed |
|-------------|-------------|----------------|
| **Startup auction strategy** | Bid ranges, position/cap allocation, when to lock in years | Cap, holdback, contract rules, ADP/value data |
| **Cap allocation strategy** | How much to keep for FA, how to structure contracts | Roster, cap space, league settings |
| **Contract length advice** | Short vs long for given player/salary | Player value, risk, league contract rules |
| **Extension advice** | Extend or let walk; price fairness | Current salary, extension formula, future cap |
| **Franchise tag decision** | Tag vs extend vs let go | Tag cost, extension cost, roster needs |
| **Trade cap analysis** | Cap impact both sides; who gains/loses cap | Both rosters, contracts, dead money, future cap |
| **Dead money consequence** | Explain penalty of cutting/trading a player | Contract remainder, dead money formula |
| **2–5 year roster planning** | Cap and roster outlook | Roster, contracts, draft capital, FA market |
| **Title-window analysis** | “Win now” vs “rebuild” given cap and roster | Standings, age, contracts, cap space |
| **Rebuild/retool advice** | Sell high, shed salary, accumulate picks/cap | Roster, market, draft order |
| **Best ball construction** | Roster build for best ball (depth, correlation) | Best ball scoring, roster, cap |
| **Rookie draft / lottery strategy** | Who to take; lottery odds impact | Rookie scale, team needs, cap |
| **Orphan takeover** | Assess cap mess; prioritize moves for new manager | Roster, dead money, contracts, league rules |

AI must use **deterministic context only** for cap/contract data (no AI computing cap or eligibility); AI explains and advises. Gate behind entitlement (e.g. `salary_cap_ai`).

---

## 10. Implementation order

Recommended phasing so each phase delivers testable value and builds on the previous.

| Phase | Scope | Outcomes |
|-------|--------|----------|
| **1. Foundation** | Wizard: salary_cap type; league create sets variant; Prisma: SalaryCapLeagueConfig, contract/cap tables (team cap, player salary, contract years, cap hit, dead money). Sport-aware defaults (cap, contract min/max, rookie years). | Create salary-cap league; store config; no gameplay yet. |
| **2. Cap model & enforcement** | Cap hit calculation, dead money formula, cap floor (optional). Validation service: can roster add/drop/trade without violating cap. Contract year tracking. | Cap state per roster; validation on every move; future cap projection. |
| **3. Startup auction** | Auction draft with (salary, years); holdback; cap enforced during draft. Post-draft contract commit. | Full startup auction; rosters have contracts and cap. |
| **4. Dynasty in-season** | Waiver/FA contract bidding (salary + years); min salary, max years. Trade flow: cap check both sides, future cap preview. Cut: dead money application. | In-season acquisitions and trades with full cap logic. |
| **5. Offseason** | Contract expiration, rollover, extension window (eligibility + pricing), franchise tag (if on). Offseason calendar and status transitions. | Full offseason flow; extensions and tag. |
| **6. Rookie / FA draft** | Linear or auction draft for future seasons; rookie contract assignment (scale/default). Weighted lottery (odds, audit trail) if enabled. | Year 2+ drafts; rookie contracts. |
| **7. Best ball mode** | Best ball lineup automation; same cap/contract rules. Mode flag in config; weekly optimal lineup. | Salary Cap Best Ball leagues. |
| **8. Commissioner & settings** | All commissioner toggles and inputs (cap, growth, contract rules, tag, dead money, lottery, calendar, waivers). Validation and audit. | Full commissioner control. |
| **9. Automation & UX** | Future cap viz, transaction cap preview, contract countdown, eligibility flags. Event log for cap/contract events. | UX and automation from §8. |
| **10. AI** | Deterministic context builder (cap, contracts, roster, rules); prompts for §9 opportunities; route and entitlement. | Salary-cap AI advice across draft, trade, extend, tag, rebuild. |

**Suggested specialty-league integration:** Register Salary Cap in `lib/specialty-league/registry.ts` with detect, getConfig, upsertConfig, assets, homeComponent, summaryRoutePath, rosterGuard (cap-compliant only), and AI extension. Use `lib/sport-scope.ts` for all sport-aware defaults and validations.

---

*End of PROMPT 337 Salary Cap League Product Spec. No code implementation in this deliverable.*
