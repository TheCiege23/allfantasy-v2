# PROMPT 343 — AllFantasy Specialty League Reusable Automation and AI Framework

This document defines the **reusable architecture** that standardizes what is deterministic, what is automated, what is optional AI, and what must always be sport-aware across all specialty league types. It extends the existing **Specialty League Factory** (`lib/specialty-league/`) and applies to current and future leagues.

**Binding context:** AllFantasy Master Project Context. Sport scope: `lib/sport-scope.ts` (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).

---

## 1. Deterministic engine categories

All **legal outcomes, scores, eligibility, order, and state transitions** must be computed without LLM. These categories are the **deterministic engine** layer.

| Category | Description | Examples (current/future) |
|----------|-------------|----------------------------|
| **Scoring** | Points, stats, and totals from rules and raw stats only. | Standard scoring, IDP scoring, best ball optimal lineup (max points from roster), devy scoring splits. |
| **Standings** | Rank, win/loss, tiebreakers, survival order, danger tiers. | Guillotine survival order; Salary Cap cap rank; Survivor elimination order; league table. |
| **Elimination** | Who is out this period; chop/eliminate logic. | Guillotine lowest score; Survivor vote + lowest; Big Brother eviction. |
| **Cap/legal validation** | Cap space, legality, transaction validity. | Salary Cap: cap hit, dead money, floor/ceiling; trade cap validation; bid legality. |
| **Roster legality** | Slot counts, position rules, IR, taxi. | Max roster size, position limits, IR eligibility, devy/college slots, IDP slots. |
| **Draft order** | Pick order, slot order, traded picks. | Snake, linear, auction order; Salary Cap weighted lottery (deterministic seed); Survivor reverse standings. |
| **Waiver processing** | Priority, FAAB, claim resolution, bid wins. | Waiver order, FAAB deduction, winning claim; Salary Cap contract bid assignment. |
| **Lottery execution** | Draft order from weights + seed (reproducible). | Salary Cap weighted lottery; future draft order lottery. |
| **Best ball optimization** | Optimal lineup from roster (no AI). | Select highest-scoring legal lineup by position from roster; weekly/total. |
| **Offseason lifecycle** | Phase transitions, contract expiration, rollover. | Salary Cap: expiration phase, rollover, advance season; contract year decrement. |
| **Contract lifecycle** | Contract status, extensions, tags, cuts, dead money. | Salary Cap: extension eligibility/apply, franchise tag, cut/dead money, rookie options. |

**Rule:** No LLM in the path for any of the above. Use these categories when implementing a new league so that every “who is out,” “is this legal,” “what is the order,” and “what is the score” comes from code only.

---

## 2. Automation categories

Scheduled or trigger-based **jobs and side effects** that call deterministic engines and/or write event logs. No AI required for correctness.

| Category | Description | Examples |
|----------|-------------|----------|
| **Scheduled jobs** | Cron/scheduler invokes league-specific logic at a time or week. | Weekly elimination (Guillotine); weekly Survivor vote close; Salary Cap offseason phase transitions. |
| **Weekly processing** | End-of-week: score lock, standings update, elimination, waiver run. | Lock scores → update standings → run elimination → release rosters → event log. |
| **Season rollover** | End-of-season: archive, reset, advance year, rollover caps. | Salary Cap rollover phase; advance to new season; draft order reset. |
| **Media/event triggers** | On first league entry, post-draft, or event: show modal/video. | First-entry modal; post-draft intro video; “elimination” notification. |
| **Rankings generation** | Compute and store power rankings, difficulty, value. | League power rank; orphan difficulty; draft value. |
| **Recap generation triggers** | When to offer or enqueue recap (AI is separate). | “Week complete” → show “Generate recap” button; enqueue recap job. |
| **Alerts/notifications** | Notify users: on-the-clock, elimination, trade, waiver. | Draft timer, “you’re chopped,” trade accepted, waiver processed. |
| **Audit logs** | Append-only event log per league (typed events). | GuillotineEventLog; SalaryCapEventLog; league audit trail. |

**Rule:** Automation **calls** deterministic engines and writes logs; it does **not** use AI to decide outcomes. AI may be used only for optional narrative/recap **after** outcomes are fixed.

---

## 3. AI categories

**Optional, gated, explanation/strategy only.** AI must never decide legal outcomes, scores, or eligibility. All AI inputs must come from deterministic context (scores, standings, config, rosters).

| Category | Description | Examples |
|----------|-------------|----------|
| **Explanation** | Explain why something happened or what a rule means. | “Why was I eliminated?” “What does franchise tag do?” |
| **Strategy** | Advice on how to play (draft, trades, waivers). | Startup auction strategy; cap allocation advice; Survivor vote strategy. |
| **Planning** | Multi-step or multi-year planning advice. | Rebuild vs contend; multiyear cap plan; devy stash strategy. |
| **Narrative/recaps** | Storyline, recap, summary of a week/season. | Weekly recap; “chaos” narrative; salary cap storyline. |
| **Takeover/orphan help** | Advice for taking over an orphan roster. | Orphan recovery plan; cap cleanup suggestions; draft pick strategy. |
| **Commissioner diagnostics summaries** | League health, issues, suggestions for commissioner. | “3 teams over cap”; “2 orphans”; activity summary. |

**Rule:** Each AI feature must be **entitlement-gated** (e.g. `guillotine_ai`, `salary_cap_ai`). Deterministic data is built first; AI only consumes that context and returns text/recommendations, never legal state.

---

## 4. Sports API requirements for all specialty leagues

All specialty leagues must be **sport-aware**. The following are required for a consistent experience across NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.

| Requirement | Description | Notes |
|-------------|-------------|--------|
| **Player images** | Headshot/avatar URL per player (by sport). | Use existing pipeline (e.g. draft-asset, player-asset-resolver); fallback placeholder when missing. |
| **Team logos** | Team logo URL for NFL/NBA/MLB/NHL/college/soccer. | `lib/sport-teams/TeamLogoResolver` or equivalent; sport-aware. |
| **Normalized stats** | Stats in a common schema by sport (passing, rushing, receiving, etc.). | Normalize provider stats to league scoring rules; sport-specific stat sets. |
| **Injury status** | If available: designation (Out, Doubtful, etc.) and optional text. | Use where exposed; do not block core flows if missing. |
| **Sport-aware metadata** | Week boundaries, position labels, bye weeks, playoff structure. | Use `lib/sport-defaults`, schedule resolvers; `SUPPORTED_SPORTS` from `lib/sport-scope.ts`. |
| **Fallback assets** | Default image/logo when provider has none. | Single fallback or sport-specific placeholder; no broken images. |
| **Caching** | Cache player/team assets and heavy lookups by sport/league. | Reduce external calls; TTL and invalidation per use case. |

**Sport scope:** Use `lib/sport-scope.ts`: `SUPPORTED_SPORTS`, `DEFAULT_SPORT`, `normalizeToSupportedSport()`, `isSupportedSport()`. Do not hardcode a single sport in shared specialty logic.

---

## 5. QA template for every specialty league

Use this template for **each** specialty league (Guillotine, Salary Cap, Survivor, etc.).

### 5.1 Creation flow

- [ ] Wizard/API offers this league type (e.g. “Guillotine”, “Salary Cap”).
- [ ] Creating with that type sets `League.leagueVariant` and creates/upserts the specialty config (e.g. `upsertGuillotineConfig`, `upsertSalaryCapConfig`).
- [ ] Sport is respected (defaults and options use `SUPPORTED_SPORTS` / sport-scope).
- [ ] Team size and other creation params are validated (e.g. 4–32 where applicable).

### 5.2 Settings flow

- [ ] Commissioner can view/edit league settings that affect the specialty (elimination week, cap, etc.).
- [ ] Changes are validated (e.g. cap floor ≤ cap ceiling).
- [ ] Settings are persisted and reflected in config/engine.

### 5.3 Draft flow

- [ ] Draft type (snake, linear, auction) is supported where applicable.
- [ ] Starting draft runs any specialty-specific bootstrap (e.g. Salary Cap startup ledgers).
- [ ] Picks are committed and, if applicable, create specialty records (e.g. contracts from auction).
- [ ] Post-draft summary and optional intro/media trigger correctly.

### 5.4 Season flow

- [ ] Weekly processing (or equivalent) runs deterministic logic (scoring, standings, elimination, waiver).
- [ ] No legal outcome is decided by AI.
- [ ] Guards prevent excluded rosters (chopped/eliminated) from waiver/lineup/trade where applicable.
- [ ] Standings and specialty views (danger, cap, survival order) match engine output.

### 5.5 Offseason flow

- [ ] Offseason phases (if any) are runnable by commissioner or scheduler (e.g. expiration, rollover, advance).
- [ ] Contract lifecycle (extensions, tags, cuts) is deterministic and auditable.
- [ ] Draft order for next season (lottery or otherwise) is deterministic and reproducible when seed is fixed.

### 5.6 AI gating

- [ ] AI features are behind entitlement (e.g. `guillotine_ai`, `salary_cap_ai`).
- [ ] AI returns explanation/strategy only; never “you are eliminated” or “this trade is legal” as the source of truth.
- [ ] When entitlements are enforced, unentitled users get a clear gate message.

### 5.7 Mobile QA

- [ ] League home and specialty views are usable on narrow viewport.
- [ ] No dead buttons; touch targets adequate; key flows (draft, waivers, view standings) work.

### 5.8 Desktop QA

- [ ] Full layout and tables work; no overlapping or broken layout.
- [ ] All specialty tabs and modals open/close correctly.

### 5.9 Edge-case QA

- [ ] Empty league (no rosters), single roster, or max rosters: no crash.
- [ ] Ties handled per league rules (tiebreakers, co-elimination policy).
- [ ] Late join / mid-season config change: documented behavior and guards.
- [ ] API returns 404 for specialty routes when league is not that specialty type.

---

## 6. Specialty league implementation checklist

When adding a **new** specialty league (e.g. Survivor, Big Brother), complete the following in order.

### Phase 1: Identity and config

- [ ] Choose `SpecialtyLeagueId` and `leagueVariant` string (lowercase).
- [ ] Add Prisma model(s) for config if needed (or extend League.settings with validated shape).
- [ ] Implement `detect(leagueId)`, `getConfig(leagueId)`, `upsertConfig(leagueId, input)`.
- [ ] Register in `lib/specialty-league/registry.ts`: `registerSpecialtyLeague(spec)`.
- [ ] Wire league create: when wizard type or variant matches, set `leagueVariant` and call `bootstrapSpecialtyConfig(leagueId, spec)` (or equivalent).

### Phase 2: Deterministic engines

- [ ] Implement every **deterministic category** that applies: scoring, standings, elimination, cap/legal, roster legality, draft order, waiver, lottery, best ball, offseason, contract lifecycle.
- [ ] No LLM in any of these paths.
- [ ] Sport-aware: use `lib/sport-scope.ts` and sport-specific defaults (weeks, positions, etc.).

### Phase 3: Automation

- [ ] Implement `runAutomation` (or equivalent) for weekly/period processing.
- [ ] Add scheduled job or commissioner trigger that calls it.
- [ ] Event log: append-only events for key actions (elimination, tag, cut, etc.).
- [ ] Alerts/notifications: wire to existing notification system where applicable.

### Phase 4: Guards and API

- [ ] Implement `rosterGuard` and optionally `getExcludedRosterIds` (e.g. eliminated rosters cannot claim waivers).
- [ ] Waiver/roster save routes: call guard and reject if roster is excluded.
- [ ] Summary route: GET summary for league; return 404 when `!detect(leagueId)`.
- [ ] Any trade/roster mutation that affects specialty state (e.g. cap) must call the deterministic validator before persisting.

### Phase 5: UI and assets

- [ ] Set `assets` (league image, optional first-entry/intro video).
- [ ] `homeComponent`: specialty league home (Overview replacement).
- [ ] Optional: first-entry modal, custom standings component.
- [ ] League page: use `getSpecialtySpecByVariant(league.leagueVariant)` and render specialty home when present.

### Phase 6: AI (optional)

- [ ] Define deterministic features vs AI-optional features (see `automation-ai-policy.ts` pattern).
- [ ] Implement AI extension: `buildContext`, `buildPrompt`, `generate`; entitlement feature id.
- [ ] POST AI route; 404 when not this specialty; gate by entitlement.
- [ ] All AI input from deterministic context only; output is explanation/strategy only.

### Phase 7: QA

- [ ] Run full QA template (Section 5) for the new league.
- [ ] Document in a deliverable (e.g. `PROMPT3XX_<LEAGUE>_DELIVERABLE.md`) with route list, event list, and QA checklist.

---

## 7. Future league build order recommendations

Recommended order to implement **next** specialty leagues, balancing dependency, reuse, and product value.

| Order | League | Rationale |
|-------|--------|-----------|
| 1 | **Survivor** | Similar to Guillotine (elimination); reuses standings, weekly processing, guards; different elimination rule (vote + score). |
| 2 | **Best Ball** | Reuses scoring and roster legality; adds best-ball lineup optimization (deterministic); can be combined with Salary Cap later. |
| 3 | **Keeper** | Extends redraft/dynasty with keeper rules; reuses draft/roster; good base for league variety. |
| 4 | **Big Brother** | Eviction/vote mechanics; can reuse Survivor patterns (voting, exclusion). |
| 5 | **Devy** | College player eligibility and slots; sport-aware (NCAAF, NCAAB); builds on existing devy draft/roster hooks. |
| 6 | **Merged Devy** | Devy + dynasty/redraft merged; depends on Devy. |
| 7 | **IDP** | Position and scoring expansion; sport-aware; reuses scoring engine with new position set. |
| 8 | **Tournament** | Bracket/knockout; different structure; can reuse playoff/bracket resolvers. |
| 9 | **Zombie** | Niche format; implement after core elimination and draft patterns are stable. |

**Notes:**

- **Guillotine** and **Salary Cap** are already in progress or shipped; use them as reference.
- **Best Ball** as a **standalone** league type can share best-ball optimization with Salary Cap best ball mode.
- **Sport scope** applies to all: use `lib/sport-scope.ts` and sport-defaults for every new league.

---

## 8. Summary

| Layer | Rule |
|-------|------|
| **Deterministic** | Scoring, standings, elimination, cap/legal, roster, draft order, waiver, lottery, best ball, offseason, contract lifecycle — **no AI**. |
| **Automation** | Scheduled jobs, weekly processing, rollover, triggers, rankings, recap triggers, alerts, audit logs — **call engines only**. |
| **AI** | Explanation, strategy, planning, narrative, orphan help, commissioner summaries — **gated; context from engine only**. |
| **Sports API** | Player images, team logos, normalized stats, injury (if available), sport-aware metadata, fallbacks, caching — **required for all**. |
| **QA** | Use the same template per league: creation, settings, draft, season, offseason, AI gating, mobile, desktop, edge-case. |
| **Implementation** | Follow the seven-phase checklist; register in specialty-league registry; do not use AI for legal outcomes. |
| **Build order** | Survivor → Best Ball → Keeper → Big Brother → Devy → Merged Devy → IDP → Tournament → Zombie. |

---

*End of PROMPT 343 — Reusable framework. Do not start the next league until explicitly requested.*
