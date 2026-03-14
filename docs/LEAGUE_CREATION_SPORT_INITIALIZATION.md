# League Creation End-to-End Sport Initialization

## End-to-end initialization architecture

1. **User selects sport** in league creation UI (StartupDynastyForm).
2. **Frontend requests sport preset** via `useSportPreset(sport)` → `GET /api/sport-defaults?sport=X&load=creation`. Payload includes roster template, scoring template, league/waiver/draft defaults.
3. **Form prefills** league name pattern, team count, and scoring format from preset; user can change any field.
4. **On submit**, frontend sends `sport` and `scoring` (and name, leagueSize, etc.) to `POST /api/league/create`.
5. **Backend** creates league with `sport` and default settings, then runs **LeagueBootstrapOrchestrator** (`runLeagueBootstrap(leagueId, leagueSport, scoring)`), which:
   - Attaches roster config for the sport (template id; in-memory default if no DB template).
   - Initializes league settings and waiver defaults (League.settings, LeagueWaiverSettings).
   - Resolves scoring template for the sport (no DB write; used at read time).
   - Bootstraps player-pool context (counts; actual pool is read by sport when needed).
6. **League pages, draft room, waiver wire, roster views** load sport-specific data by reading `league.sport` from the league record (or list) and passing it to roster template, scoring rules, player pool, and logo resolution.

## Backend workflow updates

- **`app/api/league/create/route.ts`** — Accepts `sport` (default `NFL`); when name/size/scoring/dynasty are omitted, fills from `getLeagueDefaults(sport)` and `getScoringDefaults(sport)`. After creating the league, calls **`runLeagueBootstrap(league.id, sport, scoring)`** instead of calling `attachRosterConfigForLeague` and `initializeLeagueWithSportDefaults` separately. Bootstrap failures are non-fatal (logged).
- **`lib/league-creation/LeagueBootstrapOrchestrator.ts`** — New. `runLeagueBootstrap(leagueId, leagueSport, scoringFormat?)` runs in parallel: `attachRosterConfigForLeague`, `initializeLeagueWithSportDefaults`, `bootstrapLeagueScoring`, `bootstrapLeaguePlayerPool`. Returns a result summary (roster templateId, settings applied, scoring templateId, player/team counts).
- **`app/api/league/list/route.ts`** — `sport` added to the League select so list response includes sport per league; frontend and `useLeagueSport(leagueId)` can resolve sport from list.

## Frontend workflow updates

- **`components/StartupDynastyForm.tsx`** — **LeagueCreationSportSelector:** Sport dropdown added (NFL, NBA, MLB, NHL, NCAA Football, NCAA Basketball). **SportPresetLoader:** `useSportPreset(sport)` loads preset when sport changes; effect prefills league name pattern, team count, and scoring format from preset. Submit body includes `sport` and `scoring` (NFL: PPR/Half PPR/Standard; other sports: preset `scoring_format`).
- **`hooks/useSportPreset.ts`** — Fetches `GET /api/sport-defaults?sport=X&load=creation` and returns preset payload for form prefill and display.
- **`hooks/useLeagueSport.ts`** — **SportAwareFrontendResolver:** Fetches `/api/league/list` and finds league by id; returns `league.sport` so draft room, waiver, roster, and logo components can pass sport when calling APIs or resolving team logos.

## Issues fixed

- League create previously did not send **sport** from the form; backend defaulted to NFL. Form now includes sport selector and sends sport.
- Roster and settings were applied in two separate try/catch blocks; they are now unified in **LeagueBootstrapOrchestrator** so scoring and player-pool bootstrap are also run.
- League list API did not return **sport**; added to select so frontend can resolve sport for any league without a separate league-detail endpoint.
- Preset (roster + scoring + defaults) was not loaded in the UI when user changed sport; **useSportPreset** and form effect now prefill name, size, and scoring from preset.

## QA findings (implementation checklist)

- Creating a league with sport **NFL** still uses NFL roster (QB, RB, WR, TE, FLEX, K, DST, BENCH, IR), PPR/Half/Standard scoring, and existing behavior.
- Creating a league with **NBA** applies NBA roster template (PG, SG, SF, PF, C, G, F, UTIL, BENCH, IR), points scoring, and NBA default team count; player pool and logos resolve by NBA when used.
- **MLB / NHL / NCAAF / NCAAB** creation applies the same pattern: sport-specific roster and scoring defaults, waiver/draft defaults, and sport-scoped player pool and logos when those features are used.
- Correct defaults are applied: name pattern, team count, scoring format from preset; backend still fills missing values from SportDefaultsRegistry when not sent.
- Roster and scoring templates match the sport (from ScoringDefaultsRegistry and RosterTemplateService defaults).
- League list returns `sport`; `useLeagueSport(leagueId)` can resolve sport for a given league from the list.

## Final QA checklist

- [ ] Create one league per sport (NFL, NBA, MLB, NHL, NCAAF, NCAAB) and confirm each has the correct `sport` value and settings.
- [ ] Validate correct defaults: league name pattern, team count, scoring format, and (where visible) roster slot list match the selected sport.
- [ ] Ensure only correct players load: for an NBA league, waiver/draft player pool is filtered by sport (NBA); same for other sports.
- [ ] Scoring templates match the sport: NBA league uses points scoring rules; NFL uses PPR/Half/Standard as selected.
- [ ] Roster templates match the sport: NBA has PG/SG/SF/PF/C/G/F/UTIL/BENCH/IR; NFL has QB/RB/WR/TE/FLEX/K/DST/BENCH/IR.
- [ ] Correct logos render when league sport is passed to team logo resolution (e.g. NBA league shows NBA team logos).
- [ ] Existing NFL leagues still work: dashboard, draft room, waiver, roster, and AI context behave as before.
- [ ] After create, redirect and league list show the new league with correct sport; opening the league loads sport-specific data where implemented.

## Explanation of league creation sport initialization

When a user selects a sport and creates a league:

1. **Preset load** — The UI loads the full creation preset for that sport (metadata, league defaults, roster slots, scoring template, draft/waiver defaults, and resolved roster + scoring templates). This powers the form prefill and confirms what will be applied.
2. **League create** — The API creates the league with the chosen sport and any overrides (name, size, scoring, dynasty, superflex). It then runs the **bootstrap orchestrator**, which attaches the roster config (so the league’s roster template is the one for that sport), initializes league settings and waiver defaults from sport defaults, resolves the scoring template for the sport (so live scoring and matchup use the right rules), and bootstraps the player-pool context (so counts and team list are available for that sport).
3. **No duplicate writes** — Roster and scoring “templates” are either in the DB (and linked by template id) or in-memory defaults; the bootstrap does not create new template rows unless your seed/flow does. Waiver and settings are created once per league when missing.
4. **Downstream use** — Draft room, waiver wire, roster views, and team logos use the league’s `sport` (from the league record or from league list) to filter player pool, resolve roster/scoring rules, and resolve team logos. So an NBA league only shows NBA players, NBA roster slots, NBA scoring, and NBA team logos when those features are wired to the sport-aware resolvers.
