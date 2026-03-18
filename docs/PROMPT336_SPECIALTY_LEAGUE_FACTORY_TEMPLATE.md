# PROMPT 336 — Specialty League Factory Template Checklist

Use this checklist to add the **next** specialty league type (Survivor, Big Brother, Salary Cap, Devy, Merged Devy, Tournament, Best Ball, IDP, Zombie, Keeper) after the factory is in place.

**Do not start the next league type in this task** — only the template and this checklist are delivered.

---

## 1. Wizard & creation

- [ ] **Wizard type** — Ensure `LeagueTypeId` in `lib/league-creation-wizard/types.ts` includes the new type (e.g. `survivor`); add to `LEAGUE_TYPE_IDS` and `LEAGUE_TYPE_LABELS` in `league-type-registry.ts`.
- [ ] **Sport allowlist** — Update `getAllowedLeagueTypesForSport()` if the type is sport-specific (e.g. Devy/C2C for NFL/NCAAF).
- [ ] **League create** — In `app/api/league/create/route.ts`: when `leagueType` or `leagueVariant` matches the new type, set `leagueVariant`, `avatarUrl` (from spec or constants), and call `bootstrapSpecialtyConfig(leagueId, spec)` from `lib/specialty-league/league-create.ts` (or keep inline like Guillotine: detect by string, then `upsertXxxConfig(leagueId, {})`).

---

## 2. Specialty league config (sport-aware)

- [ ] **Prisma** — Add config model(s) if needed (e.g. `SurvivorLeagueConfig`), 1:1 with League; add any state/event tables (e.g. event log, roster state).
- [ ] **Config loader** — In `lib/<type>/`: implement `getXxxConfig(leagueId)` returning typed config or null; use sport from League and `lib/sport-scope.ts` for defaults (e.g. end week by sport).
- [ ] **Config upsert** — Implement `upsertXxxConfig(leagueId, input)` for create and commissioner edits.
- [ ] **Detection** — Implement `isXxxLeague(leagueId)` (config row or `League.leagueVariant === '<variant>'`).

---

## 3. League home theming & intro

- [ ] **Assets** — Add constants or env for league image, first-entry video, intro video (see `lib/guillotine/constants.ts`).
- [ ] **First-entry modal** — Component that shows once per league (e.g. localStorage key); optional.
- [ ] **Post-draft intro** — Optional; can be same as first-entry or separate asset.
- [ ] **App league page** — Fetch `leagueVariant` from `/api/leagues/[leagueId]`; if variant matches specialty, show first-entry modal and pass variant/flag so Overview can render specialty home.
- [ ] **Overview tab** — Ensure Overview receives specialty flag (e.g. `isGuillotine` or `leagueVariant`) and renders the specialty home component when set (e.g. `<SurvivorHome leagueId={leagueId} />` instead of default overview).

---

## 4. Automation engine

- [ ] **Week/period evaluator** — Logic to determine who is eliminated / who advances (league-specific).
- [ ] **Tiebreak** — If applicable; resolve ties per config (e.g. season points, draft slot, commissioner).
- [ ] **Roster release / state** — Mark rosters as eliminated, release players to waivers per timing config.
- [ ] **Event log** — Append-only log for chops, overrides, recap events; query for history and AI context.
- [ ] **Cron/hook** — Wire automation to run after lock (e.g. weekly job that calls the engine for each league of this type).

---

## 5. Summary API & home UI

- [ ] **Summary route** — `GET /api/leagues/[leagueId]/<type>/summary` (e.g. standings, danger tiers, recent events); return 404 if not this specialty.
- [ ] **Specialty home component** — Replace Overview tab content: survival board, history, waiver link, AI panel if any; use summary API.

---

## 6. AI extension points (optional)

- [ ] **Deterministic context** — Build context from engine only (no LLM): standings, danger, config, recent events. See `lib/guillotine/ai/GuillotineAIContext.ts`.
- [ ] **Prompts** — Build system + user prompts from context; sport-aware. See `lib/guillotine/ai/GuillotineAIPrompts.ts`.
- [ ] **Service** — Call LLM with context + prompt; return explanation/strategy. See `lib/guillotine/ai/GuillotineAIService.ts`.
- [ ] **Route** — `POST /api/leagues/[leagueId]/<type>/ai` with type (e.g. draft, survival, waiver); gate by entitlement (e.g. `guillotine_ai`).
- [ ] **Panel** — UI component that fetches summary + calls AI route; show in specialty home.

---

## 7. Standings / ranking variant

- [ ] **Standings** — Custom standings shape if needed (e.g. survival order, eliminated list); expose via summary or dedicated standings endpoint.
- [ ] **Standings tab** — Use default standings tab or replace with specialty standings component if required.

---

## 8. Commissioner controls

- [ ] **Overrides** — Any commissioner-only actions (e.g. manual eliminate, save from chop); implement in engine and expose via Commissioner tab or API.
- [ ] **Config edit** — Commissioner can edit specialty config (tiebreakers, timing, etc.); use upsert and validation.

---

## 9. Guards (waiver / roster)

- [ ] **Roster guard** — Function `(leagueId, rosterId) => canAct` (e.g. chopped/eliminated rosters cannot act).
- [ ] **Waiver claim** — Before accepting claim, check guard or `getExcludedRosterIds(leagueId)`; reject if roster is excluded.
- [ ] **Roster save / lineup** — Same guard so eliminated rosters cannot change lineup or add/drop.

---

## 10. Registry & QA

- [ ] **Register spec** — In `lib/specialty-league/registry.ts`, register the new type: detect, getConfig, upsertConfig, assets, firstEntryModal, homeComponent, summaryRoutePath, aiRoutePath (if any), rosterGuard, getExcludedRosterIds, commissionerActions (if any).
- [ ] **QA** — Create league from wizard with new league type; confirm config row, variant, avatar; open league home and confirm specialty overview and first-entry modal; run automation (or manual trigger) and confirm elimination + guard (waiver/roster blocked for eliminated roster); test AI and commissioner overrides if applicable.

---

## 11. QA test harness

- [ ] **League create** — Create league from wizard with new league type; assert `League.leagueVariant` and `League.avatarUrl`; assert specialty config row exists.
- [ ] **Detection** — `spec.detect(leagueId)` returns true; for another league id returns false.
- [ ] **Summary API** — GET summary returns 200 with expected shape; GET for non-specialty league returns 404.
- [ ] **Guard** — For an eliminated/chopped roster, waiver claim and roster save return 403 or validation error; for active roster they succeed (or pass guard).
- [ ] **Home UI** — League home shows specialty Overview (and first-entry modal once); non-specialty league shows default Overview.
- [ ] **AI** — If applicable: POST to AI route with valid context returns explanation; entitlement gate applied.
- [ ] **Commissioner** — If applicable: override action succeeds for commissioner; non-commissioner gets 403.

---

## Target league types (for later)

- Survivor  
- Big Brother  
- Salary Cap  
- Devy  
- Merged Devy  
- Tournament  
- Best Ball  
- IDP  
- Zombie  
- Keeper  

Use **lib/sport-scope.ts** for all sport-aware behavior (NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER).
