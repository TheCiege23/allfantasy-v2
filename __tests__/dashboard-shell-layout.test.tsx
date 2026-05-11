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
    expect(dashboardShell).toContain('leftPanel={')
    expect(dashboardShell).toContain('rightPanel={')
  })

  it('keeps the shared shell adjacent and full width on desktop', () => {
    expect(appShell).toContain('data-af-layout-mode={balancedDesktopLayout ? \'balanced-three-panel\' : \'legacy-rail-clamp\'}')
    expect(appShell).toContain('md:[grid-template-columns:minmax(280px,40fr)_minmax(0,30fr)_minmax(280px,30fr)]')
  })
})
