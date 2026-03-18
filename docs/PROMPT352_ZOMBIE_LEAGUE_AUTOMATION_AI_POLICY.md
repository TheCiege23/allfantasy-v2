# PROMPT 352 — AllFantasy Zombie League Automation vs AI Policy

**Status:** Policy definition. Aligns with Zombie product spec (PROMPT 351) and specialty-league automation framework.

**Rule:** Core legal game outcomes must be deterministic. AI must not decide any legal outcome that can be computed through rules.

---

## 1. Deterministic-only feature list

These features **must** be implemented with rules and code only. No LLM in the path. Outcomes must be reliable, fast, and auditable.

| # | Feature | Description |
|---|---------|-------------|
| 1 | **whisperer_selection** | Selection by configured randomization or veteran-priority logic. |
| 2 | **draft_order_randomization** | Draft order randomization (fair random; optional seed). |
| 3 | **matchup_schedule_ingestion** | Schedule ingestion and randomized scheduling. |
| 4 | **status_changes** | All status changes (Survivor, Zombie, Whisperer); transitions driven by rules only. |
| 5 | **infection_after_result_finalization** | Infection resolution after matchup results are finalized (loss to Whisperer/Zombie → Survivor→Zombie). |
| 6 | **stat_correction_reversals** | Reversal and re-run of infection when stats are corrected. |
| 7 | **weekly_winnings_ledger** | Weekly winnings ledger changes (compute from matchups + rules; write only). |
| 8 | **serum_award_by_high_score** | Serum award by high score (or other rule-defined threshold). |
| 9 | **serum_usage_legality_window** | Validation that serum use is within the allowed time window. |
| 10 | **serum_revive_trigger** | Revive trigger at configured serum count (e.g. 2 serums) when rule is enabled. |
| 11 | **weapon_awards_by_score_thresholds** | Weapon awards by score thresholds per rules. |
| 12 | **weapon_auto_equip_rules** | Auto-equip rules for weapons (if applicable). |
| 13 | **bomb_legality** | Bomb (or equivalent) legality checks per rules. |
| 14 | **weapon_transfer_on_matchup_result** | Weapon transfer on matchup result (e.g. to winner) per rules. |
| 15 | **survivor_bash_logic** | Survivor bash outcome logic (deterministic). |
| 16 | **zombie_maul_logic** | Zombie maul outcome logic (deterministic). |
| 17 | **whisperer_outcome_logic** | Whisperer matchup/ambush outcome logic (deterministic). |
| 18 | **ambush_availability_count** | Ambush availability count per week/Whisperer (rule-defined). |
| 19 | **ambush_legality_window** | Validation that ambush use is within allowed window. |
| 20 | **zombie_trade_restriction** | Trade restrictions for Zombie status (e.g. Zombies cannot trade, or restricted). |
| 21 | **lineups_roster_legality** | Lineup and roster legality (positions, lock times, sport rules). |
| 22 | **no_waiver_free_agency_rules** | No-waiver / free-agency rules (FCFS, lock times). |
| 23 | **universe_spreadsheet_stat_generation** | Universe spreadsheet/stat generation (standings, winnings, infections, movement). |
| 24 | **promotion_relegation** | Promotion and relegation between levels (rule + tie-break only). |
| 25 | **movement_tie_break_logic** | Tie-breaker logic for movement (points for, H2H, etc.). |
| 26 | **owner_replacement_inactivity_workflow** | Owner replacement and inactivity workflow (eligibility, replacement assignment). |
| 27 | **anti_drop_enforcement_flags** | Anti-drop enforcement flags (dangerous drop detection flags; enforcement state). |
| 28 | **collusion_event_flags** | Deterministic event flags for anti-collusion (e.g. suspicious trade patterns, same-IP). |
| 29 | **weekly_board_update_generation** | Weekly board update generation from deterministic data (structured post: infections, winnings, movement). |

**Machine-readable counterpart:** `lib/specialty-league/automation-ai-policy.ts` → `ZOMBIE_DETERMINISTIC_FEATURES`.

---

## 2. AI-optional feature list

These features are **explanation, narrative, or advice only**. They consume deterministic context from the engine. They must be gated (token/subscription) and must not affect any legal outcome.

| # | Feature | Description |
|---|---------|-------------|
| 1 | **weekly_zombie_themed_recap** | Weekly zombie-themed recap posts. |
| 2 | **whisperer_flavor_narration** | Whisperer flavor narration (story tone). |
| 3 | **weekly_chompin_block_explanation** | Weekly “On the Chompin’ Block” explanation (narrative). |
| 4 | **serum_weapon_strategy_suggestions** | Serum and weapon strategy suggestions. |
| 5 | **survivor_escape_strategy_advice** | Survivor escape strategy advice. |
| 6 | **zombie_swarm_strategy_advice** | Zombie swarm strategy advice. |
| 7 | **ambush_planning_advice** | Ambush planning advice. |
| 8 | **movement_projection_commentary** | Movement/projection commentary (interpretation of ranks). |
| 9 | **universe_storyline_summaries** | Universe storyline summaries. |
| 10 | **commissioner_anomaly_summaries** | Commissioner anomaly summaries (league health, odd patterns). |
| 11 | **inactivity_risk_coaching_nudges** | Inactivity-risk coaching nudges. |
| 12 | **replacement_owner_onboarding_recaps** | Replacement-owner onboarding recaps. |

**Machine-readable counterpart:** `ZOMBIE_AI_OPTIONAL_FEATURES`.

---

## 3. Hybrid feature list

Hybrid = **deterministic first, AI second**. The system always computes the core result; AI may add a summary or explanation layer. Key format: `[deterministic feature, AI-optional feature]`.

| # | Composite feature | Deterministic component | AI-optional component |
|---|-------------------|--------------------------|-------------------------|
| 1 | **anti_collusion_detection** | Deterministic event flags first (e.g. suspicious trade patterns, same-IP). | AI summary second (narrative explanation for commish). |
| 2 | **dangerous_drop_detection** | Deterministic value thresholds first (e.g. drop of top-N player). | AI explanation second (why it’s risky, context). |
| 3 | **movement_outlook** | Deterministic rank calculations first (who is on bubble, projected level). | AI interpretation second (commentary, storyline). |
| 4 | **weekly_forum_updates** | Deterministic data pull first (infections, winnings, standings). | AI narrative formatting second (weekly board copy, tone). |

**Machine-readable counterpart:** `ZOMBIE_HYBRID_FEATURES` (Record mapping composite key → `[deterministicId, aiOptionalId]`).

---

## 4. Token / subscription suitability notes

| Feature type | Gating recommendation | Notes |
|--------------|------------------------|--------|
| **Deterministic-only** | No token/subscription for core execution | Legal outcomes must run for all users. Optional: rate-limit or cap only for abuse (e.g. export volume). |
| **AI-optional** | Gate by entitlement | e.g. `zombie_ai` or `specialty_league_ai` entitlement; consume tokens per request. Free tier: structured data only; paid: recaps, strategy, narration. |
| **Hybrid** | Deterministic free; AI layer gated | Always show deterministic result (flags, ranks, data). Unlock AI summary/commentary with entitlement + token deduction. |
| **Weekly recaps / “Chompin’ Block”** | Premium or per-use tokens | Narrative content is additive; ideal for subscription or token burn. |
| **Commissioner anomaly / onboarding recaps** | Commissioner-only or premium commish tools | Can be part of commish dashboard entitlement. |
| **Strategy advice (serum, ambush, escape, swarm)** | Per-request tokens or premium | Prevents abuse; aligns with existing Chimmy/token patterns. |

**Consistency:** Use the same entitlement and token patterns as Survivor and Salary Cap (see `automation-ai-policy.ts` and existing entitlement checks in specialty-league AI routes).

---

## 5. Reusable specialty-league automation framework notes

These notes apply to Zombie and future specialty leagues (Big Brother, etc.).

### 5.1 Core principle

- **Legal outcome** = anything that changes game state, standings, eligibility, or movement. Always deterministic.
- **Explanation / narrative / advice** = may be AI; must be gated; must consume only deterministic context (no AI in the loop for state changes).

### 5.2 Pattern to follow (existing repo)

1. **Feature IDs** — Each deterministic and AI-optional feature has a stable string ID (e.g. `infection_after_result_finalization`, `weekly_zombie_themed_recap`).
2. **Policy file** — `lib/specialty-league/automation-ai-policy.ts`:
   - `*_DETERMINISTIC_FEATURES` — list of IDs that must never call an LLM.
   - `*_AI_OPTIONAL_FEATURES` — list of IDs that are gated and context-only.
   - `*_HYBRID_FEATURES` — `Record<string, [deterministicId, aiOptionalId]>`.
   - Helper functions: `is*DeterministicFeature(featureId)`, `is*AIOptionalFeature(featureId)`.
3. **Guards** — Before any AI call in a specialty league:
   - Ensure the requested action is not a deterministic feature ID.
   - For hybrid, run deterministic path first; then, if gated and requested, run AI layer with deterministic result as context.
4. **Context only** — AI prompts receive: matchup results, standings, infection log, ledger, movement projection, etc. AI never receives “decide who gets infected” or “decide who moves up.”

### 5.3 Checklist for new specialty leagues

- [ ] Enumerate all actions that change state → add to deterministic list.
- [ ] Enumerate all narrative/advice/explanation features → add to AI-optional list.
- [ ] Identify hybrid flows (e.g. “show movement outlook” = compute ranks + optional AI commentary) → add to hybrid map.
- [ ] Add league-type-specific arrays and hybrid map to `automation-ai-policy.ts`.
- [ ] Wire AI routes to check entitlement and feature ID before invoking LLM.
- [ ] Document token/subscription suitability per feature type in a deliverable (e.g. this doc).

### 5.4 Cross-league reuse

- **Deterministic:** Each league type has its own list (Salary Cap, Survivor, Zombie) because rules differ; the *pattern* (no LLM in path, audit trail) is shared.
- **AI-optional:** Same gating and token pattern across league types; feature IDs are league-specific.
- **Hybrid:** Same contract: deterministic component runs first; AI layer is optional and gated.
- **Policy rule constant:** `SPECIALTY_LEAGUE_POLICY_RULE` in `automation-ai-policy.ts` states the principle for all specialty leagues.

---

## Summary

| Output | Location |
|--------|----------|
| 1. Deterministic-only feature list | §1 above; `ZOMBIE_DETERMINISTIC_FEATURES` in `automation-ai-policy.ts` |
| 2. AI-optional feature list | §2 above; `ZOMBIE_AI_OPTIONAL_FEATURES` in `automation-ai-policy.ts` |
| 3. Hybrid feature list | §3 above; `ZOMBIE_HYBRID_FEATURES` in `automation-ai-policy.ts` |
| 4. Token/subscription suitability | §4 above |
| 5. Reusable specialty-league framework notes | §5 above |

No game-outcome logic is implemented in this deliverable; only policy and machine-readable feature lists.
