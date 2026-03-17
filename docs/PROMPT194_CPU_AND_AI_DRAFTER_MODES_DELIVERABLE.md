# PROMPT 194 — CPU Drafter and AI Drafter Modes Deliverable

## Overview

Two distinct automated draft modes for empty/orphan teams:

1. **CPU DRAFTER** — Rules-based, no AI API. Handles baseline best-available, roster need balancing, position caps, queue-aware autopick when configured. Deterministic and fast.
2. **AI DRAFTER** — Optional strategy/narrative via API. Falls back to CPU when AI providers are unavailable. Actions auditable.

Commissioner chooses mode per league; UI clearly labels which mode is active. No requirement to use paid AI APIs for every orphan pick.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer.

---

## 1. Drafter Services

| File | Purpose |
|------|---------|
| `lib/automated-drafter/types.ts` | `OrphanDrafterMode`, `DrafterPlayer`, `CPUDrafterInput`, `DrafterPickResult`. |
| `lib/automated-drafter/CPUDrafterService.ts` | `computeCPUPick(input)`: queue-first if provided, else deterministic need/bpa via draft-helper; position awareness; no API. |
| `lib/automated-drafter/AIDrafterService.ts` | `computeAIDrafterPick(input, options)`: optional AI provider; on failure or unavailability returns CPU result. `drafterMode` in result is `'ai'` only when AI produced the pick. |
| `lib/automated-drafter/index.ts` | Re-exports. |

---

## 2. Settings Updates

- **DraftUISettings** (`lib/draft-defaults/DraftUISettingsResolver.ts`):
  - **orphanDrafterMode**: `'cpu' | 'ai'` (default `'cpu'`).
  - Stored under `draft_orphan_drafter_mode` in League.settings.
- **GET/PATCH** `/api/leagues/[leagueId]/draft/settings`: `draftUISettings.orphanDrafterMode` included in response; PATCH accepts `orphanDrafterMode: 'cpu' | 'ai'`.
- **GET** `/api/leagues/[leagueId]/draft/session`: Session object includes **orphanDrafterMode** so the draft room can show "CPU Manager" vs "AI Manager" when an orphan is on the clock.

---

## 3. Orphan Manager Integration

- **OrphanAIManagerService** (`lib/orphan-ai-manager/OrphanAIManagerService.ts`):
  - Reads `uiSettings.orphanDrafterMode`.
  - If `'cpu'`: uses `computeCPUPick(cpuInput)`.
  - If `'ai'`: uses `computeAIDrafterPick(cpuInput, { useAIProvider: true })` (fallback to CPU on error).
  - Audit log payload includes **drafterMode** (`'cpu' | 'ai'`) and optional **narrative** for AI picks.

---

## 4. UI Changes

- **Draft Settings panel** (`components/app/settings/DraftSettingsPanel.tsx`):
  - When "Orphan team AI manager enabled" is on, shows **Orphan drafter mode** dropdown: **CPU (rules-based, no API)** | **AI (strategy/narrative, fallback to CPU)**.
  - Commissioner-only. Orphan status text reflects selected mode (CPU vs AI with fallback).
- **Draft room** (`DraftTopBar.tsx`, `DraftRoomPageClient.tsx`):
  - When an orphan is on the clock, label shows **"CPU Manager"** or **"AI Manager"** based on `session.orphanDrafterMode`.
  - "Run AI pick" button unchanged (still triggers the automated pick for the current orphan slot).

---

## 5. Automation vs AI Comparison

| Capability | CPU Drafter | AI Drafter |
|------------|-------------|------------|
| Best-available / ADP | ✅ | ✅ (or AI ranking) |
| Roster need balancing | ✅ | ✅ |
| Position caps / slots | ✅ | ✅ |
| Queue-aware autopick | ✅ (when queue provided) | ✅ (same input) |
| Budget (auction) | ✅ (future: constraints in input) | ✅ |
| Deterministic | ✅ | Fallback only |
| Speed | Fast, local | Depends on provider; fallback fast |
| Narrative / reasoning | Short reason string | Optional narrative in result/audit |
| Counter-trade / philosophy | — | Optional when provider implemented |
| API required | No | Optional; fallback to CPU |
| Cost | No API cost | Only if provider used |

---

## 6. Fallback Behavior

- If commissioner selects **AI** and the AI provider is unavailable or errors, the system uses the **CPU** drafter for that pick.
- Audit log still records the pick with `drafterMode: 'ai'` only when the AI path actually returned the pick; otherwise the fallback pick is logged with `drafterMode: 'cpu'`.

---

## 7. Mandatory Click Audit (QA Checklist)

- [ ] **Mode selector works:** Commissioner enables orphan AI manager → "Orphan drafter mode" dropdown appears; can select CPU or AI; save persists selection.
- [ ] **Fallback works:** With mode AI, if provider unavailable (or not implemented), pick still executes using CPU; no dead pick or error blocking draft.
- [ ] **Status display works:** When orphan is on the clock, draft room shows "CPU Manager" when mode is CPU and "AI Manager" when mode is AI.
- [ ] **Picks process correctly:** Run AI pick (commissioner) submits a valid pick; session updates; audit log has entry with correct `drafterMode`.
- [ ] **No dead mode toggles:** CPU/AI selector is enabled for commissioner when orphan manager is on; draft room badge and Run pick button work for both modes.

---

## 8. Files Touched

- **Backend:** `lib/draft-defaults/DraftUISettingsResolver.ts` (orphanDrafterMode, OrphanDrafterMode), `lib/draft-defaults/index.ts` (export OrphanDrafterMode), `lib/automated-drafter/*` (new), `lib/orphan-ai-manager/OrphanAIManagerService.ts` (CPU/AI branch, audit drafterMode).
- **API:** `app/api/leagues/[leagueId]/draft/session/route.ts` (session.orphanDrafterMode), `app/api/leagues/[leagueId]/draft/settings/route.ts` (PATCH orphanDrafterMode).
- **Frontend:** `components/app/settings/DraftSettingsPanel.tsx` (mode selector + status text), `components/app/draft-room/DraftTopBar.tsx` (orphanDrafterMode prop, CPU/AI label), `components/app/draft-room/DraftRoomPageClient.tsx` (pass orphanDrafterMode from session).
- **Docs:** `docs/PROMPT194_CPU_AND_AI_DRAFTER_MODES_DELIVERABLE.md`.
