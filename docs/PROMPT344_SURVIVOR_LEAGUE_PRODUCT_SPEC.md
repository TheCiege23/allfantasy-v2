# PROMPT 344 — AllFantasy Survivor League Research-Aligned Product Spec

AllFantasy-native Survivor-style fantasy format: tribes, tribal council, idols/advantages, merge, jury, Exile Island, AI host, and mini-games. No implementation yet — spec only.

**Binding context:** AllFantasy Master Project Context. **Sport scope:** `lib/sport-scope.ts` — NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.

---

## 1. Survivor league rules spec

### 1.1 Core concept

- **Fantasy scoring** — Sport-specific scoring (customizable) drives weekly performance.
- **Tribes** — Managers are grouped into tribes (default 4 tribes, 3–5 per tribe; configurable).
- **Private tribe chats** — Each tribe has a private chat; AI host is a member; strategy chat is distinct from official commands.
- **Hidden idols/advantages** — Idols are assigned secretly post-draft, tied to drafted players; configurable count and power pool; chain-of-custody on trade/drop/claim/steal.
- **Weekly Tribal Council** — Lowest-performing tribe (or configured rule) attends; tribe votes one manager out via official command; tie-break by total season fantasy points (lower eliminated).
- **Merge** — Triggered by week or remaining-player threshold; post-merge play is individual; top scorer gets immunity; jury starts at configured point.
- **Jury** — Voted-out players (after configured point) join jury; jury visibility/chat rules configurable.
- **Exile Island** — Voted-out managers move to a separate Exile league; optional return rule (e.g. 4 tokens).
- **AI host** — AI participates in tribe/league chat; explains rules, announces outcomes; does **not** decide votes or legal outcomes.
- **Mini-games** — Informational/entertainment challenges that can affect immunity, advantages, scoring bonuses, FAAB, or voting; not real-money betting.

### 1.2 League modes

| Mode | Description |
|------|-------------|
| **Survivor Redraft** | Standard weekly lineup; commissioner sets starters/bench/IR; tribe and individual scoring from lineup. |
| **Survivor BestBall** | Optimal lineup computed from roster each week (deterministic best-ball); no manual lineup submission. |

### 1.3 Draft

- **Types:** Snake, Linear, Auction (league-level setting).
- **Post-draft:** Tribes formed (random or commissioner-assigned); tribe names set or auto-generated; private tribe chats created; AI host added to each tribe chat; idols seeded and assigned secretly (one per manager max at assignment).

### 1.4 Social / official commands

- **Official decisions** (vote, play idol, submit challenge pick, etc.) must be submitted via **@Chimmy** in the relevant context (tribe chat for tribal vote, league chat where specified).
- **AI must distinguish:** (1) normal strategy/social chat, (2) official commands (parsed, validated, locked), (3) locked official submissions (immutable once deadline passed).
- **Tribe leader** — Commissioner can assign tribe leader per tribe; leader may submit challenge picks or immunity choices via @Chimmy where configured.

### 1.5 Elimination and tie-break

- **Pre-merge:** Tribe with lowest tribe score (or configured rule) goes to Tribal Council; members vote; one manager eliminated per week.
- **Tie-break (vote):** If vote is tied, eliminate the manager with **lower total season fantasy points** to that point.
- **Post-merge:** Individual; top scorer has immunity; remaining can be voted out; same tie-break rule.

### 1.6 Idols and advantages

- **Assignment:** Secret; after draft; tied to drafted players; no manager receives more than one idol at initial assignment; configurable number of idols; powers from configurable pool.
- **Visibility:** Hidden until revealed/played/inspected (by rule).
- **Transfer:** If a player carrying an unused idol is traded, the receiving manager gains control of that idol. If dropped and claimed, the claiming manager gains control. If a player is stolen by an idol effect and that player had an unused idol, the new manager gains control.
- **Use:** One-time use per idol; after use, cannot be used again.
- **Logging:** Ownership, transfer, usage, expiry, and chain-of-custody are fully logged (deterministic audit trail).

### 1.7 Tribe shuffle

- **Auto-shuffle:** If a tribe has too many consecutive losses or a configured imbalance threshold is met, tribes can be automatically rebalanced (optional; commissioner can disable).
- **Manual shuffle:** Commissioner can trigger a manual shuffle.
- **Preserve:** League state and chat memberships are updated; no data loss.

### 1.8 Exile Island

- **On vote-out:** Manager is removed from main league and tribe chat; added to Exile Island league.
- **Exile gameplay (default concept):** Sport-aware; each week starts from an empty exile roster; managers use FAAB to claim a team/player set; top-scoring Exile manager earns a token; if commissioner/Boss has top score that week, all Exile tokens reset to 0; configurable return rule (e.g. 4 tokens = return to main island after merge if enabled).

### 1.9 Commissioner and host

- **Commissioner** — Full settings, tribe assignment, shuffle, overrides (e.g. manual elimination in edge cases); all override actions logged.
- **AI host** — Announcements, rule explanation, narrative; no authority over vote outcome or legality.

---

## 2. Automated vs AI feature map

Aligned with PROMPT 343: **deterministic = legal/state/outcome (no LLM); automation = jobs/triggers; AI = explanation/strategy only (gated).**

| Feature | Layer | Notes |
|---------|--------|--------|
| Fantasy scoring (weekly, tribe, individual) | **Deterministic** | Rules-based; sport-aware. |
| Standings (tribe rank, individual rank, survival order) | **Deterministic** | From scores only. |
| Who attends Tribal Council (lowest tribe or configured) | **Deterministic** | From tribe scores. |
| Vote tally and who is eliminated (including tie-break) | **Deterministic** | From submitted votes + total season points. |
| Idol assignment (post-draft), transfer, use, expiry | **Deterministic** | Secret assignment; chain-of-custody; no AI. |
| Immunity (tribe/individual) from rules or mini-game outcome | **Deterministic** | Mini-game results are deterministic or commissioner-entered. |
| Best ball optimal lineup | **Deterministic** | Max points from roster by position. |
| Tribe formation (random or assigned), shuffle | **Deterministic** | Random uses seeded RNG; assignments stored. |
| Merge trigger (week or player count) | **Deterministic** | Config-driven. |
| Jury membership (who joins jury, when) | **Deterministic** | Config-driven. |
| Exile roster, FAAB, token award, reset, return rule | **Deterministic** | All rule-based. |
| Mini-game outcome (if system-scored) | **Deterministic** | Predictions/answers scored by rule; rewards applied by rule. |
| Weekly lock (scores, vote deadline) | **Automation** | Scheduled job. |
| Tribal Council close (collect votes, run elimination) | **Automation** | Calls deterministic vote + tie-break. |
| Post-elimination: move to Exile, leave tribe chat, event log | **Automation** | Side effects after outcome. |
| Notifications (vote due, eliminated, immunity, etc.) | **Automation** | Alerts/notifications. |
| Audit log (votes, idol use, overrides) | **Automation** | Append-only event log. |
| @Chimmy official command parsing and validation | **Deterministic** | Parse intent; validate against rules; lock submission. |
| AI host: explain rules, announce results, narrative | **AI** | Gated; context from engine only; never decides vote or legality. |
| AI tribe/private strategy chat (advice, speculation) | **AI** | Gated; explanation/strategy only. |
| AI recap / storyline / jury commentary | **AI** | Gated; narrative only. |
| AI commissioner diagnostics (activity, issues) | **AI** | Gated; summary only. |

---

## 3. Sport-by-sport recommended defaults

All sports use `lib/sport-scope.ts`: NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.

| Area | NFL | NBA | MLB | NHL | NCAAF | NCAAB | SOCCER |
|------|-----|-----|-----|-----|--------|-------|--------|
| **Season weeks** | 18 (or 17) | ~24 | ~26 | ~28 | ~15 | ~18 | League-dependent |
| **Merge week default** | 10 | 14 | 16 | 18 | 8 | 12 | Configurable |
| **Jury start** | Merge + 1 | Merge + 1 | Merge + 1 | Merge + 1 | Merge + 1 | Merge + 1 | Merge + 1 |
| **Positions (main)** | QB, RB, WR, TE, FLEX | PG, SG, SF, PF, C | P, C, 1B, 2B, 3B, SS, OF, UTIL | G, C, W, D, FLEX | QB, RB, WR, TE, FLEX | PG, SG, SF, PF, C | GK, DEF, MID, FWD, FLEX |
| **Exile roster (default)** | Same-team or QB,RB,WR,TE,FLEX | Team-based or 5 slots | P, IF, OF, UTIL / team | G, C, W, D, FLEX | Same as main or reduced | Same as main or reduced | GK, DEF, MID, FWD, FLEX |
| **Scoring** | League default (pass/rush/rec) | Pts, reb, ast, etc. | H, R, RBI, HR, etc. | G, A, SOG, etc. | League default | Pts, reb, ast | G, A, CS, etc. |
| **Tribe score method** | Sum of tribe member scores | Same | Same | Same | Same | Same | Same |

All defaults are overridable by commissioner; sport is required at league creation.

---

## 4. Tribe workflow map

```
[League created] → [Draft completed]
       ↓
[Tribe formation]
  • Tribe count (e.g. 4), size (e.g. 3–5) from config
  • Random assign OR commissioner assign
  • Tribe names: commissioner-set OR auto-generated
       ↓
[Per tribe]
  • Create private tribe chat
  • Add tribe members + AI host to chat
  • (Optional) Assign tribe leader
       ↓
[Weekly pre-merge]
  • Lock lineups / best ball lock (by sport week)
  • Compute tribe scores (sum of member scores)
  • Determine which tribe attends Tribal Council (e.g. lowest)
  • (Optional) Run immunity/advantage mini-game → alter immunity or advantages
  • Open vote window; members submit vote via @Chimmy (tribe chat or designated channel)
  • Vote deadline
       ↓
[Tribal Council close]
  • Collect locked votes (deterministic)
  • Apply tie-break (total season points, lower out)
  • Eliminate one manager
  • Event log: vote tally, eliminated manager
  • Remove eliminated from tribe chat; remove from main league active
  • Add eliminated to Exile Island league
  • AI host announces result in league chat (AI narrative only)
       ↓
[Shuffle check]
  • If imbalance/consecutive-loss threshold met and auto-shuffle on → run shuffle
  • Update tribe membership; update tribe chats; preserve state
       ↓
[Repeat until merge trigger]
  • Merge trigger: by week OR by remaining player count
       ↓
[Merge]
  • All remaining in one “tribe” (individual play)
  • Top weekly scorer has immunity
  • Tribal Council continues (individual votes)
  • Voted-out (after jury start) → join jury + Exile
```

---

## 5. Idol lifecycle map

```
[Draft complete]
  → Seed N idols (config); assign to N distinct drafted players (secret)
  → One idol per manager at assignment
  → Store: idolId, powerType, playerId, rosterId (owner), leagueId, status = 'hidden'

[Visibility]
  • hidden → revealed (on play or explicit “reveal” per power rules)
  • revealed → played (when used)

[Transfer (ownership change; idol stays with player or moves to new owner)]
  • Trade: player with unused idol traded → receiving rosterId gains control of idol (update owner)
  • Drop + claim: player with unused idol dropped, another manager claims → claiming rosterId gains control
  • Steal (idol power): player A stolen by manager B; if player A had unused idol → B gains control

[Use]
  • Manager submits “play idol” via @Chimmy (validated: correct context, eligible power, not expired)
  • Engine applies power (e.g. protect self, nullify vote, steal player)
  • Idol status → used; log: who, when, power, outcome
  • Idol cannot be used again

[Expiry]
  • Optional: idol has “valid until” (e.g. merge) per power type
  • After expiry, idol is inactive; log

[Audit]
  • Full chain-of-custody: assignment, every transfer, every use, expiry
  • Deterministic; no AI in path
```

### 5.1 Example idol power registry (deterministic enforcement)

| Power ID | Effect | Merge/jury/finale notes |
|----------|--------|---------------------------|
| protect_self | Holder immune from vote-out this Tribal Council | Eligibility by phase (pre-merge/merge) per config |
| protect_self_plus_one | Holder + one named ally immune | Same |
| steal_player | Steal one player from another roster (rules: position, roster size) | Merge: individual rosters; rule set may differ |
| freeze_waivers | Waivers frozen for one period (league or tribe) | Deterministic; apply to next waiver run |
| extra_vote | Holder’s vote counts twice | Tally logic deterministic |
| vote_nullifier | Nullify one other player’s vote | Tally logic deterministic |
| score_boost | Add X points to holder’s score this week | Applied in scoring step |
| tribe_immunity_modifier | Tribe gets immunity or bonus (configurable) | Pre-merge only |
| secret_tribe_power | Configurable tribe-level effect | Defined per league |
| swap_starter | Swap one starter with bench (rules) | Lineup change; roster-legal only |
| force_tribe_shuffle | Trigger tribe shuffle if enabled | Calls shuffle engine |
| jury_influence / finale_advantage | Only if commissioner enables | Post-merge/jury; effect defined per config |

All effects are implemented as deterministic rules; no AI decides outcome.

---

## 6. Tribal Council workflow

```
[Pre-merge]
  1. Week ends; scores locked.
  2. Tribe scores computed; tribe with lowest score (or per-config rule) “attends” Tribal Council.
  3. (Optional) Immunity/mini-game: winner(s) immune; ineligible to be voted out.
  4. Vote window opens: message with @Chimmy in tribe chat (e.g. “@Chimmy vote for [manager]”).
  5. System parses and validates: voter, target, within deadline; store as locked submission.
  6. Vote deadline passes; no more submissions accepted.
  7. Tally votes (deterministic).
  8. If tie: eliminate manager with lower total season fantasy points to date.
  9. Eliminated manager: remove from tribe, add to Exile, event log, notify.
  10. AI host posts announcement (narrative only) in league chat.
```

```
[Post-merge]
  1. Week ends; scores locked.
  2. Top scorer has individual immunity (cannot be voted out).
  3. Vote window: remaining members submit via @Chimmy (league or designated channel).
  4. Same parse → validate → lock → tally → tie-break.
  5. Eliminated: if past jury start → add to jury + Exile; else Exile only.
  6. Event log + notifications + AI host announcement.
```

**Official command handling (@Chimmy):**

- **Parse:** Extract intent (vote, play_idol, submit_challenge_pick, etc.) and parameters.
- **Validate:** Check voter eligibility, target eligibility, idol ownership/use, deadline.
- **Lock:** On deadline or on explicit “confirm” per design; locked submissions immutable.
- **Execute:** Only after deadline; tally and run elimination in one deterministic step.

---

## 7. Merge / jury / Exile workflow

```
[Merge trigger]
  • Condition: current week >= merge_week OR remaining active players <= merge_threshold (config).
  • All remaining managers form “merged” group; tribe chats no longer used for vote (or repurposed per product).
  • Individual scoring; top scorer each week = individual immunity.

[Jury start]
  • Condition: e.g. first vote-out after merge (configurable).
  • Every subsequent voted-out manager: add to jury + add to Exile Island league.
  • Jury: can have private jury chat; visibility (who sees jury chat) per commissioner setting.
  • Jury does not vote on eliminations; used for finale/summary if configured.

[Exile Island]
  • New league (or linked league): same sport; Exile-specific roster rules.
  • Default: weekly empty roster; FAAB to claim team/players; top Exile scorer gets 1 token.
  • Boss rule: if commissioner has top Exile score that week, all Exile tokens → 0.
  • Return rule (if enabled): e.g. 4 tokens = option to return to main island after merge (one-time; configurable).

[Exile roster by sport]
  • NFL: e.g. QB, RB, WR, TE, FLEX (or same-team build).
  • NBA: PG, SG, SF, PF, C or team-constrained.
  • MLB: P, IF, OF, UTIL or team-constrained.
  • NHL: G, C, W, D, FLEX.
  • NCAAF/NCAAB: Same structure as main or reduced.
  • SOCCER: GK, DEF, MID, FWD, FLEX.
  • All sport-aware; positions and scoring from Exile league config.
```

---

## 8. Mini-game system map

**Purpose:** Informational/entertainment only; not real-money betting. Outcomes can affect immunity, advantages, scoring bonuses, FAAB, or voting per config.

| Category | Example | Outcome type | Deterministic? |
|----------|---------|--------------|----------------|
| Tribe total goal | “Tribe total points over/under X” | Bonus points or immunity | Yes (score vs threshold) |
| Primetime / game score | “Monday night total points over/under” | Bonus or advantage | Yes (actual score vs prediction) |
| Player prop style | “Player X over/under Y points” | Score boost or FAAB | Yes (actual stat vs line) |
| Puzzle / clue | Commissioner-entered or system puzzle | Advantage or idol clue | Yes (answer match or commissioner approval) |
| Challenge (quiz) | Sport trivia; correct answer | Small FAAB or bragging | Yes (answer key) |

**Flow:**

1. Commissioner or system creates mini-game for the week (type, parameters, reward type).
2. Players submit predictions/answers via @Chimmy or dedicated UI (before deadline).
3. After real games / deadline: outcomes computed deterministically (or commissioner enters result).
4. Rewards applied: immunity flag, score boost, FAAB grant, vote nullifier, etc., per power/reward type.
5. All outcomes and rewards logged; no AI in outcome path.

**Reward types (configurable):**

- Tribal immunity (pre-merge)
- Individual immunity (merge)
- Tribe bonus points
- FAAB
- Idol/advantage reward (e.g. clue or extra vote)
- Score boost
- Voting safety (one vote cannot target holder)

---

## 9. Settings matrix

| Group | Setting | Type | Default / notes |
|-------|---------|------|------------------|
| **General** | League mode | Redraft / BestBall | Redraft |
| | Sport | NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER | Required |
| | Draft type | Snake, Linear, Auction | Snake |
| | Tribe count | 2–8 | 4 |
| | Tribe size (per tribe) | 2–6 | 3–5 |
| | Tribe formation | Random / Commissioner-assigned | Random |
| | Tribe names | Commissioner / Auto-generated | Auto-generated |
| | Merge trigger | By week / By remaining count | By week |
| | Merge week (if by week) | 1–season max | Sport default (e.g. 10 NFL) |
| | Merge threshold (if by count) | 2–20 | e.g. 8 |
| | Jury start | First vote-out after merge / Custom | First after merge |
| | Exile return rule | Off / On (e.g. 4 tokens) | Off |
| | Exile tokens to return | 1–10 | 4 |
| | Idol count | 0–N | 2 |
| | Idol power pool | Subset of power registry | All or subset |
| | Tribe shuffle | Off / Auto / Manual only | Off |
| | Shuffle trigger | Consecutive losses / Imbalance threshold | Configurable |
| | Mini-game frequency | None / Weekly / Custom | None |
| | Tribal Council day/time | Day of week + time | e.g. Tuesday 9p |
| | Vote deadline | Day + time (before Council) | e.g. Tuesday 8p |
| | Tie-break | Total season points (lower out) | Fixed rule |
| **Scoring** | Sport-specific scoring | Full custom (per sport) | League default |
| | Tribe score method | Sum of member scores | Sum |
| | Individual immunity method | Top scorer (weekly) | Top scorer |
| | Best ball toggle | On if BestBall mode | N/A if Redraft |
| **Roster** | Starters / Bench / IR / Taxi | Counts and positions | Sport default |
| | Tribe competition scoring | Same as league scoring | Same |
| | Exile roster format | By sport (positions) | Per sport (see §3) |
| **Chat / Commands** | @Chimmy official parsing | On | On |
| | Tribe leader role | Optional per tribe | None |
| | Vote secrecy | Votes hidden until reveal (optional) | Hidden |
| | Host/commissioner override logging | All overrides logged | On |
| | Jury chat visibility | Who can see jury chat | Commissioner |
| **Challenges** | Reward types | Immunity, FAAB, score, etc. | Configurable list |

---

## 10. Implementation order

Recommended build order (no code yet; spec only).

| Phase | Scope | Deliverables |
|-------|--------|--------------|
| **1. Core identity and config** | League variant, detection, config model, registry | SurvivorLeagueConfig (Prisma); detect, getConfig, upsertConfig; register in specialty-league registry; league create wiring (variant + bootstrap). |
| **2. Tribes and chat** | Tribe formation, names, private tribe chats | Tribe model (or equivalent); formation engine (random/assigned); create private chats; add AI host; tribe leader optional. |
| **3. Scoring and standings** | Tribe score, individual score, who attends Council | Scoring engine (sport-aware); tribe aggregate; “attending tribe” rule; standings API. |
| **4. Vote and Tribal Council** | Vote collection, @Chimmy parsing, tally, tie-break | Command parser for vote; validation; lock; tally; tie-break (total season points); elimination event. |
| **5. Elimination and Exile** | Move to Exile, leave tribe chat, Exile league | Exile league creation/link; move roster; remove from tribe chat; event log; notifications. |
| **6. Idols** | Assignment, transfer, use, audit | Idol model; assignment post-draft; transfer on trade/drop/claim/steal; power registry; use validation; full audit log. |
| **7. Merge and jury** | Merge trigger, individual immunity, jury membership | Merge condition; jury start condition; jury membership and chat visibility. |
| **8. Tribe shuffle** | Auto and manual shuffle | Shuffle engine; threshold config; commissioner trigger; chat membership update. |
| **9. Mini-games** | Challenges and rewards | Mini-game types; submission; outcome resolution; reward application (immunity, FAAB, score, etc.). |
| **10. Exile gameplay** | Exile roster, FAAB, tokens, return | Exile roster rules by sport; weekly FAAB; token award/reset; return rule. |
| **11. Commissioner and settings UI** | Full settings matrix | Settings API and UI; overrides; audit. |
| **12. AI host and narrative** | Announcements, recaps, strategy (gated) | AI host in tribe/league chat; announcement after Council; strategy/recap gated; no AI in vote/elimination path. |

Dependencies: 1 → 2 → 3 → 4 → 5 (core loop); 6 can parallel after 2; 7 after 4–5; 8 after 2; 9 after 4; 10 after 5; 11 throughout; 12 after 4–5.

---

*End of PROMPT 344 — Survivor League Product Spec. Do not implement code yet.*
