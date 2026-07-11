import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { translations } from '@/lib/i18n/translations'

const root = resolve(__dirname, '..')

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

const PROMO_SRC = read('app/dashboard/components/WorldCupDashboardPromo.tsx')
const OVERVIEW_SRC = read('app/dashboard/components/DashboardOverview.tsx')

const PROMO_KEYS = [
  'dashboard.worldCupPromo.eyebrow',
  'dashboard.worldCupPromo.status',
  'dashboard.worldCupPromo.headline',
  'dashboard.worldCupPromo.subheadline',
  'dashboard.worldCupPromo.feature.aiInsights',
  'dashboard.worldCupPromo.feature.commissionerTools',
  'dashboard.worldCupPromo.feature.inviteLinks',
  'dashboard.worldCupPromo.feature.groupPredictions',
  'dashboard.worldCupPromo.feature.knockoutBrackets',
  'dashboard.worldCupPromo.feature.liveExperience',
  'dashboard.worldCupPromo.createPool',
  'dashboard.worldCupPromo.joinPool',
  'dashboard.worldCupPromo.buildBracket',
  'dashboard.worldCupPromo.premiumCallout',
  'dashboard.worldCupPromo.proLink',
  'dashboard.worldCupPromo.tokensLink',
]

describe('dashboard World Cup promo', () => {
  it('is moved out of the primary Dashboard experience (Dashboard V2 Phase 2.1) but not deleted', () => {
    // The promo no longer renders on /dashboard — Phase 2.1's Global Command Center Hero replaces
    // it in the primary dashboard flow. The component itself still exists and is reachable via
    // /brackets/world-cup (see the route assertions below), so this is a relocation, not a removal.
    expect(OVERVIEW_SRC).not.toContain("import { WorldCupDashboardPromo } from './WorldCupDashboardPromo'")
    expect(OVERVIEW_SRC).not.toContain('<WorldCupDashboardPromo />')
    expect(PROMO_SRC).toContain('export function WorldCupDashboardPromo')
  })

  it('uses the existing World Cup, Pro, and token routes', () => {
    expect(PROMO_SRC).toContain('href="/brackets/world-cup/create"')
    expect(PROMO_SRC).toContain('href="/brackets/world-cup/join"')
    expect(PROMO_SRC).toContain('href="/brackets/world-cup"')
    expect(PROMO_SRC).toContain('href="/pricing"')
    expect(PROMO_SRC).toContain('href="/tokens"')
  })

  it('has English and Spanish bundled copy for every visible label', () => {
    for (const key of PROMO_KEYS) {
      expect(translations.en[key], `Missing English key ${key}`).toBeTruthy()
      expect(translations.es[key], `Missing Spanish key ${key}`).toBeTruthy()
    }

    expect(translations.en['dashboard.worldCupPromo.headline']).toBe('⚽ Create Your 2026 World Cup Pool')
    expect(translations.es['dashboard.worldCupPromo.headline']).toContain('Mundial 2026')
    expect(translations.es['dashboard.worldCupPromo.headline']).not.toBe(
      translations.en['dashboard.worldCupPromo.headline'],
    )
  })

  it('keeps the premium callout and tappable mobile targets wired', () => {
    expect(PROMO_SRC).toContain("t('dashboard.worldCupPromo.premiumCallout')")
    expect(PROMO_SRC).toContain('min-h-12 touch-manipulation')
    expect(PROMO_SRC).toContain('sm:grid-cols-3')
    expect(PROMO_SRC).toContain('data-testid="dashboard-world-cup-promo"')
  })
})
