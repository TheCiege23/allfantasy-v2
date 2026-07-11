/**
 * Phase 4.2 — Import Visual Upgrade regression guards (post-import surfaces).
 *
 * Structural tests: confirm test IDs, shared Dashboard V2 motion classes, the
 * fixed-dark shell scope, and the wiring points to the persisted-warning API.
 * Not screenshots — a future refactor can't silently drop them.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
const results = readFileSync(
  resolve(root, 'components/unified-import-ui/LegacyImportResults.tsx'),
  'utf8',
)
const warnings = readFileSync(
  resolve(root, 'components/unified-import-ui/ImportWarningsCard.tsx'),
  'utf8',
)
const health = readFileSync(
  resolve(root, 'components/unified-import-ui/ImportHealthIndicator.tsx'),
  'utf8',
)

describe('LegacyImportResults — Phase 4.2 visual upgrade (structural)', () => {
  it('preserves the results-screen test id downstream QA depends on', () => {
    expect(results).toContain('data-testid="legacy-import-results-screen"')
  })

  it('applies the fixed-dark shell scope so light-theme regressions are impossible', () => {
    expect(results).toContain('af-import-shell')
  })

  it('uses shared Dashboard V2 motion classes (warroom-*)', () => {
    expect(results).toContain('warroom-fade-in-stagger')
    expect(results.split('warroom-card').length).toBeGreaterThanOrEqual(2)
    // pressable is applied on primary CTA + secondary buttons
    expect(results.split('warroom-pressable').length).toBeGreaterThanOrEqual(4)
  })

  it('renders the persisted-warnings card for the league_created variant', () => {
    expect(results).toContain('<ImportWarningsCard')
    expect(results).toContain('handleSummary')
  })

  it('renders an ImportHealthIndicator for both variants', () => {
    // Two occurrences: legacy_sleeper + league_created
    expect(results.split('<ImportHealthIndicator').length).toBeGreaterThanOrEqual(3)
  })

  it('shows the historical timeline test id when league_history is present', () => {
    expect(results).toContain('data-testid="import-history-timeline"')
  })
})

describe('ImportWarningsCard (Phase 4.2)', () => {
  it('fetches from the existing persisted-warning API', () => {
    expect(warnings).toContain('/api/leagues/')
    expect(warnings).toContain('/import/warnings')
  })

  it('exposes a testid and severity-driven states', () => {
    expect(warnings).toContain('data-testid="import-warnings-card"')
    expect(warnings).toContain("data-state=\"clean\"")
    expect(warnings).toContain("data-state=\"warnings\"")
    expect(warnings).toContain("data-state=\"error\"")
  })

  it('uses shared warroom motion classes', () => {
    expect(warnings).toContain('warroom-card')
    expect(warnings).toContain('warroom-fade-in-stagger')
  })
})

describe('ImportHealthIndicator (Phase 4.2)', () => {
  it('exposes a testid + status attribute for QA hooks', () => {
    expect(health).toContain('data-testid="import-health-indicator"')
    expect(health).toContain('data-health-status={health.status}')
  })

  it('uses shared warroom motion classes', () => {
    expect(health).toContain('warroom-card')
    expect(health).toContain('warroom-fade-in-stagger')
  })
})
