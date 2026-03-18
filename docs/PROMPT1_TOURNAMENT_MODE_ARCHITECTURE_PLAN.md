# CURSOR PROMPT 1 OF 6 — Tournament Mode: Implementation Plan & Architecture

**No code in this chunk.** Inspect repo → plan only.

---

## 1. Implementation Plan

### 1.1 Scope

- **Tournament Mode** = multi-league elimination ecosystem: one tournament creation generates multiple leagues; users advance through rounds; surviving users redraft into fewer leagues until one championship league crowns the winner.
- **NFL first**; draft types: Snake, Linear, Auction. Trades disabled. Waivers default FAAB, configurable. Playoffs replaced by multi-stage elimination and redrafts.
- **Black vs Gold** (and future variants): two conferences → feeder leagues → qualification (e.g. Weeks 1–9) → advancement by deterministic standings/tiebreakers → redraft (e.g. Week 10) → elimination progression (e.g. Weeks 11–17) → Elite Eight redraft → final championship.

### 1.2 Phased Approach

| Phase | Focus | Deliverables |
|-------|--------|--------------|
| **1 – Foundation** | Data model, tournament entity, multi-league creation, specialty registration | Tournament + TournamentLeague (or link) schema; create-tournament API that creates N League rows + bootstrap; register `tournament` in specialty registry; detect by leagueVariant or tournament membership. |
| **2 – Conferences & Leagues** | Conferences, naming (manual/AI), commissioner access | Conference entity; league naming (manual list or AI-generated); set League.userId = tournament creator for all generated leagues so commissioner has access; invite/join flow per league (reuse existing). |
| **3 – Qualification & Advancement** | Standings, tiebreakers, advancement rules | Per-league standings (reuse StandingsTiebreakerResolver, league standings pipeline); tournament-level “qualification round” config (weeks, top X per league/conference); deterministic advancement list; no playoffs for tournament leagues (config or variant override). |
| **4 – Redraft & Condensing** | Trigger redraft, form new leagues from advancers | Redraft trigger (manual or by schedule); form new leagues from advancing rosters; assign users to new leagues; create DraftSession; optional FAAB reset (LeagueWaiverSettings update or tournament-specific FAAB reset). |
| **5 – Universal Page & Forum** | One place for standings, bracket, announcements | Tournament hub page: standings (aggregated + per-round), bracket view, round history, announcements; tournament-level announcements (round start/end, league disband, redraft); Excel/standings export. |
| **6 – Black vs Gold & Polish** | Theming, roster/bench rules, QA | Conference theming (Black vs Gold); 7 bench regular season, 2 bench tournament rounds; no IR; randomized draft order each draft; no pick trading; tiebreakers: wins then points for; QA and edge-case handling. |

### 1.3 Deterministic-First, AI-Second

- Advancement, standings, tiebreakers, who redrafts where = **100% deterministic** (engine + config).
- AI only: league naming (optional), narrative/announcements, explanations. No AI-decided advancement or seeding.

---

## 2. Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TOURNAMENT MODE (NFL first)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Tournament (new entity)                                                     │
│    ├── id, name, sport, season, variant (e.g. "black_vs_gold")               │
│    ├── creatorId (userId) → commissioner of all child leagues               │
│    ├── config: qualificationWeeks, advancementPerLeague, redraftWeeks, etc.   │
│    └── Conferences (new or JSON)                                             │
│          └── Conference: id, name, theme (black|gold), order                │
│                └── TournamentLeague (join): leagueId, conferenceId, round,   │
│                      orderInConference, phase (qualification|elimination|     │
│                      elite_eight|championship)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  League (existing)                                                           │
│    ├── leagueVariant = "tournament" (or keep null and rely on TournamentLeague)│
│    ├── userId = tournament.creatorId → commissioner                         │
│    ├── settings: roster (7 bench qual, 2 bench elim), no IR, no trades       │
│    └── Playoff config: disabled or overridden for tournament                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Creation flow                                                               │
│    POST /api/tournament/create                                               │
│      → Create Tournament + Conferences                                       │
│      → For each (conference × leagues per conference):                       │
│           Create League (name from manual list or AI), League.userId = creator│
│           runPostCreateInitialization(leagueId, sport, "tournament")         │
│           Create TournamentLeague(leagueId, tournamentId, conferenceId, round)│
│      → Return tournamentId + leagueIds + invite links                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Advancement flow                                                            │
│    TournamentAdvancementService (new)                                        │
│      → Input: tournamentId, round/phase end                                   │
│      → Per league in phase: get standings (wins, then points for)             │
│      → Select top N per league (or per conference)                           │
│      → Output: list of (rosterId, platformUserId) that advance               │
│    Redraft orchestration (new)                                               │
│      → Create new League(s) for next phase                                   │
│      → Create Roster per advancing user (empty playerData)                    │
│      → Create DraftSession; slotOrder = randomized                           │
│      → Optional: FAAB reset for new leagues                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Universal page                                                              │
│    /app/tournament/[tournamentId] (or /tournament/[id])                      │
│      → Standings (aggregated + by conference + by league)                     │
│      → Bracket (round → leagues → advancers)                                  │
│      → Round history, announcements                                          │
│      → Links to each league (commissioner invite links)                      │
│    Tournament announcements: dispatch to all users in tournament             │
│      (NotificationDispatcher + league chat per league or tournament feed)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Integration Points

| System | Use |
|--------|-----|
| **Specialty league registry** | Register `tournament`; detect via TournamentLeague membership or leagueVariant; homeComponent = TournamentLeagueHome (or redirect to tournament hub when league is in a tournament). |
| **League create / bootstrap** | Single-league create unchanged. New: tournament create loop that creates many League rows and runs runLeagueBootstrap for each (variant `tournament`). |
| **Commissioner** | League.userId = tournament creator → existing assertCommissioner(leagueId, userId) gives creator access to every tournament league. |
| **Standings** | Existing standings pipeline per league; tournament layer consumes “standings for league X” and applies advancement rules. |
| **Draft** | Existing DraftSession, draft pool, live draft engine; new DraftSession created per redraft; draft order randomized (slotOrder shuffle). |
| **Waiver / FAAB** | LeagueWaiverSettings per league; FAAB reset = update faabBudget / faabRemaining for new phase leagues (or new LeagueWaiverSettings). Trades disabled via league settings or roster guard. |
| **Playoffs** | Tournament leagues: playoff config disabled or bracket_type = none; advancement is tournament-engine, not playoff bracket. |
| **Chat / announcements** | Per-league: existing LeagueChatMessageService; tournament-wide: new tournament feed or broadcast to all league chats via CommissionerAnnouncementService / NotificationDispatcher. |

---

## 3. Reusable Files / Modules to Extend

| Area | Existing module | How to reuse |
|------|------------------|--------------|
| **Specialty registration** | `lib/specialty-league/registry.ts`, `types.ts` | Add `registerTournament()`; id `tournament`, leagueVariant `tournament`; detect = “league is linked in TournamentLeague” or League.leagueVariant === 'tournament'. |
| **League creation** | `app/api/league/create/route.ts` | Do not change. Add `app/api/tournament/create/route.ts` that creates Tournament + Conferences + N League rows (same shape as create) + runPostCreateInitialization for each. |
| **Post-create bootstrap** | `lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator.ts`, `LeagueCreationInitializationService.ts`, `LeagueBootstrapOrchestrator` | Call runLeagueBootstrap(leagueId, sport, 'tournament') for each new league; add sport-defaults for variant `tournament` (roster 7 bench, no IR, etc.). |
| **Elimination / advancement** | `lib/guillotine/GuillotineEliminationEngine.ts`, `GuillotineWeekEvaluator`, `GuillotineTiebreakResolver` | Pattern only: evaluate period → apply tiebreakers → get list of “winners” (here, advancers). New TournamentAdvancementService that uses standings (wins, points for) and returns advancing rosterIds/users. |
| **Standings / tiebreakers** | `lib/playoff-defaults/StandingsTiebreakerResolver.ts`, `getStandingsTiebreakersForLeague` | Use for per-league tiebreakers; tournament config specifies “top N per league” and tiebreaker order (e.g. wins, then points for). |
| **Draft bootstrap** | `lib/draft-defaults/LeagueDraftBootstrapService.ts` | Already run in runLeagueBootstrap; for redraft leagues ensure draft_rounds and draft_type from tournament config; randomized order in DraftSession.slotOrder when creating session. |
| **Waiver / FAAB** | `lib/waiver-defaults/LeagueWaiverBootstrapService.ts`, `lib/waiver-defaults/FAABConfigResolver.ts` | Tournament leagues get FAAB from bootstrap; “FAAB reset” for new phase = set LeagueWaiverSettings.faabBudget and Roster.faabRemaining for new leagues (or bulk update). |
| **Commissioner / invite** | `lib/commissioner/permissions.ts`, `app/api/commissioner/leagues/[leagueId]/invite/route.ts` | No change. Creator is League.userId for every tournament league → gets invite link per league. |
| **League chat** | `lib/league-chat/LeagueChatMessageService.ts`, `lib/league-chat/LeagueChatService.ts` | Post round/redraft announcements per league (createLeagueChatMessage) or use CommissionerAnnouncementService. |
| **Announcements / notifications** | `lib/notifications/NotificationDispatcher.ts`, `lib/commissioner-settings/CommissionerAnnouncementService.ts` | Tournament-level: resolve all userIds in tournament and dispatch (e.g. round_start, redraft_ready, league_disband). |
| **Sport defaults** | `lib/sport-defaults/SportDefaultsRegistry.ts`, `LeagueDefaultSettingsService`, `LeagueCreationInitializer` | Add variant `tournament` (NFL): roster 7 bench qual / 2 bench elim from config, no IR, no trades; playoff disabled. |
| **Roster config** | `lib/multi-sport/MultiSportLeagueService.ts`, RosterTemplate | Tournament-specific template or overrides: 7 bench (qualification), 2 bench (elimination); no IR. |

---

## 4. Likely New Files

| Path | Purpose |
|------|---------|
| **Schema (Prisma)** | |
| `prisma/schema.prisma` (additions) | Tournament, TournamentConference, TournamentLeague models; optional TournamentRound, TournamentAnnouncement. |
| **Backend – config & detection** | |
| `lib/tournament-mode/TournamentConfig.ts` | Load/upsert tournament config (qualification weeks, advancement counts, redraft weeks, variant). |
| `lib/tournament-mode/TournamentLeagueConfig.ts` | Per-league tournament settings (phase, conference, round); or embed in TournamentLeague. |
| **Backend – creation** | |
| `lib/tournament-mode/TournamentCreationService.ts` | Create Tournament + Conferences + N Leagues + TournamentLeague links; call runLeagueBootstrap; return leagueIds + invite links. |
| **Backend – advancement** | |
| `lib/tournament-mode/TournamentStandingsService.ts` | Per-league standings for a given week/phase (wins, points for); tiebreaker order from config. |
| `lib/tournament-mode/TournamentAdvancementService.ts` | Given phase end: compute advancers per league (top N, tiebreakers); return list of (rosterId, platformUserId) per advancing user. |
| **Backend – redraft** | |
| `lib/tournament-mode/TournamentRedraftService.ts` | Create new League(s) for next phase; create Rosters for advancing users; create DraftSession with randomized slotOrder; optional FAAB reset. |
| **Backend – roster/settings overrides** | |
| `lib/tournament-mode/TournamentRosterRules.ts` | Bench size by phase (7 qual, 2 elim); no IR; used by roster validation and lineup rules. |
| **API routes** | |
| `app/api/tournament/create/route.ts` | POST: create tournament + leagues; body: name, sport, conferences, leaguesPerConference, naming (manual names or “ai”), etc. |
| `app/api/tournament/[tournamentId]/route.ts` | GET: tournament + conferences + leagues + current phase. |
| `app/api/tournament/[tournamentId]/standings/route.ts` | GET: universal standings (aggregated + by league). |
| `app/api/tournament/[tournamentId]/advancement/route.ts` | POST (commissioner): run advancement for a phase; return advancers (preview or execute). |
| `app/api/tournament/[tournamentId]/redraft/route.ts` | POST (commissioner): create next-phase leagues and redraft session(s). |
| `app/api/tournament/[tournamentId]/announcements/route.ts` | GET list; POST (commissioner) create tournament-wide announcement. |
| `app/api/tournament/[tournamentId]/export/route.ts` | GET: standings/bracket export (CSV/Excel). |
| **Frontend** | |
| `app/app/tournament/[tournamentId]/page.tsx` or `app/tournament/[tournamentId]/page.tsx` | Universal tournament page: standings, bracket, round history, announcements, links to leagues. |
| `components/tournament-mode/TournamentHome.tsx` | Optional: when viewing a league that belongs to a tournament, show tournament context + link to hub. |
| `components/tournament-mode/TournamentCreationWizard.tsx` | Multi-step: conferences, league count, naming, then create. |
| `components/tournament-mode/StandingsBracketView.tsx` | Bracket + standings combined view. |
| `components/tournament-mode/ConferenceCard.tsx` | Conference theme (Black vs Gold) and list of leagues. |
| **Specialty registration** | |
| `lib/tournament-mode/index.ts` | Exports; register tournament in registry (in registry.ts or side-effect import). |

---

## 5. Risks / Edge Cases

| Risk | Mitigation |
|------|------------|
| **Multiple leagues created in one request** | Run creation in a transaction where possible; if partial failure, mark tournament as “draft” and allow retry or manual cleanup; consider background job to create leagues with idempotency keys. |
| **User in multiple feeder leagues** | Product may allow same user in multiple leagues (different rosters). Advancement: one roster per user per league; advancement list is by (leagueId, rosterId) or (leagueId, userId). Define clearly: “top N rosters per league” vs “top N users per league.” |
| **Tiebreakers at cut line** | Use StandingsTiebreakerResolver; document order (e.g. wins → points for). Commissioner override option for rare manual resolution. |
| **Redraft timing** | Redraft trigger: manual (commissioner) or scheduled (cron). If scheduled, ensure week/period is locked and standings final before running advancement. |
| **FAAB reset** | New leagues for new phase: set LeagueWaiverSettings and Roster.faabRemaining at creation. Existing “reset” logic may need extension for tournament phase. |
| **Trades disabled** | Enforce at API: reject trade routes when league is in tournament (detect via TournamentLeague or leagueVariant). Roster guard or trade-eligibility check. |
| **Playoffs disabled** | Tournament leagues: playoff_team_count = 0 or bracket_type = none in config so standard playoff UI doesn’t run; advancement is tournament-engine only. |
| **Commissioner access** | All generated leagues have same userId (creator). No shared “tournament commissioner” table unless product asks for multiple commissioners later. |
| **Excel / export** | Standings and bracket export: use existing CSV/Excel patterns elsewhere in app; new route returns tournament standings + bracket structure. |
| **AI league naming** | Optional: call naming API (or internal AI) with conference/theme and round to generate league names; store and use as League.name. Rate-limit and fallback to “Conference A League 1” if AI fails. |

---

## 6. Migration Strategy

- **Schema:** Add Tournament, TournamentConference, TournamentLeague (and optional tables) via new migration. No changes to League primary key or core fields; League.userId and League.leagueVariant (or only TournamentLeague) link to tournament.
- **Existing leagues:** Unaffected. Tournament Mode is additive; detection is “league appears in TournamentLeague” or leagueVariant = 'tournament'.
- **Sport defaults:** Add `tournament` variant in sport-defaults (NFL first); ensure getDraftDefaults, getWaiverDefaults, getStandingsTiebreakers, roster templates support variant so runLeagueBootstrap applies correct settings.
- **Feature flag / rollout:** Optional: feature flag for “tournament creation” so only certain users or envs can create tournaments until QA is complete.

---

## 7. QA Plan

| # | Area | Checks |
|---|------|--------|
| 1 | **Tournament creation** | Create tournament with 2 conferences, 4 leagues total; all 4 League rows exist; creator is commissioner of all; invite links work; names (manual or AI) correct. |
| 2 | **Bootstrap** | Each league has roster config (7 bench), waiver (FAAB), draft config, no playoffs; trades disabled. |
| 3 | **Standings** | Per-league standings correct (wins, points for); tiebreaker order applied. |
| 4 | **Advancement** | Run advancement for qualification phase; top N per league returned; no duplicate users if same user in multiple leagues handled per spec. |
| 5 | **Redraft** | New leagues created; advancing users have roster in new league; DraftSession created with randomized order; FAAB reset in new leagues. |
| 6 | **Universal page** | Tournament hub shows standings, bracket, round history, announcements; links to each league; mobile layout. |
| 7 | **Announcements** | Round start/end and redraft announcements reach all tournament users (in-app or email per notification prefs). |
| 8 | **Regression** | Existing league create, guillotine, survivor, devy, C2C unchanged; commissioner invite for non-tournament leagues unchanged. |
| 9 | **Black vs Gold** | Conference theming; 7 bench → 2 bench at phase change; no IR; randomized draft order; no pick trading. |

---

## 8. Summary

- **Reuse:** Specialty registry, league bootstrap, standings/tiebreakers, draft/waiver/commissioner/invite, league chat, notifications. **New:** Tournament + Conference + TournamentLeague model, TournamentCreationService, TournamentAdvancementService, TournamentRedraftService, tournament API routes, universal tournament page, and tournament-specific roster/draft/playoff overrides.
- **Deterministic first:** All advancement and seeding from standings and config; AI only for naming and narrative.
- **No code in this chunk;** next prompts implement schema, services, routes, and UI per this plan.
