# PROMPT 345 — AllFantasy Survivor League Automation vs AI Policy

Separation of **deterministic automation** from **optional AI** so the Survivor league is reliable, fast, auditable, and not overly dependent on AI APIs.

**Rule:** Core legal game outcomes must be deterministic. AI must not decide valid outcomes when they can be computed through rules.

**Binding context:** AllFantasy Master Project Context. Aligns with `lib/specialty-league/automation-ai-policy.ts` and PROMPT 343 framework.

---

## 1. Deterministic-only feature list

All of the following **must be 100% deterministic** (no LLM in path). Used for legal state, scores, eligibility, order, and transitions.

| Feature ID | Description |
|------------|-------------|
| `tribe_creation_after_draft` | Tribe formation (random or commissioner-assigned); tribe count/size from config. |
| `tribe_balancing_validation` | Check whether tribe sizes/scores meet balance rules; used for shuffle trigger. |
| `tribe_shuffle_trigger_rules` | Evaluate consecutive losses / imbalance threshold; decide if shuffle runs. |
| `tribe_chat_membership_updates` | Add/remove members from tribe chats after formation, shuffle, or elimination. |
| `official_chimmy_command_parsing` | Parse @Chimmy intent (vote, play_idol, challenge_pick, etc.) and parameters from raw text. |
| `challenge_lock_at_kickoff_deadline` | Lock challenge submissions at game kickoff or configured deadline (timestamp-based). |
| `timestamping_and_first_submission_rule` | Record submission time; apply first-submission or deadline rules for challenges. |
| `challenge_scoring_tallying` | Score/tally challenge answers or predictions against key; deterministic outcome. |
| `immunity_assignment` | Assign tribe or individual immunity from rules or challenge outcome (no AI). |
| `idol_seeding_after_draft` | Seed N idols post-draft; assign to N distinct drafted players (secret; seeded RNG). |
| `one_idol_per_user_initial_assignment` | Enforce at most one idol per manager at initial assignment. |
| `idol_chain_of_custody_tracking` | Log every assignment, transfer, use, expiry; full audit trail. |
| `idol_transfer_on_trade` | When player with unused idol is traded, transfer idol control to receiving manager. |
| `idol_transfer_on_waiver_claim` | When player with unused idol is dropped and claimed, transfer to claiming manager. |
| `idol_transfer_on_stolen_player_ownership_change` | When player is stolen by idol effect and had unused idol, new owner gains idol. |
| `idol_usage_validation` | Validate play-idol command: ownership, eligibility, not expired, not already used. |
| `idol_expiry` | Mark idol inactive after validity window (e.g. merge) per config; log. |
| `tribal_vote_deadline_enforcement` | Reject votes after deadline; lock submissions at deadline. |
| `self_vote_restriction` | If enabled, reject vote where voter and target are same manager. |
| `vote_counting` | Tally votes per target; deterministic count. |
| `tie_resolution_by_total_season_points` | On vote tie, eliminate manager with lower total season fantasy points to date. |
| `exile_island_enrollment` | Move eliminated manager to Exile league; update roster/chat membership. |
| `jury_enrollment` | Add voted-out manager to jury when past jury-start threshold (config). |
| `merge_trigger` | Evaluate week or remaining-player count; transition to merge phase when met. |
| `bestball_lineup_optimization` | Compute optimal lineup from roster by position (max points); if BestBall mode. |
| `roster_legality_by_sport` | Validate roster slots, positions, IR, taxi per sport and league config. |
| `exile_island_token_tracking` | Award token to top Exile scorer; store per-manager token count. |
| `exile_token_reset_when_boss_wins` | When commissioner/Boss has top Exile score, set all Exile tokens to 0. |
| `return_to_island_eligibility_at_tokens` | Check token count vs threshold (e.g. 4); allow return if enabled and met. |
| `chat_access_removal_addition` | Remove eliminated from tribe/league chat; add to Exile/jury chat per config. |
| `scroll_reveal_event_generation` | Generate reveal event payload (who voted, who out) for UI; data from engine only. |
| `audit_logging` | Append-only event log for votes, idol use, overrides, shuffle, elimination. |

---

## 2. AI-optional feature list

These are **explanation, narrative, or advice only**. They must be **gated** (entitlement/subscription). They consume deterministic context only and must never decide legal outcomes.

| Feature ID | Description |
|------------|-------------|
| `generating_tribe_names` | Auto-generate tribe names when commissioner chooses “auto names” (creative names). |
| `generating_tribe_logos` | Generate or suggest tribe logos if pipeline exists (optional asset). |
| `weekly_host_narration` | Host voice: weekly intro, theme, tone (narrative only). |
| `tribal_council_dramatic_reveal_language` | Dramatic reveal wording for vote/elimination (result already fixed by engine). |
| `scroll_text_styling` | Styling or phrasing of scroll/reveal text for presentation. |
| `challenge_flavor_text` | Descriptive or thematic text for challenges (entertainment). |
| `strategy_help` | General Survivor strategy advice (draft, vote, alliances). |
| `idol_usage_coaching` | When to play / hold idol (advice only; actual play is user + validation). |
| `tribe_leader_coaching` | Advice for tribe leaders (picks, morale); no authority over outcomes. |
| `private_alliance_guidance` | Alliance-building or negotiation guidance in private/tribe chat. |
| `survivor_style_recaps` | Weekly or season recap in Survivor-style narrative. |
| `jury_finale_moderation_tone` | Tone or moderation style for jury/finale chat (if visible). |
| `exile_advice` | How to play Exile, FAAB, token strategy (advice only). |
| `return_path_strategy` | How to maximize chance to earn 4 tokens and return (advice only). |
| `storyline_summaries` | Storyline or “story so far” summaries (narrative only). |

---

## 3. Hybrid feature list

**Hybrid** = deterministic core + optional AI layer. The **outcome or decision** is always from the deterministic side; AI only adds language, normalization, or explanatory guidance.

| Feature | Deterministic component | AI-optional component |
|---------|--------------------------|-------------------------|
| **@Chimmy decision intake** | Parser: extract intent and parameters from message; validate and lock submission. | AI language normalization: interpret fuzzy or informal phrasing into canonical command (e.g. “vote for Sarah” → vote target); parser can accept AI-suggested canonical form but **final validity and lock** are rule-based. |
| **Tribe strategy prompts** | Deterministic submission windows (vote deadline, challenge deadline); only submissions in window count. | AI explanatory guidance: answer “what happens if I vote X?” or “what’s the tie-break?” using rules context; no AI decision on who is out. |
| **Challenge prompts** | Deterministic challenge engine: question, key, scoring, reward application. | AI host voice: read challenge text, add flavor, announce results; result and rewards from engine only. |
| **Tribal reveal** | Deterministic result: vote tally, eliminated manager, tie-break applied; event payload for UI. | AI narrative output: dramatic reveal language, “in 3… 2… 1…” style text; outcome already fixed. |

**Implementation note:** For hybrid flows, always run the deterministic path first and persist the outcome; then optionally call AI for presentation or guidance. Never let AI output replace or override the deterministic result.

---

## 4. Token / subscription suitability notes

| Layer | Token / subscription suitability | Notes |
|-------|----------------------------------|--------|
| **Deterministic / automation** | **No gate** | Core game must work for all users. Tribe creation, vote counting, idol logic, Exile tokens, merge, jury, audit log—all available without subscription. |
| **AI-optional (narrative / advice)** | **Gate recommended** | Tribe name generation, host narration, dramatic reveal language, scroll styling, challenge flavor text, strategy help, idol coaching, recaps, storyline summaries, exile/return advice: good candidates for entitlement (e.g. `survivor_ai` or `ai_chat`). Free users get deterministic outcomes with minimal or no AI wording. |
| **Hybrid (AI layer only)** | **Gate the AI part** | @Chimmy decision intake: parser must work for everyone; “AI language normalization” can be premium. Tribe strategy prompts: submission windows free; AI explanatory guidance gated. Challenge prompts: challenge engine free; AI host voice gated. Tribal reveal: result and event free; AI narrative gated. |
| **Rate and cost** | **Throttle and cap** | Limit AI calls per user/league per day; use deterministic context to keep prompts small. Prefer caching for repeated reads (e.g. “what is tie-break?”). |
| **Fallback** | **Graceful degradation** | If AI unavailable or user not entitled: show deterministic result only (e.g. “X was eliminated with 3 votes”); no dramatic wording required. |

---

## 5. Reusable specialty-league automation framework notes for future leagues

These notes apply to **Survivor and future specialty leagues** (Big Brother, Tournament, Zombie, etc.).

### 5.1 Classification rule

- **Deterministic:** Anything that defines or changes **legal state**—scores, eligibility, who is in/out, order, timestamps, chain-of-custody, vote tally, tie-break, roster legality, token count, merge/jury/exile membership. No LLM in path.
- **AI-optional:** **Explanation, recommendation, or narrative** that does not change game state. Must be gated; consumes engine context only; never the source of truth for “who won,” “who is out,” or “is this valid.”
- **Hybrid:** Feature has both a **state-changing / rule-enforcing part** (deterministic) and a **presentation / guidance part** (AI). Implement deterministic first; persist outcome; then optionally call AI for wording or normalization. Document which part is gated.

### 5.2 Checklist for new league types

When adding a new specialty league:

1. **List all state-changing actions** (creation, assignment, transfer, vote, elimination, lock, deadline, reset). → All **deterministic**.
2. **List all “who / what / when” answers** (standings, who is eliminated, who has immunity, vote count). → All **deterministic**.
3. **List all narrative or advice surfaces** (recaps, host voice, strategy tips, flavor text). → All **AI-optional** or hybrid AI layer.
4. **Identify hybrid flows** (e.g. command intake, reveal). → Split into [deterministic core] + [AI layer]; gate only the AI layer.
5. **Define entitlement id(s)** for AI features (e.g. `survivor_ai`) and document in subscription/entitlements.
6. **Audit log** every deterministic state change and commissioner override; never log AI output as the authority for game outcome.

### 5.3 Repo pattern

- **Constants:** Per-league deterministic and AI-optional feature ID arrays (and hybrid map) in `lib/specialty-league/automation-ai-policy.ts` (or league-specific policy file) so guards and product can branch on feature id.
- **Guards:** Before invoking LLM for a feature, check that the feature is **not** in the deterministic list and (if gating) that the user has entitlement for the AI feature.
- **Order of operations:** In hybrid flows, always: (1) run deterministic logic, (2) persist outcome, (3) optionally call AI for presentation/guidance.

### 5.4 Cross-league reuse

- **Deterministic categories** (from PROMPT 343): scoring, standings, elimination, roster legality, draft order, waiver processing, lottery, best ball, audit logging—all remain deterministic for Survivor, Salary Cap, Guillotine, and future leagues.
- **AI categories:** explanation, strategy, planning, narrative/recaps, takeover/orphan help, commissioner diagnostics—all remain AI-optional and gated; league-specific prompts only.

---

*End of PROMPT 345 — Survivor League Automation vs AI Policy.*
