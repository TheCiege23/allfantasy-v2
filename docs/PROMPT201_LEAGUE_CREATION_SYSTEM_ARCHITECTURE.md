# PROMPT 201 — AllFantasy League Creation System Architecture

## Overview

Flexible league creation system supporting all sports, league types, and draft types with a step-by-step wizard. Mobile-first, dynamically relevant options, commissioner settings, AI/automation toggles, and draft variant rules. No invalid combinations; integration with existing draft engines.

---

## 1. Supported Dimensions

### 1.1 Sports (single source of truth: `lib/sport-scope.ts`)

| Sport | Code | Notes |
|-------|------|--------|
| NFL | NFL | Presets: Standard, PPR, Half PPR, Superflex, IDP, Dynasty IDP |
| NHL | NHL | |
| NBA | NBA | |
| MLB | MLB | |
| NCAA Basketball | NCAAB | |
| NCAA Football | NCAAF | |
| Soccer | SOCCER | First-class sport |

### 1.2 League Types

| Type | Id | Schema mapping | Draft relevance |
|------|-----|----------------|-----------------|
| Redraft | redraft | isDynasty: false, settings.league_type | Standard snake/auction |
| Dynasty | dynasty | isDynasty: true, settings.league_type | Keeper/devy/C2C available |
| Keeper | keeper | isDynasty: false, settings.league_type, keeperConfig | Keeper draft engine |
| Best Ball | best_ball | settings.league_type | No waivers (optional) |
| Guillotine | guillotine | settings.league_type | Elimination rules |
| Survivor | survivor | settings.league_type | Elimination rules |
| Tournament | tournament | settings.league_type | Bracket/short season |
| Devy | devy | isDynasty: true, settings.league_type, devyConfig | Devy rounds |
| Campus to Canton (C2C) | c2c | settings.league_type, c2cConfig | College + pro rounds |
| Zombie | zombie | settings.league_type | Special rules |
| Salary Cap | salary_cap | settings.league_type | Auction/cap engine |

League type is stored in `League.settings.league_type` and drives which draft/roster/waiver options are shown. `isDynasty` remains for backward compatibility and is set for dynasty, devy, and optionally keeper.

### 1.3 Draft Types (align with `lib/live-draft-engine`)

| Type | Id | Engine | Notes |
|------|-----|--------|--------|
| Snake | snake | DraftSessionService, DraftOrderService | Default |
| Linear | linear | Same | No reversal |
| Auction | auction | AuctionEngine | Budget, nominate, bid |
| Slow Draft | slow_draft | Timer, queue, DraftSessionService | Per-pick timer |
| Mock Draft | mock_draft | MockDraftSessionService | Separate flow; not “league draft” |

Live league creation uses snake, linear, or auction; slow draft is a timer mode on the same engine. Mock draft is a separate product surface.

---

## 2. Valid Combinations

- **Sport × League type:** All sports support redraft, dynasty; keeper/devy/C2C/best ball/guillotine/survivor/tournament/zombie/salary_cap availability can be restricted per sport (e.g. C2C and Devy primarily NFL/NCAAF).
- **League type × Draft type:**  
  - Redraft/Dynasty: snake, linear, auction, slow_draft.  
  - Keeper: snake, linear, auction, slow_draft (keeper config applied).  
  - Devy/C2C: snake, linear, auction, slow_draft (devy/C2C config applied).  
  - Auction/Salary cap: auction or snake (salary cap often auction).
- **Invalid:** e.g. Guillotine + auction only if product supports it; otherwise restrict in wizard.

Validation lives in `lib/league-creation-wizard/league-type-registry.ts` (`getAllowedDraftTypesForLeagueType`, `getAllowedLeagueTypesForSport`).

---

## 3. LeagueCreationWizard — 10 Steps

| Step | Name | Purpose | Dynamic behavior |
|------|------|---------|------------------|
| 1 | Sport Selection | Choose sport | Uses `SUPPORTED_SPORTS`; drives steps 2–6 options |
| 2 | League Type | Redraft, Dynasty, Keeper, … | Options filtered by sport; sets isDynasty + settings.league_type |
| 3 | Draft Type | Snake, Linear, Auction, Slow | Filtered by league type |
| 4 | Team Setup | League size, roster size | Sport/roster defaults; optional roster size override |
| 5 | Scoring Rules | Preset (PPR, Standard, IDP, …) | Sport + variant from step 2; uses LeagueCreationDefaultsLoader |
| 6 | Draft Settings | Rounds, timer, keeper/devy/C2C/auction | Shown by draft type and league type |
| 7 | AI Settings | AI ADP, orphan AI manager, draft helper | Toggles stored in draft UI settings |
| 8 | Automation | Notifications, autopick, reminders | Draft notification and timer defaults |
| 9 | Privacy / Invitations | Visibility, invite link | League visibility and invite defaults |
| 10 | Review and Create | Preview + submit | One payload to POST /api/league/create (or wizard-specific endpoint) |

Steps 6–9 are “advanced” and can be collapsed or skipped with sensible defaults.

---

## 4. Data Flow

1. **Wizard state:** Single object (sport, leagueType, draftType, teamCount, rosterSize, scoringPreset, draftSettings, aiSettings, automationSettings, privacySettings, name).
2. **Step validation:** Each step can validate before “Next”; step 10 validates full payload.
3. **Create payload:** Wizard builds payload: `{ sport, name, isDynasty, leagueVariant, leagueSize, scoring, platform: 'manual', settings: { league_type, draft_type, draft_rounds, draft_timer_seconds, ai_adp_enabled, orphan_ai_manager_enabled, ... }, ... }`. Draft type and variant (keeper/devy/C2C/auction) are applied after league create via draft config/bootstrap.
4. **Backend:** Existing `POST /api/league/create` extended to accept optional `league_type`, `draft_type`, and nested `settings` (AI, automation, privacy). After league create, `runLeagueInitialization` (or equivalent) runs; draft session is created later when commissioner starts draft, using stored draft_type and variant settings.

---

## 5. Commissioner Permissions

- League creator is commissioner by default (existing behavior).
- Wizard does not enforce roles; it only creates the league. Commissioner-only actions (draft start, undo, import, etc.) remain in draft room and league settings.

---

## 6. Integration with Draft Engines

- **Snake/Linear:** `DraftSessionService`, `DraftOrderService`, `getOrCreateDraftSession` with `draftType: 'snake' | 'linear'`.
- **Auction:** `AuctionEngine`, draft session with `draftType: 'auction'`, auction config in session.
- **Slow draft:** Same engine; timer and queue; `DraftUISettingsResolver` (timer mode, overnight pause).
- **Keeper/Devy/C2C:** Draft session variant config (`keeperConfig`, `devyConfig`, `c2cConfig`) set when commissioner opens draft settings or starts draft; wizard can prefill defaults in `League.settings` so draft bootstrap reads them.

---

## 7. Mobile-First and UX

- One step per screen on small viewports; optional stepper with “Back”/“Next”; progress indicator.
- Touch-friendly controls; minimal required fields per step; “Skip” or “Use default” for advanced steps.
- No invalid combinations: league type and draft type selectors only show allowed options.

---

## 8. File Layout

| Area | Path |
|------|------|
| Types and registry | `lib/league-creation-wizard/types.ts`, `lib/league-creation-wizard/league-type-registry.ts` |
| Wizard container | `components/league-creation-wizard/LeagueCreationWizard.tsx` |
| Step components | `components/league-creation-wizard/steps/Step1Sport.tsx` … `Step10Review.tsx` |
| Page | `app/create-league/page.tsx` |
| Create API | `app/api/league/create/route.ts` (extended) |

---

## 9. QA and Validation

- No invalid sport/league type/draft type combinations.
- Created league has correct `sport`, `isDynasty`, `leagueVariant`, `settings.league_type`, `settings.draft_type` (and related).
- Draft can be started with selected draft type and variant (keeper/devy/C2C/auction) when applicable.
- Commissioner flows unchanged; AI and automation toggles persist and apply in draft room.
