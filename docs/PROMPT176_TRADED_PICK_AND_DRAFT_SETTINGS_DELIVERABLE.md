# PROMPT 176 — Traded Pick Color Mode and Draft Settings Deliverable

## Summary

Commissioner-controlled draft room settings are stored in **League.settings** (JSON). The draft room and settings panel read/write these via a dedicated resolver and API. Traded pick color and “new owner in red” are driven by these settings.

---

## Schema / settings (no DB migration)

All new keys live in **League.settings** (existing `Json?`):

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `draft_traded_pick_color_mode_enabled` | boolean | true | When true, pick tiles for traded picks use the acquiring manager’s color/hue. |
| `draft_traded_pick_owner_name_red_enabled` | boolean | true | When true, show new owner’s name in red for traded picks. |
| `draft_ai_adp_enabled` | boolean | true | Enable AI-adjusted ADP in player panel. |
| `draft_ai_queue_reorder_enabled` | boolean | true | Show/enable “AI reorder queue” in queue panel. |
| `draft_orphan_team_ai_manager_enabled` | boolean | false | Orphan team AI manager. |
| `draft_live_chat_sync_enabled` | boolean | false | Sync draft chat with league chat. |
| `draft_auto_pick_enabled` | boolean | false | Auto-pick from queue when on clock. |
| `draft_timer_mode` | string | 'per_pick' | One of: per_pick, soft_pause, overnight_pause, none. |
| `draft_commissioner_force_autopick_enabled` | boolean | false | Commissioner can force auto-pick for a slot. |

---

## Traded pick color rules (implementation)

- **Manager colors:** Each manager (by slot) has an assigned color from a fixed palette (e.g. `MANAGER_COLORS` in `DraftManagerStrip`). Manager cards in the draft order strip use that color as background/border.
- **Pick tile tint:** If a pick has `tradedPickMeta` (ownership changed) and **tradedPickColorModeEnabled** is true, the pick tile uses `tradedPickMeta.tintColor` (acquiring manager’s color/hue). If the commissioner turns off **tradedPickColorModeEnabled**, no tint is applied to pick tiles.
- **New owner in red:** If **tradedPickOwnerNameRedEnabled** is true, the new owner’s name is shown in red for traded picks (strip and board cell). If disabled, normal text styling is used.
- **Backend note:** When recording a traded pick, the backend should set `tradedPickMeta.tintColor` to the acquiring manager’s assigned color (e.g. same palette index by slot) so the draft room can tint the cell. Types already support `TradedPickMeta.tintColor`.

---

## Backend

### New/updated files

| File | Description |
|------|-------------|
| `lib/draft-defaults/DraftUISettingsResolver.ts` | **New.** `getDraftUISettingsForLeague(leagueId)`, `updateDraftUISettings(leagueId, patch)`. Reads/writes draft UI keys from/to `League.settings`. |
| `lib/draft-defaults/index.ts` | **Updated.** Exports `getDraftUISettingsForLeague`, `updateDraftUISettings`, `DraftUISettings`, `TimerMode`. |
| `app/api/leagues/[leagueId]/draft/settings/route.ts` | **New.** GET: returns `config`, `draftUISettings`, `isCommissioner`. PATCH: commissioner-only; body is partial `DraftUISettings`; merges into `League.settings` and returns updated `draftUISettings`. |

---

## Frontend

### Settings UI

| File | Description |
|------|-------------|
| `components/app/settings/DraftSettingsPanel.tsx` | **Updated.** Fetches `GET /api/leagues/[leagueId]/draft/settings`. Renders read-only draft config (type, rounds, timer, etc.) and a “Draft room display & behavior” section with one toggle per setting and a Timer mode dropdown. Commissioner only: toggles/dropdown are editable and “Save draft room settings” calls PATCH with current `draftUISettings`. Non-commissioner: toggles/dropdown disabled. Save success feedback and error handling wired. |

### Draft room state wiring

| File | Description |
|------|-------------|
| `components/app/draft-room/DraftRoomPageClient.tsx` | **Updated.** Fetches `GET /api/leagues/[leagueId]/draft/settings` on load and on reconnect; also refetches draft settings on the same interval as session poll. Passes to children: `tradedPickColorMode` = `draftUISettings.tradedPickColorModeEnabled`, `showNewOwnerInRed` = `draftUISettings.tradedPickOwnerNameRedEnabled` (strip + board); `useAiAdp` = `draftUISettings.aiAdpEnabled` (player panel); `onAiReorder` present only when `draftUISettings.aiQueueReorderEnabled` (queue panel); `leagueChatSync` = `draftUISettings.liveDraftChatSyncEnabled` (chat panel). |

Existing components **DraftManagerStrip**, **DraftBoard**, **DraftBoardCell**, **PlayerPanel**, **QueuePanel**, **DraftChatPanel** already accept these props; no changes required except wiring from page client.

---

## Mandatory click audit (checklist)

- [ ] **Settings toggles save correctly:** As commissioner, change any draft room display/behavior toggle or timer mode, click “Save draft room settings”. Response is 200 and UI shows “Saved.”; reload page and confirm values persisted.
- [ ] **Saved settings reload correctly:** Reload league settings (or re-open Draft Settings tab); all toggles and timer mode reflect stored values.
- [ ] **Draft room reflects settings:** Open draft room; turn off “Traded pick color mode” and “Show new owner name in red” in settings and save. Refresh draft room (or wait for poll). Board and strip no longer show tint or red new-owner name for traded picks. Re-enable and confirm they appear again.
- [ ] **Commissioner-only permissions:** As non-commissioner, open Draft Settings; toggles and dropdown are disabled; no Save button or PATCH is not sent. As commissioner, toggles and Save are enabled; PATCH succeeds.
- [ ] **No dead settings toggles:** Every toggle and the timer dropdown is bound to state; Save sends the current state; GET on load populates state. No orphan controls.
- [ ] **No stale UI after setting changes:** After commissioner saves, either refresh draft room or wait for next poll; draft room’s strip/board/player/queue/chat use updated `draftUISettings` (traded pick mode, red name, AI ADP, AI reorder, chat sync).

---

## QA checklist (concise)

| Check | Pass |
|-------|------|
| Commissioner can change and save all 9 draft UI settings | |
| Non-commissioner sees toggles but cannot edit or save | |
| Draft room loads settings on open and applies traded pick color / red name / AI ADP / queue reorder / chat sync | |
| Draft room refetches settings on reconnect and on session poll | |
| Toggling “Traded pick color mode” off removes tint from traded pick tiles | |
| Toggling “Show new owner name in red” off uses normal text for new owner | |
| Manager strip always shows per-slot manager colors; traded-pick tint only when setting on and meta has tintColor | |
