# PROMPT 351 — AllFantasy Zombie League Research-Aligned Product Spec

**Status:** Design only. Do not implement code yet.

This document defines the Zombie League as a first-class specialty format on AllFantasy, inspired by the uploaded rules and universe stats structure. All branding, wording, and UI are AllFantasy-native.

---

## 1. Zombie League Rules Spec

### 1.1 Baseline concept (preserved)

- **Zombie Universe** = one cohesive “universe” composed of **multiple linked leagues**.
- **Level structure:** Leagues are grouped into tiers (e.g. Gamma → Beta → Alpha). Default: 3 Gamma, 2 Beta, 1 Alpha.
- **Per-league roles:** Exactly **one Whisperer** per league; all other teams start as **Survivors**. Survivors can become **Zombies** via infection.
- **Infection:** Spread through **matchup losses** (e.g. loss to Whisperer or to a Zombie can convert a Survivor to Zombie per rule set).
- **Universe-wide systems:** Standings, movement between levels, serums/weapons/ambush, weekly update board, promotion/relegation.
- **Resources:** Serums, weapons, ambush powers; weekly winnings ledger; optional stat correction and reversal handling.

### 1.2 Universe structure (default)

| Parameter | Default | Configurable |
|----------|---------|--------------|
| Total owners (universe) | 120 | Yes |
| Number of leagues | 6 | Yes |
| Gamma leagues | 3 | Yes |
| Beta leagues | 2 | Yes |
| Alpha leagues | 1 | Yes |
| Teams per league | 20 | Yes |
| Whisperer per league | 1 | Yes (fixed at 1 in core spec) |
| Survivors at league start | 19 | Derived (teams per league − 1) |

Commissioner/admin can change league count, level count, level names, and teams per league; architecture must support variable N leagues and M levels.

### 1.3 Core status types

| Status | Description | Notes |
|--------|-------------|--------|
| **Survivor** | Living team; can score, bash, use items; can be infected. | Default for all non-Whisperer at start. |
| **Zombie** | Infected team; can maul, fight other Zombies; can infect Survivors (via matchup/rule). | Result of infection from loss to Whisperer/Zombie (rule-defined). |
| **Whisperer** | Special role per league; can ambush; distinct matchup/infection rules. | One per league; determination at start (random or veteran-priority). |

### 1.4 Optional future roles (extension points)

- **Revived Survivor** — Zombie restored to Survivor (e.g. serum use or rule trigger).
- **Promoted owner** — Moved up a level for next season.
- **Demoted owner** — Moved down a level for next season.
- **Eliminated / replaced inactive** — Seat replaced; replacement owner status.

These are not required for first implementation but the data model and status engine should not block them.

### 1.5 General rules to support

- **Universe size** — Configurable total owners, league count, level count.
- **Level names** — Configurable (e.g. Gamma, Beta, Alpha or custom).
- **Teams per league** — Configurable; same or different per league.
- **Whisperer selection** — Random, or veteran-priority (e.g. returning owners get priority in random draw).
- **Movement rules** — Who moves up/down between levels (e.g. by standings, winnings, survivor status).
- **Tie-breakers for movement** — Points for, head-to-head, etc., configurable.

### 1.6 Rosters and scoring

- **Sport-specific roster settings** — Positions, roster size, IR, etc. from league/sport config.
- **Sport-specific scoring settings** — Scoring system per sport; no one-sport hardcoding in core engine.
- **NFL first** — First implementation uses NFL roster and scoring defaults as first-class presets; schema and services accept `sport` and delegate to sport-aware resolvers.

### 1.7 Draft

- **Startup draft** — Single draft per league (or per universe if ever supported); draft order randomized.
- **Whisperer determination** — After draft (or before), one team per league selected as Whisperer (random or veteran-priority).
- **Draft order randomization** — Fair random order; optional seed for replay.
- **Queue / slow draft** — Support queue and slow draft if platform supports it; commission pause/reset rules configurable.

### 1.8 Status transitions (rules to support)

| Transition | Trigger (rule-defined) |
|------------|------------------------|
| Survivor → Zombie | Loss to Whisperer or Zombie (per infection rules). |
| Zombie → Revived Survivor | Serum use or special rule (optional). |
| Survivor → Whisperer | Rule trigger (e.g. Whisperer vacancy, promotion from within league) — optional. |
| Whisperer → Zombie | Rule trigger (e.g. loss condition) — optional. |
| Whisperer vacancy | If Whisperer leaves or is removed; behavior configurable (e.g. no replacement, or next eligible becomes Whisperer). |
| Stat correction reversal | If a score is corrected after infection run, support reversal/re-run of infection for that week (configurable). |

### 1.9 Resources and items

- **Serums** — In-universe resource; use can revive (Zombie → Survivor) or other effect per rules.
- **Weapons** — In-universe resource; use can affect matchup (bash/maul/ambush) or defense per rules.
- **Ambushes** — Whisperer (and possibly others) power; one or more per week per rules.
- **Weekly winnings** — Ledger of winnings per team/week (e.g. from matchups, bonuses).
- **Universe standing movement projection** — Who is on track to move up/down based on current standings and movement rules.

### 1.10 Free agency

- **No-waiver / free-agent-first** — Mode where waivers are minimal or FCFS; configurable.
- **During-game bench adds** — If configured (e.g. NFL in-game adds).
- **Lineup lock rules** — Lock time per sport/league.
- **Anti-abuse / anti-collusion** — Monitoring and commissioner tools (alerts, audit); no hard logic required in first pass beyond logging and visibility.

### 1.11 Chat and feed

- **League update feed** — Per-league; weekly results, infections, winnings, items.
- **Universe update feed** — Universe-wide; level standings, movement outlook, weekly board.
- **Zombie weekly board** — Universe-level weekly summary (infections, kills, serums, weapons).
- **Public and private commissioner/admin** — Channels for commish updates; access control by role.

---

## 2. Universe architecture

### 2.1 Entity model (conceptual)

- **ZombieUniverse** — One universe; id, name, sport, config (league count, level names, teams per league, movement rules, tie-breakers).
- **ZombieUniverseLevel** — Level within universe (e.g. Gamma, Beta, Alpha); id, universeId, name, rankOrder (1 = bottom, 3 = top), leagueCount.
- **ZombieLeague** — One league in the universe; id, universeId, levelId, name, leagueId (FK to main League), orderInLevel, config (whisperer selection, infection rules, etc.).
- **ZombieLeagueTeam** — One team in a Zombie league; id, zombieLeagueId, rosterId (FK to main Roster), status (Survivor | Zombie | Whisperer), weekBecameZombie, killedByRosterId (optional), revivedAt (optional).
- **ZombieUniverseStanding** — Snapshot or computed: universeId, rosterId, zombieLeagueId, levelId, totalPoints, pointsPerWeek, winnings, serums, weapons, weekKilled, killedBy, projectedLevelNextYear, etc.
- **ZombieResourceLedger** — Serums, weapons, ambushes: league or universe scoped; per-team balances and history (awarded, spent, transferred).
- **ZombieWeeklyWinnings** — Per league/week/roster; winnings amount, source (matchup, bonus, etc.).
- **ZombieInfectionLog** — Per league/week; survivorRosterId, infectedByRosterId, week, matchupId (optional); used for “killed by” and reversal.
- **ZombieMovementProjection** — Computed or stored: rosterId, currentLevelId, projectedLevelIdNextYear, reason (promotion/relegation/watch).

### 2.2 Linking to existing League/Roster

- Each **ZombieLeague** points to one main **League** (fantasy league with rosters, matchups, scoring). That League’s `leagueVariant` = `zombie` (or similar).
- **ZombieLeagueTeam** links to **Roster** in that League. Status (Survivor/Zombie/Whisperer) is stored in Zombie engine; scoring and matchups remain in core league engine.
- One **ZombieUniverse** aggregates multiple **ZombieLeague** rows (and thus multiple Leagues). Universe standings and movement are computed from league-level data plus universe config.

### 2.3 Data flow

- **Matchup results** — Come from existing scoring/matchup engine (sport-specific). Zombie engine consumes “matchup finalized” events (or reads results) and runs **infection resolution** and **weekly winnings**.
- **Infection resolution** — After week locks: for each league, evaluate losses to Whisperer/Zombie per rules → create ZombieLeagueTeam status updates and ZombieInfectionLog entries.
- **Resources** — Awarded by rules (e.g. win vs Zombie = serum); spent by user/commish action (use serum, use weapon, use ambush). Ledger is source of truth.
- **Movement** — At season end (or continuously projected): compute standings across universe, apply movement rules and tie-breakers → produce promotion/relegation and ZombieMovementProjection.

### 2.4 Multi-tenancy and access

- **Universe** is the top-level scope. Only commissioners/admins can create or edit universe and level structure.
- **League** membership (who can see which league) follows existing AllFantasy league access. **Universe** visibility: all members of any league in the universe can see universe standings/forum (configurable: e.g. public universe vs private).
- **Whisperer** identity is visible per league (and optionally in universe view). **Zombie** and **Survivor** status are visible within league and in universe standings.

---

## 3. Automated vs AI feature map

| Feature | Automated (deterministic) | AI (optional, gated) |
|--------|----------------------------|------------------------|
| Universe/level/league config | Create, update, validate | — |
| Whisperer selection | Random or veteran-priority draw | — |
| Draft order | Randomize, queue, slow draft | — |
| Matchup scoring | Existing engine | — |
| Infection resolution | Rule-based: loss to Whisperer/Zombie → Survivor→Zombie | — |
| Revive (Zombie→Survivor) | Serum use or rule trigger | — |
| Serums/weapons/ambush | Award per rules; spend per action; ledger | — |
| Weekly winnings | Compute from matchups + rules; ledger | — |
| Universe standings | Compute from league data + movement rules | — |
| Movement projection | Compute from current standings + rules | — |
| League update feed | Post structured update (results, infections, winnings) | Optional: AI-generated narrative summary |
| Universe weekly board | Post structured update (infections, movement watch) | Optional: AI-generated narrative |
| Zombie weekly board copy | — | Optional: AI host “weekly board” tone |
| Strategy advice | — | Optional: “How to avoid infection,” “When to use serum” (gated) |
| Commissioner summary | — | Optional: AI league/universe health summary (gated) |

**Rule:** All game-state changes (status, resources, winnings, movement) are **automated and deterministic**. AI is used only for narrative, explanation, and strategy advice, with deterministic context as input.

---

## 4. Weekly workflow map

| Step | Owner | Description |
|------|--------|-------------|
| 1 | System / Commish | Lineup lock (per sport). |
| 2 | System | Matchups run (existing scoring). |
| 3 | System | Matchups finalize (locked). |
| 4 | Zombie engine | **Infection resolution:** For each league, evaluate losses to Whisperer/Zombie; apply Survivor→Zombie per rules; write ZombieLeagueTeam + ZombieInfectionLog. |
| 5 | Zombie engine | **Resource awards:** Grant serums/weapons (and ambush if applicable) per rules (e.g. win vs Zombie = 1 serum). Update ZombieResourceLedger. |
| 6 | Zombie engine | **Weekly winnings:** Compute winnings per matchup/rule; write ZombieWeeklyWinnings. |
| 7 | Zombie engine | **Universe standings refresh:** Recompute totals, points per week, “week killed,” “killed by,” projected level. |
| 8 | System / Commish | **League update post:** Publish league update feed (results, infections, winnings). Optional: AI narrative. |
| 9 | System / Commish | **Universe update post:** Publish universe weekly board (infections, movement watch). Optional: AI narrative. |
| 10 | Users | Optional: use serums/weapons/ambush (if allowed mid-week); engine applies and updates ledger. |

Season end:

- Finalize all league standings and statuses.
- Run **universe movement engine:** apply promotion/relegation rules and tie-breakers; produce next-year level assignments.
- Post **universe standings page/forum** update (final movement, pinned post).
- Offseason transition: archive or roll config for next season (optional future).

---

## 5. Item/resource lifecycle map

| Resource | Award | Spend / Use | Storage |
|----------|--------|-------------|---------|
| **Serum** | Per rules (e.g. win vs Zombie, weekly bonus) | Use to revive (Zombie→Survivor) or other rule-defined effect | ZombieResourceLedger (type=serum, balance + history) |
| **Weapon** | Per rules (e.g. win vs Zombie, weekly bonus) | Use for bash/maul/defense per rules | ZombieResourceLedger (type=weapon, balance + history) |
| **Ambush** | Per rules (Whisperer only or awarded) | Whisperer uses vs target; outcome per rules | ZombieResourceLedger (type=ambush) or separate AmbushUse log |
| **Weekly winnings** | From matchup wins / bonuses | N/A (ledger only) | ZombieWeeklyWinnings (per league/week/roster) |

Lifecycle:

1. **Award** — Engine or commish action; increment balance; append ledger line (awarded, reason, week).
2. **Spend** — User or commish action; validate eligibility (e.g. Zombie can use serum to revive); apply effect (status change, matchup modifier); decrement balance; append ledger line (spent, reason, target).
3. **Transfer** — Optional: allow transfer between teams (e.g. trade); if supported, ledger records transfer.
4. **Expiry** — Optional: items expire at season end or after N weeks; engine can zero out or archive.

---

## 6. Universe standings / forum requirements

### 6.1 Dedicated Zombie Universe page

- **Scope:** One page (or section) per ZombieUniverse.
- **URL:** e.g. `/zombie-universe/[universeId]` or under league app with universe context.

### 6.2 Universe standings view

- **Per league:** List leagues in level order (e.g. Gamma 1, Gamma 2, Gamma 3, Beta 1, Beta 2, Alpha 1). For each league:
  - League name, level name.
  - All teams (roster/owner), with:
    - **Status:** Survivor | Zombie | Whisperer.
    - **Total points** (season).
    - **Points per week** (or link to weekly breakdown).
    - **Winnings** (total or per week).
    - **Serum / weapon summary** (counts or link to ledger).
    - **Week killed** (if Zombie).
    - **Killed by** (roster or “Whisperer” / “Zombie”).
    - **Projected next-year level** (from movement engine).
- **Promotion/relegation watch** — Highlight who is in line to move up or down based on current projection.
- **Universe-wide sort/filter** — e.g. by total points, by level, by status; search by owner/team name.

### 6.3 Weekly board updates

- **Pinned weekly universe post** — One post per week (or per “board”) with:
  - Infections this week (who became Zombie, who infected them).
  - Kills (Zombie vs Survivor, etc.).
  - Serums/weapons awarded or used.
  - Movement outlook (who is on the bubble).
- **League-level feed** — Per-league updates (results, infections, winnings).
- **Universe-level feed** — Aggregated or curated universe updates.

### 6.4 Forum / discussion

- **League-level forum** — Existing or new league discussion; only members of that league see it (or as configured).
- **Universe-level forum** — Discussion visible to all members of any league in the universe; pinned posts for weekly board; searchable/filterable.
- **Commissioner/admin channels** — Private channel for commish updates; optional public “announcements” derived from it.

### 6.5 Export / spreadsheet alignment

- **Universe stats export** — Export that mirrors “Zombie Universe Stats Spreadsheet” structure: leagues, levels, owners, status, total points, points per week, winnings, serums, weapons, week killed, killed by, projected level. Format: CSV or XLSX for commissioner use.

---

## 7. Settings matrix

| Setting | Scope | Default | Options / notes |
|---------|--------|---------|------------------|
| Universe name | Universe | — | Text |
| Sport | Universe | NFL | NFL, NBA, MLB, NHL, NCAAB, NCAAF, SOCCER |
| League count | Universe | 6 | Integer |
| Level count | Universe | 3 | Integer (e.g. 3 = Gamma/Beta/Alpha) |
| Level names | Universe | Gamma, Beta, Alpha | Array of strings; order = rank (index 0 = bottom) |
| Leagues per level | Universe | [3,2,1] | Array; length = level count |
| Teams per league | Universe or per league | 20 | Integer |
| Whisperer selection | League | Random | Random, Veteran priority |
| Infection rule: loss to Whisperer | League | Converts Survivor→Zombie | On/off or rule id |
| Infection rule: loss to Zombie | League | Converts Survivor→Zombie | On/off or rule id |
| Revive allowed | League | Yes (serum) | On/off |
| Serum award rule | League | e.g. Win vs Zombie = 1 | Configurable |
| Weapon award rule | League | e.g. Win vs Zombie = 1 | Configurable |
| Ambush per week (Whisperer) | League | 1 | Integer or rule |
| Movement rules: promote | Universe | Top N per level | Configurable |
| Movement rules: relegate | Universe | Bottom N per level | Configurable |
| Tie-breaker for movement | Universe | Total points for, then H2H | Ordered list |
| Roster settings | League | Sport default | From league/sport config |
| Scoring settings | League | Sport default | From league/sport config |
| Draft type | League | Snake | Snake, linear, auction, slow draft |
| Waiver mode | League | No-waiver / FCFS | Per platform |
| Lineup lock | League | Sport default | Per sport |
| Stat correction reversal | League | Off | On/off; if on, re-run infection for corrected week |
| Universe visibility | Universe | All league members | Public / members only |
| Veteran priority rule | Universe | Off | On + definition of “veteran” |

---

## 8. Implementation order

Recommended order so that dependencies are respected and each deliverable is testable.

| Phase | Deliverable | Notes |
|-------|-------------|--------|
| **1** | **Data model and config** | Prisma (or equivalent): ZombieUniverse, ZombieUniverseLevel, ZombieLeague, ZombieLeagueTeam, ZombieResourceLedger, ZombieWeeklyWinnings, ZombieInfectionLog, ZombieMovementProjection. Config load/save for universe and league. Sport = NFL first; schema sport-agnostic. |
| **2** | **Universe and league CRUD** | Create/edit universe, levels, leagues; link to existing League (leagueVariant=zombie). Commissioner-only. |
| **3** | **Whisperer selection and draft** | Post-draft (or pre-draft) Whisperer selection (random/veteran). Draft order and startup draft reuse existing draft engine; zombie-specific draft settings in config. |
| **4** | **Status engine** | ZombieLeagueTeam status (Survivor/Zombie/Whisperer). Infection resolution job: read matchup results → apply rules → update status + InfectionLog. Revive (serum) if supported. |
| **5** | **Resources (serums, weapons, ambush)** | Ledger model; award by rules; spend/use API with validation. Ambush use: Whisperer targets; outcome per rules. |
| **6** | **Weekly winnings** | Compute from matchups + rules; write ZombieWeeklyWinnings. Expose in API and standings. |
| **7** | **Universe standings and movement** | Compute standings (totals, points per week, winnings, status, week killed, killed by). Movement engine: project next-year level; at season end, apply promotion/relegation. |
| **8** | **Universe standings page** | Dedicated page: list leagues/levels, table of teams with all required columns, promotion/relegation watch, filter/sort. |
| **9** | **League and universe update feeds** | League update feed (per league); universe weekly board (pinned post or feed). Optional: AI narrative for board copy. |
| **10** | **Forum and channels** | League-level forum; universe-level forum; pinned weekly posts; commissioner channels. |
| **11** | **Free agency and lineup** | No-waiver/FCFS if configured; lineup lock; during-game adds if supported. Anti-abuse: logging and visibility only in v1. |
| **12** | **Export and settings UI** | Universe stats export (CSV/XLSX). Settings matrix UI for universe and league config. |
| **13** | **AI (optional)** | AI host weekly board tone; strategy advice (gated); commissioner summary (gated). Deterministic context only. |
| **14** | **QA and factory** | QA harness for Zombie; register in specialty-league registry; automation-ai-policy entries. |

---

## Summary

- **Rules spec** — Universe structure, status types, transitions, resources, draft, free agency, chat/feed (Section 1).
- **Universe architecture** — Entities, link to League/Roster, data flow, multi-tenancy (Section 2).
- **Automated vs AI** — All game state automated; AI only for narrative and advice (Section 3).
- **Weekly workflow** — From lineup lock through matchup finalize, infection, resources, winnings, standings, feeds (Section 4).
- **Item lifecycle** — Serums, weapons, ambush: award, spend, ledger (Section 5).
- **Universe standings/forum** — Page, table columns, weekly board, league/universe forum, export (Section 6).
- **Settings matrix** — Universe and league settings with defaults and options (Section 7).
- **Implementation order** — 14 phases from data model through QA and factory (Section 8).

No code implementation in this document; use this spec to drive implementation in a follow-up prompt.
