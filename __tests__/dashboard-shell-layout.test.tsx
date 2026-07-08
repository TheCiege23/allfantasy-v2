import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('Dashboard shell layout preset', () => {
  const appShell = read('app/components/AppShell.tsx')
  const dashboardShell = read('app/dashboard/DashboardShell.tsx')

  it('opts the dashboard into the balanced three-panel preset', () => {
    expect(dashboardShell).toContain('layoutMode="balanced-three-panel"')
    expect(dashboardShell).toContain('rightRailCollapsed={myLeaguesRail.collapsed}')
    expect(dashboardShell).toContain('rightPanel={')
  })

  it('replaces the permanent left chat column with floating Communications (Phase 2.5)', () => {
    // The dashboard no longer mounts a persistent left chat column; it hides the left rail and
    // moves chat into the on-demand FloatingCommunications panel instead.
    expect(dashboardShell).toContain('hideLeftRail')
    expect(dashboardShell).toContain('leftPanel={null}')
    expect(dashboardShell).toContain('<FloatingCommunications')
  })

  it('keeps the shared shell adjacent and full width on desktop', () => {
    expect(appShell).toContain('data-af-layout-mode={balancedDesktopLayout ? \'balanced-three-panel\' : \'legacy-rail-clamp\'}')
    expect(appShell).toContain('md:[grid-template-columns:minmax(280px,40fr)_minmax(0,35fr)_minmax(240px,25fr)]')
  })

  it('AppShell hideLeftRail is additive — the left rail still renders by default', () => {
    // Default (no hideLeftRail) must keep rendering the left rail so every other consumer
    // (league route, etc.) is unaffected.
    expect(appShell).toContain('hideLeftRail = false')
    expect(appShell).toContain('{hideLeftRail ? null : (')
  })

  it('AppShell hideRightRail is additive — the right rail still renders by default (Phase 3.8D)', () => {
    // Symmetric to hideLeftRail: default false so LeagueShell / matchups / standings / survivor /
    // ProductShell keep their right rail unchanged. When true the right <aside> is omitted and the
    // grid becomes a single full-width column.
    expect(appShell).toContain('hideRightRail = false')
    expect(appShell).toContain('{hideRightRail ? null : (')
    expect(appShell).toContain("noLeftNoRight: 'md:[grid-template-columns:minmax(0,1fr)]'")
  })

  it('the dashboard overview drops its right rail and rehomes the rail affordances into the header (Phase 3.8D)', () => {
    // Rail removed on the dashboard overview only — the embedded league route keeps its right panel.
    expect(dashboardShell).toContain('hideRightRail={!isLeagueRoute}')
    // rightPanel is still passed (the rail remains for the embedded league route + mobile drawer).
    expect(dashboardShell).toContain('rightPanel={')
    // Create/Import + profile/plan/account are rehomed into the desktop header.
    expect(dashboardShell).toContain('<DashboardHeaderControls')
  })
})
