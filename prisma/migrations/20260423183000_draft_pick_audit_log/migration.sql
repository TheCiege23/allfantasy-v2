-- Commissioner pick editor audit (Neon/Postgres)

CREATE TABLE "draft_pick_audit_log" (
    "id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "draft_session_id" TEXT NOT NULL,
    "overall_pick_number" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "old_roster_id" TEXT,
    "new_roster_id" TEXT,
    "old_player_id" TEXT,
    "old_player_name" TEXT,
    "new_player_id" TEXT,
    "new_player_name" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_pick_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "draft_pick_audit_log_league_id_idx" ON "draft_pick_audit_log"("league_id");
CREATE INDEX "draft_pick_audit_log_draft_session_id_idx" ON "draft_pick_audit_log"("draft_session_id");
CREATE INDEX "draft_pick_audit_log_overall_pick_number_idx" ON "draft_pick_audit_log"("overall_pick_number");
CREATE INDEX "draft_pick_audit_log_actor_user_id_idx" ON "draft_pick_audit_log"("actor_user_id");
CREATE INDEX "draft_pick_audit_log_created_at_idx" ON "draft_pick_audit_log"("created_at");

ALTER TABLE "draft_pick_audit_log" ADD CONSTRAINT "draft_pick_audit_log_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "draft_pick_audit_log" ADD CONSTRAINT "draft_pick_audit_log_draft_session_id_fkey" FOREIGN KEY ("draft_session_id") REFERENCES "draft_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
