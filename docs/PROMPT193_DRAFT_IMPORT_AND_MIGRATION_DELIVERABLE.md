# PROMPT 193 — AllFantasy Draft Import and Migration System Deliverable

## Overview

Draft import and migration is now fully wired as a deterministic, rules-based flow (no AI dependency for correctness). It imports:

- draft order
- completed picks
- pick ownership / traded picks
- keeper state (config + selections)
- draft metadata (team count, rounds, type, 3RR)

The flow supports dry-run validation, preview, commit, duplicate prevention, rollback, and cancel from the commissioner control center.

**Supported sports:** NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer (sport-aware where league context is used).

---

## 1. Import Service Files

| File | Purpose |
|------|---------|
| `lib/draft-import/types.ts` | Raw payload types, ImportErrorReport, ImportSource. |
| `lib/draft-import/ImportErrorReport.ts` | createEmptyReport, addError, addWarning, mergeReports. |
| `lib/draft-import/DraftImportPreview.ts` | MappedPick, DraftImportPreview, createEmptyPreview. |
| `lib/draft-import/ImportMappingLayer.ts` | mapPayloadToPreview: resolves rosterId/displayName from league context; maps draftOrder, picks, tradedPicks, keeperConfig, keeperSelections. |
| `lib/draft-import/ImportValidationEngine.ts` | validateRawPayload (structure), validatePreview (duplicates, ranges, roster refs). |
| `lib/draft-import/DraftImportService.ts` | parseImportPayload, runDraftImportDryRun (parse → map → validate). |
| `lib/draft-import/ImportCommitFlow.ts` | createImportBackup, commitImport (backup + transaction apply + duplicate import guard), rollbackImport, hasImportBackup. |
| `lib/draft-import/leagueContext.ts` | buildLeagueImportContext from league rosters + teams. |
| `lib/draft-import/index.ts` | Re-exports. |

---

## 2. Schema / Model Updates

- **DraftImportBackup (new):** `id`, `leagueId` (unique), `snapshot` (Json), `createdAt`. Snapshot = `{ sessionPatch, picks }` for rollback. One backup per league; overwritten on each import.
- **Migration:** `prisma/migrations/20260324000000_add_draft_import_backup/migration.sql`.

---

## 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/leagues/[leagueId]/draft/import/validate` | POST | Dry-run: body `{ payload }` (JSON object or string). Returns `{ valid, report, preview }`. |
| `/api/leagues/[leagueId]/draft/import/commit` | POST | Commissioner only. Body `{ preview }`. Revalidates preview deterministically, prevents duplicate import, creates backup, then applies in transaction. |
| `/api/leagues/[leagueId]/draft/import/rollback` | POST | Commissioner only. Restores session and picks from last backup; deletes backup. |
| `/api/leagues/[leagueId]/draft/import/backup-status` | GET | Returns `{ hasBackup }`. |

---

## 4. UI Flow

- **Commissioner control center (draft room):** New section **Import** with button **Import draft data**. When opened, shows **DraftImportFlow**:
  1. **Upload JSON file** or **paste JSON** with `draftOrder`, `picks`, and optional `tradedPicks`, `keeperConfig`, `keeperSelections`, `metadata`.
  2. **Validate (dry run):** Calls validate API; shows parse errors, validation errors/warnings, and preview summary (pick count, traded picks, keepers, slots).
  3. **Preview details:** Shows mapped draft-order rows and mapped picks before commit.
  4. **Commit import:** Enabled only when validation can proceed; creates backup and applies preview. Panel closes and resync runs.
  4. **Cancel:** Closes import panel without committing.
  5. **Rollback last import:** Shown when backup exists; restores previous state and clears backup.
- **Components:** `DraftImportFlow.tsx` (used inside CommissionerControlCenterModal); modal receives `leagueId` and passes it to the flow.

---

## 5. Validation Notes (Deterministic)

- **Raw payload:** Must be an object and contain import data (`draftOrder`, `picks`, `tradedPicks`, `keeperConfig`, `keeperSelections`, or `metadata`).
- **Source normalization:** Supports common aliases (`draft_order`, `completed_picks`, `traded_picks`, `leagueMetadata`, etc.) and normalizes into the canonical import shape.
- **Mapping:** Resolves roster IDs using rosterId, slot fallback, and normalized display/team/owner names from league context.
- **Preview validation:**
  - team count and rounds bounds
  - slot order uniqueness and slot range
  - overall/round/slot consistency
  - duplicate overalls / duplicate players per roster
  - traded pick round + ownership consistency
  - keeper round-cost and roster consistency
- **Commit validation:** Preview is revalidated at commit-time server-side before writes.
- **Duplicate prevention:** Commit rejects imports that exactly match current session state.
- **Overwrite signaling:** Warns when import replaces existing picks outside pre-draft.

---

## 6. Automation vs AI Notes

| Feature | Automation (rules-based) | AI |
|---------|---------------------------|-----|
| Parse JSON | ✅ | — |
| Map draft order / picks / traded / keeper | ✅ | — |
| Resolve rosterId from names | ✅ (league context) | — |
| Validation (duplicates, ranges, refs) | ✅ | — |
| Preview summary | ✅ | — |
| Commit revalidation + duplicate prevention | ✅ | — |
| Backup and commit in transaction | ✅ | — |
| Rollback from backup | ✅ | — |
| Error reporting | ✅ | — |
| Source-specific adapters (Sleeper/ESPN) | Optional future (still deterministic) | — |

---

## 7. QA Checklist (Mandatory Click Audit)

- [x] **Upload/import flow works:** Commissioner opens control center -> Import draft data -> uploads/pastes JSON -> Validate returns preview/errors.
- [x] **Preview works:** Summary, draft order preview, and picks preview render before commit.
- [x] **Validation errors display correctly:** Invalid JSON and duplicate-overall validation path verified in dedicated E2E click audit.
- [x] **Commit import works:** Valid preview -> Commit import -> board/session reflect imported picks; backup created.
- [x] **Rollback or cancel works:** Rollback restores prior state and removes backup; Cancel closes panel without committing.
- [x] **No dead import steps or buttons:** Validate, Commit, Cancel, Upload, and Rollback are all wired and actionable.

---

## 8. Payload Shape (Generic)

```json
{
  "source": "manual",
  "draftOrder": [
    { "slot": 1, "displayName": "Team 1" },
    { "slot": 2, "rosterId": "uuid-2", "displayName": "Team 2" }
  ],
  "picks": [
    {
      "overall": 1,
      "round": 1,
      "slot": 1,
      "rosterId": "uuid-1",
      "displayName": "Team 1",
      "playerName": "Patrick Mahomes",
      "position": "QB",
      "team": "KC"
    }
  ],
  "tradedPicks": [
    {
      "round": 2,
      "originalRosterId": "uuid-1",
      "previousOwnerName": "Team 1",
      "newRosterId": "uuid-2",
      "newOwnerName": "Team 2"
    }
  ],
  "keeperConfig": { "maxKeepers": 3 },
  "keeperSelections": [
    { "rosterId": "uuid-1", "roundCost": 5, "playerName": "...", "position": "RB", "team": null }
  ],
  "metadata": { "rounds": 15, "teamCount": 12, "draftType": "snake", "thirdRoundReversal": false }
}
```

---

## 9. Files Touched (Summary)

- **Backend:** `lib/draft-import/*` (types, ImportErrorReport, DraftImportPreview, ImportMappingLayer, ImportValidationEngine, DraftImportService, ImportCommitFlow, leagueContext, index); `app/api/leagues/[leagueId]/draft/import/validate/route.ts`, `commit/route.ts`, `rollback/route.ts`, `backup-status/route.ts`.
- **Schema:** `prisma/schema.prisma` (DraftImportBackup), `prisma/migrations/20260324000000_add_draft_import_backup/migration.sql`.
- **Frontend:** `components/app/draft-room/DraftImportFlow.tsx`, `CommissionerControlCenterModal.tsx` (Import section + DraftImportFlow).
- **E2E:** `e2e/draft-import-click-audit.spec.ts`.
- **Docs:** `docs/PROMPT193_DRAFT_IMPORT_AND_MIGRATION_DELIVERABLE.md`.
