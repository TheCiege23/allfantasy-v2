-- ============================================================================
-- Migration: [DESCRIPTION]
-- Date: [YYYY-MM-DD]
-- Author: [NAME]
--
-- Idempotent: YES (safe to re-run)
-- Rollback: [describe manual rollback steps or "N/A"]
-- ============================================================================
--
-- Copy this template to create a new migration:
--   cp _template.sql YYYYMMDDHHMMSS_description.sql
--
-- Or use Supabase CLI:
--   supabase migration new description
--
-- Naming: YYYYMMDDHHMMSS_snake_case_description.sql
-- All DDL must be idempotent (IF NOT EXISTS / IF EXISTS everywhere).
-- ============================================================================

BEGIN;

-- 1. Enum types
-- CREATE TYPE IF NOT EXISTS "MyEnum" AS ENUM ('VALUE_A', 'VALUE_B');
-- ALTER TYPE "MyEnum" ADD VALUE IF NOT EXISTS 'VALUE_C';

-- 2. Tables
-- CREATE TABLE IF NOT EXISTS "my_table" (
--   "id" TEXT NOT NULL,
--   "name" TEXT NOT NULL,
--   "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   CONSTRAINT "my_table_pkey" PRIMARY KEY ("id")
-- );

-- 3. Column additions (for tables that may already exist)
-- ALTER TABLE "my_table" ADD COLUMN IF NOT EXISTS "new_field" TEXT;

-- 4. Indexes
-- CREATE INDEX IF NOT EXISTS "my_table_name_idx" ON "my_table" ("name");

-- 5. RLS policies
-- ALTER TABLE "my_table" ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "my_table_user_policy" ON "my_table";
-- CREATE POLICY "my_table_user_policy" ON "my_table"
--   FOR SELECT TO authenticated
--   USING ("user_id" = (SELECT auth.uid()::TEXT));

-- 6. Triggers / Functions (optional)
-- CREATE OR REPLACE FUNCTION update_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS "set_updated_at" ON "my_table";
-- CREATE TRIGGER "set_updated_at"
--   BEFORE UPDATE ON "my_table"
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMIT;
