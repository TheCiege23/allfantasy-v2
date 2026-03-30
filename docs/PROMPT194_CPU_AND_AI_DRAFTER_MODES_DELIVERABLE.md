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
  - If `'ai'`: uses `computeAIDrafterPick(cpuInput, { useAIProvider: true })`.
  - If providers are unavailable or AI path fails, execution falls back to CPU deterministically.
  - Audit log payload includes:
    - `requestedMode`
    - `drafterMode` (executed mode)
    - `aiProviderAvailable`
    - `usedFallback`
    - optional AI narrative/profile details
- **API response (`/draft/ai-pick`) now returns execution metadata**:
  - `requestedMode`
  - `executedMode`
  - `aiProviderAvailable`
  - `usedFallback`

---

## 4. UI Changes

- **Draft Settings panel** (`components/app/settings/DraftSettingsPanel.tsx`):
  - When "Orphan team AI manager enabled" is on, shows **Orphan drafter mode** dropdown: **CPU (rules-based, no API)** | **AI (strategy/narrative, fallback to CPU)**.
  - Commissioner-only. Orphan status text reflects selected mode (CPU vs AI with fallback).
- **Draft room** (`DraftTopBar.tsx`, `DraftRoomPageClient.tsx`):
  - Session/events payload now includes:
    - `orphanAiProviderAvailable`
    - `orphanDrafterEffectiveMode`
  - When an orphan is on the clock, top bar label shows:
    - **CPU Manager**
    - **AI Manager**
    - **AI Manager (CPU fallback)** when AI mode is selected but providers are unavailable.
  - Commissioner modal now surfaces requested/effective mode and explicit fallback status note.
  - Run button label is mode-aware (`Run CPU pick now` or `Run AI pick now`, with fallback label when relevant).

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
- Session/events/status responses expose provider availability and effective mode so UI can show fallback clearly.
- Audit log records executed mode and fallback metadata for post-action review.

---

## 7. Mandatory Click Audit (QA Checklist)

- [x] **Mode selector works:** Commissioner can toggle orphan automation and switch CPU/AI mode from control center.
- [x] **Fallback works:** In AI mode with provider unavailable, action executes with CPU fallback and completes pick.
- [x] **Status display works:** UI shows requested/effective mode and top-bar fallback label (`AI Manager (CPU fallback)`).
- [x] **Picks process correctly:** Automated pick updates board/session in CPU mode, AI mode, and fallback mode.
- [x] **No dead mode toggles:** Mode selector, status label, and run action are all wired and actionable.

---

## 8. Files Touched

- **Backend:** `lib/draft-defaults/DraftUISettingsResolver.ts` (orphanDrafterMode, OrphanDrafterMode), `lib/draft-defaults/index.ts` (export OrphanDrafterMode), `lib/automated-drafter/*` (new), `lib/orphan-ai-manager/OrphanAIManagerService.ts` (CPU/AI branch, audit drafterMode).
- **API:** `app/api/leagues/[leagueId]/draft/ai-pick/route.ts`, `app/api/leagues/[leagueId]/draft/session/route.ts`, `app/api/leagues/[leagueId]/draft/events/route.ts`, `app/api/leagues/[leagueId]/draft/settings/route.ts`, `app/api/leagues/[leagueId]/orphan-ai-manager/status/route.ts`.
- **Frontend:** `components/app/settings/DraftSettingsPanel.tsx`, `components/app/draft-room/DraftTopBar.tsx`, `components/app/draft-room/CommissionerControlCenterModal.tsx`, `components/app/draft-room/DraftRoomPageClient.tsx`.
- **E2E:** `e2e/cpu-ai-drafter-modes-click-audit.spec.ts`.
- **Docs:** `docs/PROMPT194_CPU_AND_AI_DRAFTER_MODES_DELIVERABLE.md`.
