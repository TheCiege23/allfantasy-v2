# PROMPT 193 — AllFantasy Draft Import and Migration System Deliverable

## Overview

Draft import and migration: **deterministic, rules-based** mapping and validation. AI is not required for import correctness. Supports import of draft order, completed picks, pick ownership/traded picks, keeper state, and league metadata from a generic JSON payload.

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
| `lib/draft-import/ImportCommitFlow.ts` | createImportBackup, commitImport (backup + transaction apply), rollbackImport, hasImportBackup. |
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
| `/api/leagues/[leagueId]/draft/import/commit` | POST | Commissioner only. Body `{ preview }`. Creates backup then applies in transaction. |
| `/api/leagues/[leagueId]/draft/import/rollback` | POST | Commissioner only. Restores session and picks from last backup; deletes backup. |
| `/api/leagues/[leagueId]/draft/import/backup-status` | GET | Returns `{ hasBackup }`. |

---

## 4. UI Flow

- **Commissioner control center (draft room):** New section **Import** with button **Import draft data**. When opened, shows **DraftImportFlow**:
  1. **Paste JSON** (textarea) with `draftOrder`, `picks`, and optionally `tradedPicks`, `keeperConfig`, `keeperSelections`, `metadata`.
  2. **Validate (dry run):** Calls validate API; shows parse errors, validation errors/warnings, and preview summary (pick count, traded picks, keepers, slots).
  3. **Commit import:** Enabled when valid; creates backup and applies preview. Success message and panel close; Resync runs.
  4. **Cancel:** Closes import panel without committing.
  5. **Rollback last import:** Shown when backup exists; restores previous state and clears backup.
- **Components:** `DraftImportFlow.tsx` (used inside CommissionerControlCenterModal); modal receives `leagueId` and passes it to the flow.

---

## 5. Validation Notes (Deterministic)

- **Raw payload:** Must be object; `picks`/`draftOrder`/`tradedPicks` must be arrays if present.
- **Mapping:** Resolves rosterId from displayName/teamName/ownerName using league rosters and teams (index or name match). Unresolved slots get placeholder ids; warnings added.
- **Preview validation:** teamCount 1–50; pick overall in [1, teamCount*rounds]; no duplicate overall; no duplicate player per roster; rosterId in slot order (warning if not); overwrite warning if session already has picks.
- **Keeper:** If keeperSelections without keeperConfig, warning. No AI; all rules-based.

---

## 6. Automation vs AI Notes

| Feature | Automation (rules-based) | AI |
|---------|---------------------------|-----|
| Parse JSON | ✅ | — |
| Map draft order / picks / traded / keeper | ✅ | — |
| Resolve rosterId from names | ✅ (league context) | — |
| Validation (duplicates, ranges, refs) | ✅ | — |
| Preview summary | ✅ | — |
| Backup and commit in transaction | ✅ | — |
| Rollback from backup | ✅ | — |
| Error reporting | ✅ | — |
| Source-specific adapters (Sleeper/ESPN) | Optional future (still deterministic) | — |

---

## 7. QA Checklist (Mandatory Click Audit)

- [ ] **Upload/import flow works:** Commissioner opens control center → Import draft data → paste JSON → Validate shows preview/errors.
- [ ] **Preview works:** After validate, summary shows (pick count, traded picks, keepers, slots); errors/warnings listed; Commit enabled only when valid.
- [ ] **Validation errors display correctly:** Invalid JSON, missing fields, duplicate overall/player, out-of-range overall show with code and message.
- [ ] **Commit import works:** Valid preview → Commit import → success message; draft session and picks updated; backup created.
- [ ] **Rollback or cancel works:** Rollback last import restores previous state and removes backup; Cancel closes panel without committing.
- [ ] **No dead import steps or buttons:** Validate, Commit, Cancel, Rollback all actionable when appropriate; no broken links or disabled-without-reason.

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
- **Docs:** `docs/PROMPT193_DRAFT_IMPORT_AND_MIGRATION_DELIVERABLE.md`.
