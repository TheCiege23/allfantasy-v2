# PROMPT 202 — League Creation Wizard UI Deliverable

## Overview

Modern step-by-step league creation wizard with clear progress (Step 1 of 10 … Step 10 of 10), named UI components, mobile-first design, and consistent help text.

---

## UI Components Delivered

| Component | Purpose |
|-----------|---------|
| **LeagueCreationWizard** | Main wizard container: state, step navigation, progress, and composition of all panels. |
| **WizardStepContainer** | Wraps each step with consistent layout and progress text ("Step X of 10" + step label). |
| **WizardStepNav** | Back / Next or Back / Create league buttons; error display; touch-friendly (min 44px). |
| **SportSelector** | Sport selection; uses existing LeagueCreationSportSelector; help text for sport choice. |
| **LeagueTypeSelector** | League type (redraft, dynasty, keeper, etc.); options filtered by sport; help text. |
| **DraftTypeSelector** | Draft type (snake, linear, auction, slow draft); options filtered by league type; help text. |
| **TeamSizeSelector** | League name, number of teams, optional roster size; help text per field. |
| **ScoringPresetSelector** | Scoring preset (e.g. Standard, PPR, IDP); help text. |
| **DraftSettingsPanel** | Rounds, timer, auction budget (if auction), max keepers (if keeper); help text. |
| **AISettingsPanel** | AI ADP, orphan AI manager, draft helper toggles; help text per option. |
| **AutomationSettingsPanel** | Draft notifications, autopick from queue, slow draft reminders; help text. |
| **LeaguePrivacyPanel** | Visibility (private/unlisted/public), allow invite link; help text. |
| **LeagueSummaryPanel** | Review: all settings (sport, league type, draft type, name, teams, roster, scoring, rounds, timer, auction if applicable, AI, automation, visibility, invite link). |

---

## Progress Display

- **WizardStepContainer** shows: `Step {stepNumber} of {totalSteps}` and the current step label (e.g. "Sport", "League type").
- Step numbers are 1-based; total steps = 10.
- Progress is visible on every step and is announced for accessibility (`aria-live="polite"` on the progress text).

---

## Mandatory Click Audit

- [ ] **Next step works** — On steps 1–9, "Next" advances to the following step; state is preserved.
- [ ] **Previous step works** — "Back" on steps 2–10 returns to the previous step; state is preserved.
- [ ] **Settings save correctly** — Selections in Sport, League Type, Draft Type, Team Setup, Scoring, Draft Settings, AI, Automation, and Privacy persist when moving back and forth and appear correctly on Review.
- [ ] **Review page displays correct values** — LeagueSummaryPanel shows sport, league type, draft type, name, teams, roster size, scoring preset, rounds, timer, auction budget (if auction), AI toggles, automation toggles, visibility, invite link.
- [ ] **Create league button works** — On Review, "Create league" submits to POST /api/league/create with the assembled payload; on success, redirects to /app/league/[leagueId]; on error, shows message and leaves button re-enabled.
- [ ] **No dead buttons** — Back, Next, and Create league are wired; no placeholder or disabled-without-reason buttons.

---

## Mobile-First and Responsive

- Touch targets: buttons use `min-h-[44px]` and `touch-manipulation`.
- Single-column layout; `max-w-lg` on the wizard for larger screens.
- Padding and spacing work on small viewports; step content scrolls if needed (`min-h-0 flex flex-col`).

---

## File Locations

- **Wizard and shared:** `components/league-creation-wizard/LeagueCreationWizard.tsx`, `WizardStepContainer.tsx`, `WizardStepNav.tsx`
- **Panels:** `components/league-creation-wizard/SportSelector.tsx`, `LeagueTypeSelector.tsx`, `DraftTypeSelector.tsx`, `TeamSizeSelector.tsx`, `ScoringPresetSelector.tsx`, `DraftSettingsPanel.tsx`, `AISettingsPanel.tsx`, `AutomationSettingsPanel.tsx`, `LeaguePrivacyPanel.tsx`, `LeagueSummaryPanel.tsx`
- **Exports:** `components/league-creation-wizard/index.ts`
- **Page:** `app/create-league/page.tsx`

All deliverables are merged frontend files; no patch snippets.
