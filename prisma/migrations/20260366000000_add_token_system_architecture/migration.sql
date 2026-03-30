-- PROMPT 253: AllFantasy token system architecture.
-- Adds token packages, user balances, ledger, centralized spend rules, and refund rules.

CREATE TABLE IF NOT EXISTS "token_packages" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(64) NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "tokenAmount" INTEGER NOT NULL,
    "priceUsdCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_packages_sku_key"
ON "token_packages"("sku");

CREATE INDEX IF NOT EXISTS "token_packages_isActive_idx"
ON "token_packages"("isActive");

CREATE TABLE IF NOT EXISTS "user_token_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePurchased" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpent" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRefunded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_token_balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_token_balances_balance_non_negative" CHECK ("balance" >= 0),
    CONSTRAINT "user_token_balances_lifetime_non_negative" CHECK (
      "lifetimePurchased" >= 0 AND "lifetimeSpent" >= 0 AND "lifetimeRefunded" >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_token_balances_userId_key"
ON "user_token_balances"("userId");

CREATE INDEX IF NOT EXISTS "user_token_balances_balance_idx"
ON "user_token_balances"("balance");

CREATE TABLE IF NOT EXISTS "token_spend_rules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "category" VARCHAR(32) NOT NULL,
    "featureLabel" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "tokenCost" INTEGER NOT NULL,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_spend_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_spend_rules_cost_positive" CHECK ("tokenCost" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_spend_rules_code_key"
ON "token_spend_rules"("code");

CREATE INDEX IF NOT EXISTS "token_spend_rules_isActive_idx"
ON "token_spend_rules"("isActive");

CREATE INDEX IF NOT EXISTS "token_spend_rules_category_isActive_idx"
ON "token_spend_rules"("category", "isActive");

CREATE TABLE IF NOT EXISTS "token_refund_rules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "maxAgeMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_refund_rules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_refund_rules_max_age_positive" CHECK ("maxAgeMinutes" IS NULL OR "maxAgeMinutes" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_refund_rules_code_key"
ON "token_refund_rules"("code");

CREATE INDEX IF NOT EXISTS "token_refund_rules_isActive_idx"
ON "token_refund_rules"("isActive");

CREATE TABLE IF NOT EXISTS "token_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userTokenBalanceId" TEXT NOT NULL,
    "entryType" VARCHAR(32) NOT NULL,
    "tokenDelta" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "tokenPackageSku" VARCHAR(64),
    "spendRuleCode" VARCHAR(64),
    "refundRuleCode" VARCHAR(64),
    "sourceType" VARCHAR(64),
    "sourceId" VARCHAR(128),
    "idempotencyKey" VARCHAR(191),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "token_ledger_balance_after_non_negative" CHECK ("balanceAfter" >= 0),
    CONSTRAINT "token_ledger_direction_check" CHECK (
      ("entryType" = 'spend' AND "tokenDelta" < 0) OR
      ("entryType" IN ('purchase', 'refund', 'adjustment') AND "tokenDelta" > 0)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "token_ledger_idempotencyKey_key"
ON "token_ledger"("idempotencyKey")
WHERE "idempotencyKey" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "token_ledger_userId_createdAt_idx"
ON "token_ledger"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "token_ledger_entryType_createdAt_idx"
ON "token_ledger"("entryType", "createdAt");

CREATE INDEX IF NOT EXISTS "token_ledger_tokenPackageSku_idx"
ON "token_ledger"("tokenPackageSku");

CREATE INDEX IF NOT EXISTS "token_ledger_spendRuleCode_idx"
ON "token_ledger"("spendRuleCode");

CREATE INDEX IF NOT EXISTS "token_ledger_refundRuleCode_idx"
ON "token_ledger"("refundRuleCode");

CREATE INDEX IF NOT EXISTS "token_ledger_sourceType_sourceId_idx"
ON "token_ledger"("sourceType", "sourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_token_balances_userId_fkey'
      AND table_name = 'user_token_balances'
  ) THEN
    ALTER TABLE "user_token_balances"
      ADD CONSTRAINT "user_token_balances_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_ledger_userId_fkey'
      AND table_name = 'token_ledger'
  ) THEN
    ALTER TABLE "token_ledger"
      ADD CONSTRAINT "token_ledger_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "app_users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_ledger_userTokenBalanceId_fkey'
      AND table_name = 'token_ledger'
  ) THEN
    ALTER TABLE "token_ledger"
      ADD CONSTRAINT "token_ledger_userTokenBalanceId_fkey"
      FOREIGN KEY ("userTokenBalanceId") REFERENCES "user_token_balances"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_ledger_tokenPackageSku_fkey'
      AND table_name = 'token_ledger'
  ) THEN
    ALTER TABLE "token_ledger"
      ADD CONSTRAINT "token_ledger_tokenPackageSku_fkey"
      FOREIGN KEY ("tokenPackageSku") REFERENCES "token_packages"("sku")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_ledger_spendRuleCode_fkey'
      AND table_name = 'token_ledger'
  ) THEN
    ALTER TABLE "token_ledger"
      ADD CONSTRAINT "token_ledger_spendRuleCode_fkey"
      FOREIGN KEY ("spendRuleCode") REFERENCES "token_spend_rules"("code")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'token_ledger_refundRuleCode_fkey'
      AND table_name = 'token_ledger'
  ) THEN
    ALTER TABLE "token_ledger"
      ADD CONSTRAINT "token_ledger_refundRuleCode_fkey"
      FOREIGN KEY ("refundRuleCode") REFERENCES "token_refund_rules"("code")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "token_packages" ("id", "sku", "title", "description", "tokenAmount", "priceUsdCents", "isActive", "createdAt", "updatedAt")
VALUES
  ('e63fd5a3-9f52-4f68-a493-0f7270671001', 'af_tokens_5', 'AllFantasy AI Tokens (5)', '5 AI tokens for metered premium AI actions.', 5, 499, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('e63fd5a3-9f52-4f68-a493-0f7270671002', 'af_tokens_10', 'AllFantasy AI Tokens (10)', '10 AI tokens for metered premium AI actions.', 10, 899, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('e63fd5a3-9f52-4f68-a493-0f7270671003', 'af_tokens_25', 'AllFantasy AI Tokens (25)', '25 AI tokens for metered premium AI actions.', 25, 1999, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("sku") DO UPDATE
SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "tokenAmount" = EXCLUDED."tokenAmount",
  "priceUsdCents" = EXCLUDED."priceUsdCents",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "token_spend_rules" ("id", "code", "category", "featureLabel", "description", "tokenCost", "requiresConfirmation", "isActive", "createdAt", "updatedAt")
VALUES
  -- Low-cost features
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320101', 'ai_player_comparison_quick_explanation', 'ai_feature', 'Quick player comparison explanation', 'Fast side-by-side player comparison summary.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320102', 'ai_waiver_one_off_suggestion', 'ai_feature', 'One-off waiver suggestion', 'Single waiver add/drop recommendation.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320103', 'ai_matchup_explanation_single', 'ai_feature', 'One matchup explanation', 'Single matchup confidence explanation.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320104', 'ai_start_sit_explanation_single', 'ai_feature', 'One start/sit explanation', 'Single start/sit recommendation explanation.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320105', 'ai_lineup_recommendation_explanation_single', 'ai_feature', 'One lineup recommendation explanation', 'Single lineup recommendation reasoning.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  -- Mid-cost features
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320106', 'ai_trade_analyzer_full_review', 'ai_feature', 'Trade analyzer full review', 'Full trade context + fairness + action plan review.', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320107', 'ai_draft_helper_session_recommendation', 'ai_feature', 'Draft helper session recommendation', 'Session-level draft recommendation flow.', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320108', 'ai_draft_pick_explanation', 'ai_feature', 'Draft pick explanation', 'Single pick explanation with contextual tradeoffs.', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320109', 'ai_weekly_planning_session', 'ai_feature', 'Weekly AI planning session', 'Weekly multi-step planning guidance.', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320110', 'ai_league_rankings_explanation', 'ai_feature', 'League rankings explanation', 'Rankings interpretation with explainable context.', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320111', 'ai_draft_rankings_explanation', 'ai_feature', 'Draft rankings explanation', 'Draft ranking context and strategic implications.', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  -- High-cost features
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320112', 'ai_war_room_multi_step_planning', 'ai_feature', 'Multi-step war room planning', 'Extended multi-step draft war room planning.', 6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320113', 'ai_strategy_3_5_year_planning', 'ai_feature', '3-5 year strategy planning', 'Long-horizon 3-5 year strategic planning output.', 7, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320114', 'ai_storyline_creation', 'commissioner_function', 'AI storyline creation', 'League storyline generation with narrative synthesis.', 5, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320115', 'commissioner_ai_collusion_detection_scan', 'commissioner_function', 'AI collusion detection scan', 'League-wide collusion signal analysis scan.', 8, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320116', 'commissioner_ai_tanking_detection_scan', 'commissioner_function', 'AI tanking detection scan', 'League-wide tanking signal analysis scan.', 7, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320117', 'commissioner_ai_team_manager_actions', 'commissioner_function', 'AI team manager actions', 'AI-assisted manager action recommendations.', 6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320118', 'commissioner_ai_full_draft_recap', 'commissioner_function', 'Full draft recap', 'Full draft recap across league activity.', 6, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320119', 'commissioner_ai_full_league_recap', 'commissioner_function', 'Full league recap', 'Cross-surface full league recap generation.', 7, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320120', 'commissioner_ai_large_analysis', 'commissioner_function', 'Large commissioner-wide analysis', 'Large-scope commissioner-wide analysis run.', 9, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  -- Backward-compatible in-use rules
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320121', 'ai_chimmy_chat_message', 'ai_feature', 'Chimmy chat message', 'Unified Chimmy chat response generation.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320122', 'ai_trade_eval_consensus', 'ai_feature', 'Trade analyzer full review (legacy)', 'Legacy trade evaluator route mapped to full review pricing.', 3, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320123', 'ai_waiver_engine_run', 'ai_feature', 'One-off waiver suggestion (legacy)', 'Legacy waiver route mapped to one-off waiver pricing.', 1, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320124', 'commissioner_ai_cycle_run', 'commissioner_function', 'Large commissioner-wide analysis (legacy cycle)', 'Legacy AI Commissioner cycle endpoint mapped to large analysis pricing.', 9, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fdbefae9-8f08-4fb5-b7cb-c5988b320125', 'commissioner_ai_chat_question', 'commissioner_function', 'AI Commissioner question', 'Single AI Commissioner question and response.', 2, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "category" = EXCLUDED."category",
  "featureLabel" = EXCLUDED."featureLabel",
  "description" = EXCLUDED."description",
  "tokenCost" = EXCLUDED."tokenCost",
  "requiresConfirmation" = EXCLUDED."requiresConfirmation",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "token_refund_rules" ("id", "code", "description", "maxAgeMinutes", "isActive", "createdAt", "updatedAt")
VALUES
  ('0a74f59b-418a-4f4f-8cec-99b5b557b001', 'feature_execution_failed', 'Automatic refund when a spend-confirmed feature fails before delivering output.', 120, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "maxAgeMinutes" = EXCLUDED."maxAgeMinutes",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
