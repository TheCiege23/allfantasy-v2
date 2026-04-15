-- Commissioner AI draft manager assignments + trade rules (JSON blob on live draft session)
ALTER TABLE "draft_sessions" ADD COLUMN "commissionerAiManagers" JSONB;
