-- Draft Slice B: persist frozen per-pick seconds during overnight quiet window (timerEndAt cleared until window ends).

ALTER TABLE "draft_sessions" ADD COLUMN IF NOT EXISTS "overnightFrozenPickSeconds" INTEGER;
