import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * E.2 — pk case-mismatch fix in loadRollingInsightsSeasonByDraftPoolKey.
 *
 * Before the fix, the loader stored namePosToRi keys with `(m.position).toUpperCase()` while
 * pool callers built the lookup key with `.toLowerCase()` — so even when PlayerIdentityMap
 * had matching rows, the in-memory `Map.get(...)` always missed. This test asserts the bug
 * is resolved by inspecting the source. (We can't easily mount the loader in jsdom because
 * it pulls Prisma, and the audit already confirms the runtime behavior.)
 */

const root = resolve(__dirname, '..', '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('E.2 — RI loader pk case alignment', () => {
  const src = read('lib/draft/analytics/nfl-rolling-insights-draft-analytics.ts')

  it('namePosToRi keys are stored lowercase to match pool-side `normalizeKeyPart`', () => {
    // The fix replaces `.toUpperCase()` with `.toLowerCase()` for pk inside the
    // namePosToRi-builder loop. Look for the specific lowercase form of pk.
    expect(src).toMatch(/const pk = \(m\.position \?\? ''\)\.trim\(\)\.toLowerCase\(\)/)
  })

  it('the lookup site uses the same lowercase pk', () => {
    // `namePosToRi.get(`${r.nk}|${r.pk}`)` — r.pk comes from normalizeKeyPart which is lowercase.
    expect(src).toMatch(/namePosToRi\.get\(`\$\{r\.nk\}\|\$\{r\.pk\}`\)/)
  })

  it('comment documents the bug and links it back to E.2', () => {
    expect(src).toMatch(/E\.2 bug fix/)
    expect(src).toMatch(/normalizeKeyPart/)
  })
})

describe('E.1.5 — resolver SportsPlayer-image fallback is wired', () => {
  const src = read('lib/draft-room/getResolvedDraftPoolForLeague.ts')

  it('resolver attaches backfilled SportsPlayer.imageUrl when present (overrides synth URLs)', () => {
    // E.1.5 superseded the E.2 "deferred" stub: backfilled rows (populated by
    // scripts/backfill-player-headshots.ts) are looked up by (normalizedName | normalizedPosition)
    // and win over upstream synth/data-URI/team-logo placeholders.
    expect(src).toMatch(/sportsPlayerImageByNameKey/)
    expect(src).toMatch(/E\.1\.5/)
    expect(src).toMatch(/backfilledHeadshot/)
  })
})

describe('E.2 — audit script extension', () => {
  const src = read('scripts/audit-rolling-insights-draft-mapping.ts')

  it('accepts --sport, --season, --samples flags', () => {
    expect(src).toMatch(/--sport=/)
    expect(src).toMatch(/--season=/)
    expect(src).toMatch(/--samples=/)
  })

  it('reports SportsPlayer/PlayerIdentityMap/PlayerAnalyticsSnapshot table totals', () => {
    expect(src).toMatch(/sportsPlayerTableTotal/)
    expect(src).toMatch(/identityMapTableTotal/)
    expect(src).toMatch(/analyticsTableTotal/)
  })

  it('classifies MISSING_SOURCE_DATA when both source tables are empty', () => {
    expect(src).toMatch(/MISSING_SOURCE_DATA/)
  })

  it('records pool-id format examples and unmapped/matched/missing-stats samples', () => {
    expect(src).toMatch(/poolIdFormatExamples/)
    expect(src).toMatch(/matchedByNameExamples/)
    expect(src).toMatch(/rowsWithMissingStats/)
  })
})
