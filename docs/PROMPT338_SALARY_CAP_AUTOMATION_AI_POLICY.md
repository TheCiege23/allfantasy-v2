# PROMPT 338 — AllFantasy Salary Cap League: Automation vs AI Policy

Policy for separating **deterministic automation** from **optional AI assistance** across Salary Cap leagues and future specialty leagues. Core league mechanics never route through AI; AI is for explanation, strategy, and advice only.

**Principles:**
- Do not route core league mechanics through AI.
- AI must never decide legal outcomes that can be computed deterministically.
- Deterministic systems are reliable, fast, and cost-controlled; AI is optional and gated.

---

## 1. Deterministic-only feature list

These features are **automation only**. No AI may compute or override them. Implement with formulas, rules, and state machines.

| Feature | Description |
|---------|-------------|
| **Salary cap tracking** | Sum of cap hits per roster; current season and future seasons. |
| **Current cap space** | Cap − total cap hit for current season. |
| **Future cap space projection** | Formula-based projection from current roster + dead money + known contracts. |
| **Player salary assignment** | Assignment from auction bid, draft scale, or waiver bid; stored and used for cap. |
| **Contract year decrement** | On season roll, decrement years remaining; mark expiring. |
| **Contract expiration** | Process expiring contracts at configured date; move to FA pool. |
| **Dead money application** | Apply league formula on cut/release; store and apply to cap. |
| **Cap legality checks** | Validate: total cap hit ≤ cap, and ≥ cap floor if enabled. |
| **Salary matching checks** | If enabled (e.g. trade salary matching), validate via formula. |
| **Extension eligibility** | Boolean from contract year + league rules (e.g. final year, years served). |
| **Franchise tag eligibility** | One per team, not already tagged; roster rules. |
| **Rookie contract assignment** | Length + salary from draft slot scale or league default. |
| **Weighted lottery execution** | Deterministic lottery from odds + seed; auditable order. |
| **Startup auction mechanics** | Nomination, bidding, winning bid, (salary, years) assignment. |
| **Bid legality** | Bid ≤ available cap space (minus holdback if applicable); years within min/max. |
| **Waiver contract bidding mechanics** | Accept (salary, years) bids; enforce min salary, max years, cap room; select winner. |
| **Roster size legality** | Count ≤ max roster; within starters/bench/IR/taxi limits. |
| **Position legality** | Slot and position rules per league/scoring config. |
| **Best ball lineup optimization** | Optimal lineup from roster by scoring rules (max points). |
| **Offseason calendar transitions** | Move league phase by date/config; no AI input. |
| **Contract status updates** | Active, expired, tagged, option exercised — from rules only. |
| **Transaction validation** | All validations (cap, roster, position, timing) are deterministic. |
| **Future pick ownership** | Track and transfer draft picks by rule only. |
| **Compensatory pick formulas** | If enabled, compute comp picks from configured formula. |

**Implementation:** Services in `lib/salary-cap/` (or equivalent) perform all calculations. APIs return deterministic results; no LLM calls in these code paths.

---

## 2. AI-optional feature list

These features are **AI only**. They explain, recommend, or narrate. They must consume **deterministic context** (cap, contracts, standings, rules) and never compute legal outcomes.

| Feature | Description | Deterministic context required |
|--------|-------------|----------------------------------|
| **Startup auction strategy explanations** | “How to approach the auction; position/cap allocation.” | Cap, holdback, contract rules, ADP/value data. |
| **“How should I allocate my cap?” advice** | Cap allocation strategy. | Roster, cap space, league settings. |
| **Player contract-length advice** | Short vs long for a player. | Player value, contract rules, risk. |
| **Extension explanation and recommendation** | Explain extension formula; recommend extend or let walk. | Current salary, extension formula, future cap. |
| **Franchise tag recommendation** | Tag vs extend vs let go. | Tag cost, extension cost, roster. |
| **Trade cap consequence explanation** | Explain cap impact for both sides. | Both rosters, contracts, dead money. |
| **Rebuild vs contend advice** | Strategic direction. | Standings, age, contracts, cap space. |
| **Multi-year roster planning** | 2–5 year outlook. | Roster, contracts, draft capital. |
| **Best ball construction strategy** | How to build a best ball roster. | Best ball scoring, roster, cap. |
| **Orphan team recovery plan** | Priorities for taking over a bad cap situation. | Roster, dead money, contracts, rules. |
| **Salary-cap storyline / recap** | Narrative recap of week/season. | Standings, transactions, cap moves. |
| **Commissioner league health summary** | Summary of league balance, cap distribution. | All teams’ cap, roster, activity. |

**Implementation:** AI routes (e.g. `POST /api/leagues/[leagueId]/salary-cap/ai`) receive a **deterministic context** object built from cap engine and config. Prompts ask for explanation/advice only. Gate by entitlement (e.g. `salary_cap_ai`). Token usage and rate limits apply.

---

## 3. Hybrid feature list

These features have **both** a deterministic core and an optional AI layer. The table defines the split.

| Feature | Deterministic part (required) | AI-optional part (gated) |
|--------|-------------------------------|----------------------------|
| **Cap allocation** | Current cap space, future projection, cap hit per player (all from engine). | “How should I allocate?” narrative and recommendations. |
| **Extension** | Eligibility, extension price from formula, cap impact if extended. | “Should I extend?” explanation and recommendation. |
| **Franchise tag** | Eligibility, tag cost, cap impact. | “Tag or extend?” recommendation. |
| **Trade evaluation** | Cap impact both sides, legality, future cap preview (all from engine). | “Who wins the trade?” narrative and strategy. |
| **Transaction preview** | Cap impact of proposed move (deterministic). | “Is this a good move?” advice. |
| **Roster planning** | Future cap table, contract expiration list, draft picks (all from engine). | “Rebuild vs contend” and multi-year plan narrative. |
| **Orphan takeover** | Roster, contracts, dead money, cap space (all from engine). | “Recovery plan” prioritization and narrative. |
| **Best ball** | Optimal lineup each week (deterministic). | “How to build a best ball roster” strategy. |
| **Startup auction** | Bid legality, cap during draft, (salary, years) assignment. | “Auction strategy” and bid guidance. |
| **Waiver bidding** | Bid legality, winner selection, contract assignment. | “How much to bid / how many years?” advice. |

**Rule:** The deterministic part always runs and is the source of truth. The AI part is an optional add-on that **consumes** deterministic output and returns text only (no state changes).

---

## 4. Token / subscription suitability notes

| Layer | Token / subscription | Notes |
|-------|------------------------|------|
| **Deterministic automation** | No tokens; no subscription gate for core mechanics. | Cap, validation, auction, waiver, lottery, best ball lineup — all free to the league. |
| **AI-optional features** | Token or subscription gate. | Each AI request consumes tokens; gate by entitlement (e.g. `salary_cap_ai` or `ai_chat`). Prefer subscription for “unlimited” usage and tokens for pay-per-use if product supports both. |
| **Hybrid UX** | Deterministic data always shown; AI “Explain” / “Advise” is gated. | e.g. Trade screen shows cap impact (free). “Get AI advice” button calls AI route (gated). |
| **Rate limits** | Apply to AI routes only. | Throttle by user or league to control cost and abuse. |
| **Context size** | Keep deterministic context compact for AI. | Send summary (cap space, key contracts, move in question); avoid sending full roster dump when not needed. |
| **Caching** | Do not cache AI output as source of truth. | Cache deterministic context for a short TTL for repeat requests; do not treat AI text as authoritative for legality or scoring. |

**Recommendation:** Treat “deterministic” as baseline product (reliable, no API cost). Treat “AI” as premium (entitlement + tokens/subscription) so specialty leagues stay cost-controlled and reliable.

---

## 5. Reusable specialty-league automation framework (future leagues)

Use the same policy for **any** specialty or contract-based league (Salary Cap, Guillotine, Survivor, Devy, etc.):

### 5.1 Classification rule

- **Deterministic:** Anything that decides **legal outcome**, **score**, **eligibility**, **order**, or **state transition** must be computed by rules/formulas/state machines. No LLM in the path.
- **AI-optional:** Anything that **explains**, **recommends**, **narrates**, or **advises** may use AI, and must consume deterministic context only. AI output never writes to league state.

### 5.2 Per–league-type checklist

When adding a new specialty league:

1. **List all mechanics** that affect standings, eligibility, or roster state (draft, waiver, elimination, cap, contract, etc.).
2. **Classify each** as deterministic or AI-optional using the rule above. If both (e.g. “trade evaluation”), split into deterministic core + optional AI layer.
3. **Implement deterministic first:** engine, validation, storage. No AI in those code paths.
4. **Add AI only where** the feature is explicitly “explanation” or “advice,” and feed it deterministic context.
5. **Gate AI** by entitlement and (if applicable) tokens/subscription.
6. **Document** in the league’s spec or README which features are deterministic vs AI-optional.

### 5.3 Reusable policy constants (repo)

A single policy module can define:

- **Deterministic feature IDs** — Used to ensure no AI is invoked for those features; also for docs and tests.
- **AI-optional feature IDs** — Used for entitlement checks and rate limiting.
- **Hybrid feature IDs** — Map to (deterministicPart, aiOptionalPart) for implementation guidance.

See `lib/specialty-league/automation-ai-policy.ts` for machine-readable IDs and helpers. New league types extend the same pattern (e.g. add `guillotine_*`, `survivor_*` deterministic vs AI).

### 5.4 Format applicability

| Format type | Deterministic focus | AI-optional focus |
|-------------|--------------------|--------------------|
| **Salary Cap** | Cap, contracts, auction, waiver bids, extensions, tag, lottery. | Strategy, allocation, rebuild, recap. |
| **Dynasty-like** | Roster continuity, draft order, pick tracking, trade validation. | Trade advice, rebuild, prospect rankings. |
| **Best ball–like** | Optimal lineup from roster (max points). | Construction strategy, roster build. |
| **Contract-based** | Contract lifecycle, eligibility, formulas. | Extension/tag advice, planning. |
| **Elimination (e.g. Guillotine)** | Elimination logic, tiebreak, roster release. | Survival strategy, waiver advice. |

Same principle everywhere: **legal/state = deterministic; narrative/advice = AI-optional.**

---

## 6. Implementation guidance for engineers

### 6.1 Where to put logic

- **Deterministic:** In league-specific engine modules (e.g. `lib/salary-cap/`, `lib/guillotine/`). Call from APIs, cron jobs, and transaction flows. Never call an LLM from these modules.
- **AI-optional:** In league-specific AI modules (e.g. `lib/salary-cap/ai/`). Build context from the **same** engine and config; call LLM; return text. Never write league state from AI code.

### 6.2 Context flow

```
League state + config
        ↓
  Deterministic engine (cap, contracts, eligibility, validation)
        ↓
  API response (cap space, legality, preview)  ← no AI
        ↓
  Optional: build “context” object for AI (summary of above)
        ↓
  AI service (prompt + context → explanation/advice)  ← gated
        ↓
  AI response (text only)
```

### 6.3 Guards

- Before calling any LLM in a league flow, assert: “This call does not decide any legal outcome (eligibility, score, order, state change).” If it does, move that logic to the deterministic engine.
- Use the policy module’s feature IDs: if the feature is in the deterministic list, do not invoke AI for it. If it’s in the AI-optional list, require entitlement and (if applicable) token/subscription.

### 6.4 Testing

- **Deterministic:** Unit tests with fixed inputs; same input must always yield same output. No mocks for “AI” in deterministic paths.
- **AI:** Mock LLM in tests; assert that AI receives the expected deterministic context and that response is not used to set league state.
- **Hybrid:** Test deterministic part independently; test AI part with snapshot or prompt assertions; test that UI shows deterministic data even when AI is unavailable or gated.

### 6.5 Documentation

- In each specialty league’s README or spec, add a short “Automation vs AI” section: list deterministic features, AI-optional features, and hybrids. Link to this policy doc and to `lib/specialty-league/automation-ai-policy.ts`.

---

*End of PROMPT 338 Automation vs AI Policy. Implementation of the policy reference module is in `lib/specialty-league/automation-ai-policy.ts`.*
