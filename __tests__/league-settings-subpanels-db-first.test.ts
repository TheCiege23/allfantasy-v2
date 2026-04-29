import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * DB-first guard: Draft results in LeagueSettingsSubPanels must not call Sleeper draft URLs from the client.
 * Sleeper reads go through lib/sleeper/sync/* and /api/leagues/... routes.
 */
describe('LeagueSettingsSubPanels DB-first (draft host)', () => {
  const file = resolve(__dirname, '../app/league/[leagueId]/components/LeagueSettingsSubPanels.tsx')
  const src = readFileSync(file, 'utf8')

  it('does not embed api.sleeper.app/v1/draft in the component source', () => {
    expect(src).not.toMatch(/api\.sleeper\.app\/v1\/draft/i)
  })

  it('keeps draft history on internal API routes', () => {
    expect(src).toContain('/sleeper-hosted-draft-history')
    expect(src).toContain('/sleeper-hosted-draft/')
  })
})
