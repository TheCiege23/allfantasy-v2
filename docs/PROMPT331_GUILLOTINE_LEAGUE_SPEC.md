# PROMPT 331 — AllFantasy Guillotine League Research-Aligned Product Spec

**Binding context:** AllFantasy Master Project Context; AllFantasy-native design (no copy of other platforms’ branding, text, or assets). Public guillotine/chopped mechanics as inspiration only.

**Supported sports (from `lib/sport-scope.ts`):** NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER.

---

## 1. Guillotine Rules Spec

### 1.1 Core Rules (Research-Aligned)

- **Single points race:** All teams compete in one league-wide points race each scoring period. No head-to-head outcomes affect survival.
- **Elimination:** The **lowest-scoring team** in that scoring period is **eliminated** (chopped).
- **Roster release:** The eliminated team’s roster is **released to waivers/free agency** according to league settings (timing and processing rules).
- **Iteration:** Process repeats each period until **one team remains** (or until a configurable championship endpoint if the commissioner enables a custom ending).
- **Stat corrections:** Must be handled **before** final elimination lock. Commissioner has a **configurable cutoff window** (e.g. 24–72 hours after period close) after which scores are final and elimination is locked.
- **Ties:** Resolved **deterministically** using the configured tiebreaker order (no randomness unless explicitly enabled as last resort).

### 1.2 Default Tiebreaker Order

1. **Total season points** (full season points for)
2. **Previous period points** (higher survives)
3. **Draft slot:** In Week 1 (or first period) tie, **better draft slot loses** (e.g. 1.01 loses to 1.12)
4. **Commissioner override** (manual resolution)
5. **Random** only if explicitly enabled as last resort in league settings

### 1.3 League Size Rules

- **NFL:** 4–32 teams; recommended default **12**, with 14–18 as common.
- **Other sports:** Sport-appropriate configurable ranges with recommended defaults; commissioner can override.
  - NHL/NBA/MLB: recommend 8–16; allow 4–24.
  - NCAAF/NCAAB: recommend 8–14; allow 4–20.
  - SOCCER: recommend 8–14; allow 4–20.

### 1.4 Terminology (AllFantasy-Native)

- **Chop** = elimination of the lowest-scoring team for that period.
- **Chop Zone** = current lowest projected team (or teams, if multi-chop).
- **Danger Tier** = teams within a configurable projected-points threshold of the Chop Zone.
- **Safe Tier** = teams clearly above the danger threshold.
- **Survival** = still in the league (not yet chopped).
- **Released roster** = the chopped team’s roster made available to waivers/FA per league rules.

Do not use other platforms’ proprietary names for “danger line” or equivalent; AllFantasy uses **Chop Zone** and **Danger Tier** with configurable formulas.

---

## 2. Sport-by-Sport Settings Recommendations

| Dimension | NFL | NHL | NBA | MLB | NCAAF | NCAAB | SOCCER |
|-----------|-----|-----|-----|-----|--------|--------|--------|
| **Season length** | 18 weeks (or 17 game weeks + bye); elimination start week 1 | 26–28 weeks / scoring periods | 24–26 weeks | 26 weeks (full season) | 14–15 weeks | 12–14 weeks | League-dependent (e.g. 38 rounds) |
| **Roster size (starters)** | 9 (1QB, 2RB, 2WR, 1TE, 1FLEX, 1K, 1DST) or IDP variant | 12–14 (C, W, D, G, etc.) | 10 (PG, SG, SF, PF, C, FLEX) | 10 (C, 1B, 2B, SS, 3B, OF×3, UTIL, P×2) | 9–10 (sport positions) | 8–10 | 11 (formation-based) |
| **Bench size** | 6–8 | 4–6 | 3–5 | 4–6 | 5–7 | 4–6 | 4–6 |
| **Waiver mode** | FAAB (recommended) | FAAB | FAAB | FAAB | FAAB | FAAB | FAAB |
| **FAAB budget (default)** | $100 | $100 | $100 | $100 | $100 | $100 | $100 |
| **Elimination cadence** | 1 team per week | 1 per scoring period | 1 per week | 1 per week | 1 per week | 1 per week | 1 per round/slate |
| **Playoff / ending** | No playoffs (last team standing); optional “final 2” or “final 3” week | Last team standing | Last team standing | Last team standing | Last team standing | Last team standing | Last team standing |
| **Scoring presets** | PPR, Half-PPR, Standard, IDP | G, A, SOG, PPP, etc. | PTS, REB, AST, 3PM, etc. | R, HR, RBI, SB, AVG, K, W, SV | PPR-like or custom | Points/category | G, A, CS, etc. |
| **IR settings** | 1–2 IR; IR+ optional | 1–2 IR | 1–2 IR | 1 IL | 0–1 | 0–1 | 0–1 |
| **Trade default** | Off (configurable on) | Off | Off | Off | Off | Off | Off |
| **Team count range** | 4–32 (rec 12) | 4–24 (rec 12) | 4–24 (rec 12) | 4–24 (rec 12) | 4–20 (rec 10) | 4–20 (rec 10) | 4–20 (rec 10) |

All of the above are **recommendations**; commissioner can override within supported ranges and options.

---

## 3. Workflow Map

### 3.1 High-Level Phases

1. **League creation** → Commissioner selects Guillotine format, sport, team count, scoring, roster, waiver, tiebreakers, elimination start/end, stat-correction window.
2. **Draft** → Same as other leagues (snake/linear/auction); draft order can be used for Week 1 tiebreaker.
3. **Regular scoring periods** → Each period:
   - **Lock lineups** (per lock rules).
   - **Period ends** → Scores final (subject to stat-correction window).
   - **Stat-correction window** → Commissioner-configured hours; no chop until window closes.
   - **Elimination lock** → Apply tiebreakers; chop lowest team(s).
   - **Chop event** → Mark team chopped, lock lineup, release roster per waiver settings, post to league chat, update standings.
   - **Waiver/FA** → Process waivers including released players; then open FA if applicable.
4. **Repeat** until one team remains (or custom championship endpoint).
5. **Champion** → Last team standing (or winner of final configurable showdown).

### 3.2 Detailed Workflow (Per Period)

```
[Period start]
  → Lineup submission open
  → Projections / Chop Zone / Danger Tier visible (optional)
[Lock time]
  → Lineups locked
[Period games run]
  → Live scoring (no survival change until period final)
[Period end]
  → Raw scores in
[Stat-correction window]
  → Wait configured hours; apply any stat corrections
[Elimination lock]
  → Compute final period standings
  → Apply tiebreakers for last place
  → Mark chopped team(s)
  → Lock chopped team(s) lineup
  → Release chopped roster(s) to waivers (or FA) per settings
  → Post chop event to league chat
  → Update standings; remove chopped team from “active” list
  → Optionally run post-week recap / AI summary
[Waiver processing]
  → Process claims (FAAB/rolling/etc.) including released players
  → Optionally instant FA or next waiver run
[Next period]
  → Repeat
```

### 3.3 Edge Cases

- **Multi-chop weeks:** If commissioner enables “multiple teams chopped” (e.g. double chop week), apply same logic for N lowest teams; release all chopped rosters in one batch per league rules.
- **Custom championship:** If “championship week” is enabled (e.g. final 2 or 3), define whether it’s one more chop or a single winner-take-all scoring period.
- **Orphan teams:** If AI manager is enabled, same chop rules apply; AI team can be chopped and roster released.

---

## 4. Automation Map

| Automation | Description | Trigger | Configurable |
|------------|-------------|---------|--------------|
| **Auto-detect chopped team** | System computes lowest score(s) after stat-correction window; applies tiebreakers | After correction window closes | Yes (tiebreaker order, multi-chop rules) |
| **Auto-lock chopped lineup** | Chopped team’s lineup becomes read-only | On chop | Yes (immediate vs after delay) |
| **Auto-release chopped roster** | Released players go to waivers/FA per league settings | On chop (or at configured time) | Yes (timing, waiver vs instant FA) |
| **Auto-post chop event** | Post to league chat: “Team X was chopped in Week N.” | On chop | On/off |
| **Auto-play chop animation** | In-app chop animation (AllFantasy-native) | On chop (or on league home) | On/off |
| **Auto-update standings** | Standings remove chopped team; “active” list and danger/safe tiers update | On chop + on new projections | Always |
| **Auto-update Chop Zone / Danger Tier** | Recompute lowest projected and within-threshold teams | On projection refresh / lineup change | Yes (margin, percentile, or survival model) |
| **Auto post-week recap** | Generate/send weekly recap (e.g. who was chopped, who’s in danger) | After chop + optional delay | On/off |
| **Auto draft/survival rankings** | If enabled, update “draft order survival” or “player survival” rankings | After chop / periodically | On/off |

---

## 5. AI Opportunities Map

| AI feature | Description | When available |
|------------|-------------|-----------------|
| **Guillotine AI coach** | Toggle on/off; coach gives survival-focused advice | League setting |
| **AI FAAB suggestions** | Bids for released players and FA; guillotine-aware (survival priority) | Waiver period / FA |
| **AI survival mode recommendations** | “Start/sit for survival” (maximize chance to avoid chop) | Pre-lock |
| **AI chop-risk analysis** | Probability or rank of being chopped this period | Pre-lock / live |
| **AI “who is in danger” summary** | Weekly text/summary of Danger Tier and Chop Zone | Post-lock or pre-period |
| **AI post-chop waiver plan** | After chop, suggested claims and FA adds from released roster | After chop |
| **AI draft strategy (guillotine)** | Draft for survival (early safety vs upside); guillotine-specific tiers | Pre-draft / draft |
| **AI live draft helper** | Guillotine-specific roster construction (e.g. safe floor early, upside later) | During draft |
| **AI team manager (orphan)** | If enabled, AI manages orphan; can be chopped like any team | League setting |
| **AI storyline / weekly recap** | Narrative recap (who was chopped, storylines); monetization-gated if needed | Post-week; optional |

All of the above are **opportunities**; implementation order can phase them (see Section 8).

---

## 6. Settings Matrix

### 6.1 General (Commissioner-Controlled)

| Setting | Type | Default / recommendation | Notes |
|---------|------|---------------------------|-------|
| League size | 4–32 (NFL); sport range for others | Per sport table | Hard min/max per sport |
| Public / private | Boolean | Private | Discovery and join rules |
| Draft type | Snake / Linear / Auction | Snake | Same as standard leagues |
| Draft timer | Seconds per pick | 90 (or sport default) | |
| Season start week/date | Week number or date | Sport default | |
| Elimination start week | Week number | 1 | First period with chop |
| Final week / championship week | Week number | Last regular week or custom | |
| Teams eliminated per period | 1 or N | 1 | Multi-chop if N > 1 |
| Multiple chops in special weeks | Boolean / rules | Off | E.g. double chop week 9 |
| Playoffs exist | Boolean | Off | Pure last-team-standing; optional final 2/3 showdown |

### 6.2 Scoring

| Setting | Type | Notes |
|---------|------|-------|
| Sport-specific scoring | Full custom + templates | Same as standard leagues |
| Preset scoring templates | Template ID | PPR, Standard, etc. |
| Custom tiebreakers | Ordered list | Total season pts → previous period → draft slot → commissioner → random (if enabled) |
| Median game (optional) | Boolean | If architecture supports; often off for guillotine |
| Projected score source | Enum | If multiple sources exist |

### 6.3 Roster

| Setting | Type | Notes |
|---------|------|-------|
| Starters | Slot counts per position | Sport defaults |
| Bench | Count | Sport defaults |
| IR | Count | Sport defaults |
| Taxi | Count (if allowed) | Sport/league |
| IDP (NFL) | Toggle | If applicable |
| Positional limits | Per position | Min/max per slot type |
| Max acquisitions | Per period or season | Optional cap |

### 6.4 Waivers / Player Release

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Waiver type | FAAB / Rolling / Reverse standings | FAAB | Recommendation: FAAB |
| FAAB budget | Number | 100 | |
| Chop roster release timing | Immediate / Scheduled time | Immediate (or configurable) | When released players hit waivers |
| Waiver processing after chop | Before next period / Same day / Custom | Per league | |
| Released players | Instant FA vs Waiver-only | Waiver-only (recommended) | |
| Eliminated rosters lock until correction window ends | Boolean | On | No adds/drops from chopped roster until chop is final |

### 6.5 Trades

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Trades allowed | Boolean | Off | If on, reuse existing trade + AI review logic |

### 6.6 Danger Line / Chop Zone (AllFantasy-Native)

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| Danger margin | Points or percentile | e.g. 5 points or 10th percentile | `dangerThreshold = lowestProjectedScore + margin` or percentile band |
| Danger formula | Lowest + margin / Percentile band / Survival probability | Lowest + margin | Optional: plug in survival probability if available |
| Show projected vs actual | Boolean | True | Show both where relevant |
| Live survival probability | On/off | Off (optional) | If model exists |

---

## 7. UI / State Map

### 7.1 App States (Conceptual)

- **League creation (guillotine)** – Format = Guillotine; sport; team count; scoring; roster; waiver; tiebreakers; elimination start/end; stat-correction window; danger/chop settings.
- **Pre-draft** – Same as other leagues; show guillotine-specific draft strategy tip if AI enabled.
- **Draft** – Same shell; guillotine-specific helper/tiers optional.
- **Active period** – Lineup submission; **Standings** (active teams only; chopped teams in “eliminated” section); **Chop Zone** (lowest projected); **Danger Tier** (within margin); **Safe Tier**; live scoring; survival probability (if on).
- **Period ended, correction window** – “Scores pending stat corrections”; countdown or time until elimination lock; no chop yet.
- **Chop occurred** – Chopped team highlighted; roster “released”; league chat event; optional animation; standings updated.
- **Waiver/FA** – Released players in pool; FAAB/claims; same as standard plus “from chopped roster” badge.
- **Post-week** – Recap (AI or static); next period lineup open.

### 7.2 Key Screens / Components

- **League settings (commissioner)** – Guillotine tab: elimination rules, tiebreakers, stat-correction window, multi-chop, danger margin, automation toggles, AI toggles.
- **Standings** – Active teams (sortable by period pts, season pts); eliminated teams collapsed or separate section; Chop Zone / Danger / Safe labels.
- **Chop Zone / Danger widget** – Compact view: “Lowest projected: Team X”; “In danger: Team A, B” (within margin); “Safe: rest.”
- **League home** – Next chop (week/period); who’s in danger; last chop result; waiver deadline for released players.
- **Draft room** – Same as standard; optional guillotine strategy panel and AI helper.
- **Lineup** – Same as standard; optional “survival” projection or risk indicator.

### 7.3 Data / State (Logical)

- **League:** `format: 'guillotine'` (or specialty_format); `eliminationStartWeek`, `eliminationEndWeek`, `teamsPerChop`, `statCorrectionWindowHours`, `tiebreakerOrder`, `dangerMargin`, `dangerFormula`, multi-chop rules.
- **Team:** `eliminatedAt: null | timestamp`; `eliminatedInPeriod: null | periodId`.
- **Period:** `periodId`, `scores`, `finalAt` (after correction window), `choppedTeamId(s)`.
- **Standings:** Derived: active teams sorted by period pts (then tiebreakers); chopped teams excluded from “current” survival list.

---

## 8. Implementation Order

Recommended phasing (no code yet; order only):

1. **Foundation**
   - Data model: league format/guillotine flags, elimination config, tiebreaker order, stat-correction window.
   - League creation: guillotine option, sport, team count, basic settings (no danger UI yet).

2. **Core elimination engine**
   - After-period flow: finalize scores → stat-correction window → apply tiebreakers → mark chopped team → persist state.
   - Roster release: move chopped roster to waivers/FA per settings (timing and processing).

3. **Standings and chop display**
   - Standings: active vs eliminated; sort by period pts and tiebreakers.
   - Chop Zone / Danger Tier: formula (lowest + margin); display on league home and standings.

4. **Automation**
   - Auto-lock chopped lineup; auto-post chop to league chat; auto-update standings.
   - Optional: chop animation; post-week recap trigger.

5. **Waiver and FA**
   - Released players in waiver pool; FAAB/rolling logic; “from chopped roster” in UI.
   - Chop roster release timing and “lock until correction window ends” behavior.

6. **Commissioner controls**
   - Full settings matrix: multi-chop, custom championship week, tiebreaker overrides, commissioner override for ties.
   - Stat-correction window and lock time.

7. **Sport-by-sport defaults**
   - Per-sport recommended team count, roster, scoring, cadence, FAAB; apply in creation and templates.

8. **AI (incremental)**
   - Guillotine AI coach toggle; FAAB suggestions; survival recommendations; chop-risk analysis; “who is in danger” summary; post-chop waiver plan; draft strategy and live draft helper; orphan AI; storyline/recap (optional / gated).

9. **Polish**
   - Danger formula options (percentile, survival model if available); live survival probability; median game if supported; projected score source selection.

This order keeps core mechanics and UX first, then automation and commissioner control, then sport defaults and AI enhancements.

---

## Document Summary

- **§1** – Guillotine rules spec (research-aligned core rules, tiebreakers, league size, AllFantasy-native terms).
- **§2** – Sport-by-sport recommendations (NFL, NHL, NBA, MLB, NCAAF, NCAAB, SOCCER).
- **§3** – Workflow map (phases and per-period flow, edge cases).
- **§4** – Automation map (what is automated, trigger, configurable).
- **§5** – AI opportunities map (coach, FAAB, survival, chop-risk, recap, draft, orphan, storyline).
- **§6** – Settings matrix (general, scoring, roster, waivers/release, trades, Chop Zone/danger).
- **§7** – UI/state map (app states, key screens, logical data).
- **§8** – Implementation order (foundation → engine → display → automation → waiver → commissioner → sport defaults → AI → polish).

No code implemented; spec only.
