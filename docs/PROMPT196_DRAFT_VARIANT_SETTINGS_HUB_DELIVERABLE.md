# PROMPT 196 — Draft Variant Settings Hub Deliverable

## Overview

One unified settings system for all draft variants: **standard live**, **mock**, **auction**, **slow**, **keeper**, **devy**, **C2C**. Settings enforcement is **deterministic and centralized**.

---

## 1. Settings Schema and Storage

| Source | Contents |
|--------|----------|
| **League.settings** | `draft_type`, `draft_rounds`, `draft_timer_seconds`, `draft_pick_order_rules`, `draft_snake_or_linear`, `draft_third_round_reversal`, `draft_autopick_behavior`, `draft_queue_size_limit`, `draft_pre_draft_ranking_source`, `draft_roster_fill_order`, `draft_position_filter_behavior` (config). Plus all `DraftUISettings` keys (traded pick color, owner name red, AI ADP, AI queue reorder, orphan manager + CPU/AI mode, chat sync, auto-pick, timer mode, commissioner force autopick, slow draft pause window, import enabled). |
| **DraftSession** (when exists, pre_draft only) | `keeperConfig`, `devyConfig`, `c2cConfig`, `auctionBudgetPerTeam` (variant-specific). |

- **Config** and **UI** are persisted in League.settings and used by draft room and mock draft.
- **Session variant** (keeper, devy, c2c, auction budget) is on DraftSession and only writable when session status is `pre_draft`.

---

## 2. Central Resolver (Draft Variant Settings Hub)

| File | Purpose |
|------|---------|
| `lib/draft-defaults/DraftVariantSettingsHub.ts` | **getDraftVariantSettings(leagueId)**: returns config + draftUISettings + leagueSize + sessionVariant + sessionPreDraft. **updateDraftConfigForLeague(leagueId, patch)**: writes config keys to League.settings. **updateSessionVariant(leagueId, patch)**: writes keeper/devy/c2c/auction to DraftSession when pre_draft. **updateDraftVariantSettings(leagueId, patch)**: applies config, draftUISettings, and sessionVariant in one flow. |

---

## 3. API

| Method | Route | Auth | Behavior |
|--------|--------|------|----------|
| GET | `/api/leagues/[leagueId]/draft/settings` | canAccessLeagueDraft | Returns `config`, `draftUISettings`, `isCommissioner`, `variantSettings`, `sessionVariant`, `sessionPreDraft`. Single source for hub UI. |
| PATCH | `/api/leagues/[leagueId]/draft/settings` | Commissioner | Body: `config` (draft_type, rounds, timer_seconds, …), `draftUISettings` (all UI toggles), `sessionVariant` (keeperConfig, devyConfig, c2cConfig, auctionBudgetPerTeam). Writes to League.settings and/or DraftSession; returns updated variant settings. |

---

## 4. Settings Included in Hub

- **Timer:** timer_seconds, timer mode (per_pick, soft_pause, overnight_pause, none), overnight pause window (start, end, timezone).
- **Draft type & pick format:** draft_type (snake, linear, auction), rounds, pick_order_rules, snake_or_linear, third_round_reversal, autopick_behavior, queue_size_limit, pre_draft_ranking_source, roster_fill_order, position_filter_behavior.
- **Display:** traded-pick color mode, owner-name-red mode.
- **AI:** AI ADP toggle, AI queue reorder toggle.
- **Empty teams:** CPU vs AI drafter mode (orphan manager + orphanDrafterMode).
- **Chat:** live draft chat sync.
- **Keeper rules:** maxKeepers, deadline, maxKeepersPerPosition (session, pre_draft).
- **Devy rules:** enabled, devyRounds (session, pre_draft).
- **C2C rules:** enabled, collegeRounds (session, pre_draft).
- **Auction budget rules:** budget per team (session, pre_draft, when draft_type === auction).
- **Overnight pause rules:** slowDraftPauseWindow when timer mode is overnight_pause.
- **Import:** explicit `importEnabled` toggle in hub UI and deterministic API enforcement in import routes.

---

## 5. Settings UI

- **Draft Settings Panel** (Draft Variant Settings Hub): Single scrollable page with sections:
  - **Timer & draft type:** Sport/variant (read-only), draft type, rounds, timer seconds, third-round reversal (editable when commissioner).
  - **Draft room display & behavior:** All DraftUISettings toggles and timer mode, overnight pause window, commissioner force autopick.
  - **Keeper / Devy / C2C / Auction:** Shown when session exists and `sessionPreDraft`; commissioner can edit max keepers, devy enabled, c2c enabled, auction budget per team.
  - **Import:** Short note that import is in commissioner control center.
- **Commissioner-only:** Editable controls disabled when not commissioner; PATCH is commissioner-only.
- **Save:** One “Save draft variant settings” button; sends config + draftUISettings + sessionVariant in one PATCH.

---

## 6. Enforcement Notes (Deterministic and Centralized)

- **Read path:** Draft room and mock draft use **getDraftConfigForLeague** and **getDraftUISettingsForLeague** (or the combined **getDraftVariantSettings**). No duplicate logic; single source from League.settings (+ session for variant).
- **Write path:** All updates go through **updateDraftVariantSettings** (or its sub-calls updateDraftConfigForLeague, updateDraftUISettings, updateSessionVariant). No direct League.settings or DraftSession writes from other code for these keys.
- **Variant-specific:** Keeper/devy/c2c/auction are enforced by existing engines (KeeperRuleEngine, PickValidation devy/c2c, AuctionEngine). Hub only persists the config; validation at pick time is unchanged.
- **Pre-draft only:** Session variant (keeper, devy, c2c, auction) is only updated when DraftSession exists and status is `pre_draft`.
- **Config sync to session:** When config (draft_type, rounds, timer_seconds, third_round_reversal) is updated in the hub and a pre_draft session exists, those fields are synced to DraftSession so the draft room reflects hub settings immediately.

---

## 7. Mandatory Click Audit (QA Checklist)

- [x] **Settings save correctly:** As commissioner, change draft type, rounds, timer, UI toggles, keeper max, devy/c2c rounds, and auction budget; click Save; values persist in PATCH payload and state.
- [x] **Settings reload correctly:** Hub reload rehydrates config + UI + session variant from `/draft/settings`.
- [x] **Affected draft rooms reflect settings:** Pre-draft session config sync plus shared UI settings resolution updates draft room behavior deterministically.
- [x] **Commissioner-only permissions work:** PATCH remains commissioner-only; non-commissioners can read but cannot persist edits.
- [x] **No dead settings controls:** Added test IDs and wiring for import toggle + keeper/devy/C2C rule controls.

---

## 8. Files Touched

- **Backend:** `lib/draft-defaults/DraftUISettingsResolver.ts` (`importEnabled` schema key + defaults), `lib/draft-defaults/DraftVariantSettingsHub.ts` (deterministic sanitization for keeper/devy/c2c session variant payloads), `lib/draft-defaults/index.ts` (exports).
- **API:** `app/api/leagues/[leagueId]/draft/settings/route.ts` (PATCH now accepts `importEnabled`), `app/api/leagues/[leagueId]/draft/import/validate/route.ts`, `app/api/leagues/[leagueId]/draft/import/commit/route.ts`, `app/api/leagues/[leagueId]/draft/import/rollback/route.ts`, `app/api/leagues/[leagueId]/draft/import/backup-status/route.ts` (import setting enforcement).
- **Frontend:** `components/app/settings/DraftSettingsPanel.tsx` (expanded variant rule inputs for keeper/deadline/position caps + devy rounds + c2c rounds + import toggle), `components/app/draft-room/CommissionerControlCenterModal.tsx` (import toggle + disabled-state UX), `components/app/draft-room/DraftImportFlow.tsx` (import-enabled guard UX).
- **QA:** `e2e/commissioner-control-panel-click-audit.spec.ts` (draft settings click-audit now covers import toggle + keeper/devy/C2C rule payloads).
- **Docs:** `docs/PROMPT196_DRAFT_VARIANT_SETTINGS_HUB_DELIVERABLE.md`.
