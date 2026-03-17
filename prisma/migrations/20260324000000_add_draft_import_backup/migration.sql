-- Add DraftImportBackup for import rollback (PROMPT 193).
CREATE TABLE IF NOT EXISTS "draft_import_backups" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "draft_import_backups_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "draft_import_backups_leagueId_key" ON "draft_import_backups"("leagueId");
CREATE INDEX IF NOT EXISTS "draft_import_backups_leagueId_idx" ON "draft_import_backups"("leagueId");
