---
title: Supabase Migration File Naming Convention
impact: HIGH
impactDescription: Correct ordering ensures migrations apply in sequence without conflicts
tags: migration, naming, supabase-cli, file-convention
---

## Supabase Migration File Naming Convention

Supabase CLI applies migration files in lexicographic order based on filename. Using the correct timestamp format prevents ordering conflicts and makes migration history clear.

**Minimal (ambiguous ordering):**

```
migrations/
  add_sport_column.sql          -- No timestamp, unpredictable order
  fix_leagues.sql               -- Which came first?
```

**Production-ready (Supabase convention):**

```
migrations/
  20260319000000_init_from_prisma.sql     -- Baseline schema
  20260319201130_add_sport_columns.sql    -- Second migration
  20260401153000_add_trade_deadline.sql   -- Third migration
```

Format: `YYYYMMDDHHmmSS_description.sql`

**Creating a new migration:**

```bash
# Via Supabase CLI (auto-generates timestamp)
supabase migration new add_sport_columns

# Manual creation (use current UTC timestamp)
# File: supabase/migrations/20260401153000_add_sport_columns.sql
```

**AllFantasy convention:**

```
supabase/migrations/
  20260319_init_from_prisma.sql           -- Baseline: full Prisma export (8,617 lines)
  20260319201130_new-migration.sql        -- Incremental changes

# Standalone ensure scripts (run via SQL Editor, not CLI):
supabase_ensure_sport_columns.sql
supabase_ensure_sport_type_columns.sql
supabase_ensure_user_profile_rank_columns.sql
supabase_ensure_auto_coach_settings.sql
```

**Rules:**
- Timestamps must be UTC
- Descriptions use snake_case with hyphens also acceptable
- Never rename a migration that has been applied to any environment
- Empty migration files are valid placeholders but should be cleaned up before deploy
- Files prefixed with `_` (e.g., `_template.sql`) are conventionally ignored

Reference: [Supabase Migrations](https://supabase.com/docs/guides/cli/managing-environments)
