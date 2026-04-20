/**
 * Canonical league persistence contract (TypeScript documentation).
 *
 * AllFantasy production uses **Prisma** (`prisma/schema.prisma` → `League` model), not Drizzle.
 * This module mirrors the intended columns / JSON shape for cross-team contracts and future
 * Drizzle migrations if the stack is unified later.
 *
 * ## Column mapping (Prisma `League`)
 *
 * | Contract field        | Prisma field              | Notes |
 * |-----------------------|---------------------------|-------|
 * | id                    | `id` (uuid)               | |
 * | league_name           | `name`                    | |
 * | concept               | `leagueType`              | snake_case format id (redraft, dynasty, …) |
 * | sport                 | `sport` (`LeagueSport`)   | |
 * | scoring_preset        | `scoringPresetId`         | |
 * | team_count            | `leagueSize`              | |
 * | draft_type            | `redraftLeagueDraftProfile.draftType` + `LeagueSettings` | |
 * | commissioner_id       | `userId`                  | **Never** from client body; session → AppUser.id |
 * | status                | `status`                  | canonical create uses `setup` |
 * | preset_key            | `presetKey`               | |
 * | settings_snapshot     | `settings` (Json)         | full `SettingsSnapshot` + legacy keys |
 * | concept_rules         | `settings.conceptRules`   | also top-level `conceptRules` in snapshot |
 * | visual_theme          | `settings.visualTheme`    | |
 * | media_settings        | `settings.mediaSettings`  | |
 * | flags                 | `settings.metadata` / derived booleans on `League` | |
 * | created_at / updated_at | `createdAt` / `updatedAt` | |
 *
 * ## Optional future audit table
 *
 * `league_settings_versions (id, league_id, version, snapshot jsonb, created_at)` — not implemented yet.
 *
 * ## Members
 *
 * Commissioner row: `RedraftLeagueMember` with `role = COMMISSIONER` (existing pattern).
 */

import type { LeagueSport } from '@prisma/client'
import type { SettingsSnapshot } from '@/lib/league-contract/types'

/** Document-only shape; Prisma `League` is the source of truth. */
export interface CanonicalLeagueRow {
  id: string
  leagueName: string
  concept: string
  sport: LeagueSport
  scoringPreset: string
  teamCount: number
  commissionerId: string
  status: string
  presetKey: string | null
  settingsSnapshot: SettingsSnapshot & Record<string, unknown>
}
