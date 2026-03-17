# PROMPT 213 — League Creation QA Click Audit

Full click audit checklist for the league creation flow. Use this to verify all wizard steps, persistence, validation, success path, and responsive behavior.

---

## 1. All wizard steps work

| Step | Location | What to verify |
|------|----------|----------------|
| **1. Sport** | `LeagueCreationWizard` → `SportSelector` | Select NFL, NBA, MLB, NHL, NCAAF, NCAAB, SOCCER. "Next" advances to League type. No Back (first step). |
| **2. League type** | `LeagueTypeSelector` | Options respect sport (e.g. NFL: Redraft, Dynasty, Keeper, …). Change type; Draft type options update. Back → Sport; Next → Draft type. |
| **3. Draft type** | `DraftTypeSelector` | Snake, Linear, Auction, etc. per league type. Back → League type; Next → Team setup. |
| **4. Team setup** | `TeamSizeSelector` | Name, team count, roster size. Changes update state. Back / Next. |
| **5. Scoring** | `ScoringPresetSelector` | Presets per sport (e.g. PPR, Standard). Back / Next. |
| **6. Draft settings** | `DraftSettingsPanel` | Rounds, timer, auction budget (if auction), keeper max (if keeper). Back / Next. |
| **7. AI settings** | `AISettingsPanel` | AI ADP, Orphan AI manager, Draft helper toggles. Back / Next. |
| **8. Automation** | `AutomationSettingsPanel` | Draft notifications, Autopick from queue, Slow draft reminders. Back / Next. |
| **9. Privacy** | `LeaguePrivacyPanel` | Visibility, Allow invite link. Back / Next. |
| **10. Review** | `LeagueSummaryPanel` | Summary shows sport, league type, draft type, team count, scoring, AI, automation. Back → Privacy. "Create league" submits. "Save as template" (if provided) opens save form. |

**Step order:** `WIZARD_STEP_ORDER` in `lib/league-creation-wizard/types.ts` — ensure Back goes to previous step and Next to next (or review from step 9).

---

## 2. Settings persist

- **Create payload** (`LeagueCreationWizard` `handleCreate`): Sends `name`, `platform: 'manual'`, `sport`, `isDynasty`, `leagueVariant`, `leagueSize` (= teamCount), `scoring`, `league_type`, `draft_type`, and `settings` with:
  - `league_type`, `draft_type`, `draft_rounds`, `draft_timer_seconds`, `auction_budget_per_team`, `keeper_max_keepers`, `devy_rounds`, `c2c_college_rounds`
  - `ai_adp_enabled`, `orphan_team_ai_manager_enabled`, `draft_helper_enabled`
  - `draft_notifications_enabled`, `autopick_from_queue_enabled`, `slow_draft_reminders_enabled`
  - `visibility`, `allow_invite_link`
- **API** (`POST /api/league/create`): Merges wizard `settings` into `initialSettings` and writes to `League.settings`; bootstrap runs (draft, waiver, playoff, schedule).
- **Check:** Create a league, then load league settings (e.g. Draft tab / Settings); confirm draft type, rounds, timer, AI toggles, automation toggles match what you set.

---

## 3. Validation triggers correctly

- **Backend** (`LeagueSettingsValidator`): Runs in `POST /api/league/create` (before create) and in `PATCH /api/leagues/[leagueId]/draft/settings` (before update).
- **Auction:** If `draft_type === 'auction'` and no positive `auction_budget_per_team` → 400, error: "Auction draft requires a positive budget per team…".
- **Devy:** If `league_type === 'devy'` and no non-empty `devy_rounds` (or devyConfig.devyRounds) → 400, "Devy league requires at least one devy round…". Wizard sends default `[1]` when league type is devy and none set.
- **C2C:** If `league_type === 'c2c'` and no non-empty `collegeRounds` → 400, "C2C league requires at least one college round…". Wizard sends default `[1]` when league type is c2c.
- **Check:** (1) Create auction league with budget → succeeds. (2) In draft settings PATCH, set draft type to auction and omit/zero budget → 400. (3) Create devy league → succeeds (default round). (4) Create C2C league → succeeds (default round).

---

## 4. League creation succeeds

- **Happy path:** Fill wizard → Review → "Create league" → `POST /api/league/create` → 200 with `{ league: { id, name, sport } }` → `onSuccess(leagueId)` and `router.push(\`/app/league/${leagueId}\`)`.
- **Error path:** 4xx/5xx → `setError(data.error)` → error message shown above nav; "Create league" re-enabled.
- **Check:** Complete wizard, click Create league; expect redirect to `/app/league/[id]`. Confirm league appears in app league list.

---

## 5. No dead buttons

| Button | Where | Expected behavior |
|--------|--------|-------------------|
| Back | Steps 2–10 | Goes to previous step; disabled while `creating`. |
| Next | Steps 1–9 | Goes to next step. |
| Create league | Review | Calls `handleCreate`; disabled while `creating`. |
| Save as template | Review (if `onSaveAsTemplate` set) | Opens save form; disabled while `savingTemplate`. |
| Save template / Cancel | CreateLeagueView save form | Submit or dismiss. |
| Fetch & Preview | Import flow | Calls preview API. |
| Create League from Import | Import preview | Submits import commit; redirect on success. |
| Try different league ID | Import preview | Clears preview. |
| Start from template (dropdown) | Create flow | Selects template and prefills wizard (wizard remounts with `initialWizardState`). |

Confirm every control has an `onClick`/`onChange` and is not permanently disabled without reason.

---

## 6. Mobile works

- **Touch targets:** Nav and primary actions use `min-h-[44px]` and `touch-manipulation` (WizardStepNav, DraftSettingsPanel, etc.).
- **Layout:** Wizard uses `max-w-lg`, `px-4 py-6`, `p-4 sm:p-5`; content scrolls in constrained area (`min-h-0 flex flex-col`).
- **Check:** Resize to ~375px width (or use device toolbar). Run full wizard: all steps reachable, Back/Next/Create league tappable, no overflow or clipped buttons. Dropdowns (sport, league type, draft type, etc.) open and select on tap.

---

## 7. Desktop works

- **Layout:** Same wizard; `max-w-lg` centers content on large screens.
- **Check:** Full width desktop. Complete wizard with mouse; all selects and buttons respond. Summary readable; Create league and Save as template work.

---

## Quick verification script (manual)

1. **Wizard steps:** From create-league page, click "Build New League", then: Next (sport) → Next → … → through step 9 → Next to Review. Click Back repeatedly to step 1; then advance again to Review.
2. **Persistence:** Set e.g. 14 teams, 90s timer, AI ADP On, Draft notifications Off. Create league. Open league → Settings/Draft; confirm 14 teams, 90s, AI ADP on, notifications off.
3. **Validation:** In draft settings (existing league), try setting draft type to auction and budget to 0 or omitting budget; PATCH should return 400 with validation error.
4. **Success:** Create league with unique name; expect redirect to `/app/league/[id]` and league in list.
5. **Import:** Switch to "Import Existing League", enter valid Sleeper league ID, Fetch & Preview, then Create League from Import; expect redirect to new league.
6. **Templates:** On Review, click Save as template, enter name, Save template; switch template dropdown to "None", then select the saved template; wizard should show prefilled values.
7. **Mobile:** Use Chrome DevTools device mode (e.g. iPhone SE); run steps 1–2 and 4.
8. **Desktop:** Run steps 1–2 and 4 at 1920×1080.

---

## Files reference

- Wizard: `components/league-creation-wizard/LeagueCreationWizard.tsx`, `WizardStepNav.tsx`, `WizardStepContainer.tsx`, step panels in same folder.
- Create page: `app/create-league/page.tsx`, `components/league-creation/CreateLeagueView.tsx`.
- API: `app/api/league/create/route.ts`, `app/api/leagues/import/preview/route.ts`, `app/api/leagues/import/commit/route.ts`.
- Validation: `lib/league-settings-validation/LeagueSettingsValidator.ts`; used in league create and `app/api/leagues/[leagueId]/draft/settings/route.ts`.
