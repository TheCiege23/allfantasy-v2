CREATE TABLE IF NOT EXISTS "league_storylines" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER,
  "week" INTEGER,
  "storyType" VARCHAR(32) NOT NULL DEFAULT 'weekly_storyline',
  "title" VARCHAR(160) NOT NULL,
  "summary" TEXT NOT NULL,
  "body" TEXT,
  "metadata" JSONB,
  "source" VARCHAR(24) NOT NULL DEFAULT 'ai',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_storylines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_storylines_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "league_matchup_previews" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER,
  "week" INTEGER NOT NULL,
  "rosterAId" VARCHAR(64),
  "rosterBId" VARCHAR(64),
  "headline" VARCHAR(160) NOT NULL,
  "summary" TEXT NOT NULL,
  "confidenceScore" DOUBLE PRECISION,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "league_matchup_previews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_matchup_previews_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "draft_recaps" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "draftSessionId" TEXT,
  "title" VARCHAR(160) NOT NULL,
  "summary" TEXT NOT NULL,
  "sections" JSONB,
  "metadata" JSONB,
  "generatedBy" VARCHAR(24) NOT NULL DEFAULT 'ai',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "draft_recaps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "draft_recaps_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "draft_recaps_draftSessionId_fkey"
    FOREIGN KEY ("draftSessionId") REFERENCES "draft_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "keeper_declarations" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "rosterId" TEXT NOT NULL,
  "season" INTEGER,
  "playerId" VARCHAR(64) NOT NULL,
  "playerName" VARCHAR(160),
  "position" VARCHAR(24),
  "roundCost" INTEGER,
  "costType" VARCHAR(32) NOT NULL DEFAULT 'previous_round',
  "salaryValue" INTEGER,
  "status" VARCHAR(24) NOT NULL DEFAULT 'declared',
  "deadlineAt" TIMESTAMP(3),
  "commissionerNotes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keeper_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "keeper_declarations_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "keeper_declarations_rosterId_fkey"
    FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "scoring_settings_snapshots" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "season" INTEGER,
  "week" INTEGER,
  "formatKey" VARCHAR(64),
  "scoringMode" VARCHAR(24) NOT NULL DEFAULT 'points',
  "scoringFormat" VARCHAR(64),
  "templateId" VARCHAR(128),
  "modifiers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "effectiveRules" JSONB NOT NULL,
  "overrides" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scoring_settings_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "scoring_settings_snapshots_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "league_intro_views" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "league_intro_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "league_intro_views_leagueId_fkey"
    FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "league_intro_views_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "league_storylines_leagueId_season_week_idx"
ON "league_storylines"("leagueId", "season", "week");

CREATE INDEX IF NOT EXISTS "league_storylines_leagueId_storyType_createdAt_idx"
ON "league_storylines"("leagueId", "storyType", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "league_matchup_previews_leagueId_season_week_rosterAId_rosterBId_key"
ON "league_matchup_previews"("leagueId", "season", "week", "rosterAId", "rosterBId");

CREATE INDEX IF NOT EXISTS "league_matchup_previews_leagueId_season_week_idx"
ON "league_matchup_previews"("leagueId", "season", "week");

CREATE INDEX IF NOT EXISTS "draft_recaps_leagueId_createdAt_idx"
ON "draft_recaps"("leagueId", "createdAt");

CREATE INDEX IF NOT EXISTS "draft_recaps_draftSessionId_idx"
ON "draft_recaps"("draftSessionId");

CREATE UNIQUE INDEX IF NOT EXISTS "keeper_declarations_leagueId_rosterId_season_playerId_key"
ON "keeper_declarations"("leagueId", "rosterId", "season", "playerId");

CREATE INDEX IF NOT EXISTS "keeper_declarations_leagueId_season_status_idx"
ON "keeper_declarations"("leagueId", "season", "status");

CREATE INDEX IF NOT EXISTS "keeper_declarations_rosterId_season_idx"
ON "keeper_declarations"("rosterId", "season");

CREATE INDEX IF NOT EXISTS "scoring_settings_snapshots_leagueId_season_week_idx"
ON "scoring_settings_snapshots"("leagueId", "season", "week");

CREATE INDEX IF NOT EXISTS "scoring_settings_snapshots_leagueId_createdAt_idx"
ON "scoring_settings_snapshots"("leagueId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "league_intro_views_leagueId_userId_key"
ON "league_intro_views"("leagueId", "userId");

CREATE INDEX IF NOT EXISTS "league_intro_views_userId_seenAt_idx"
ON "league_intro_views"("userId", "seenAt");
