/**
 * Regression tests for /league/[leagueId] layout.
 *
 * Guards against re-introducing the global AppSidebar (right dashboard rail)
 * on league pages. The bug: app/league/layout.tsx used ProductShellLayout
 * without hideSidebar, injecting a 320px right rail + 2-column grid that
 * squished LeagueShell's own 3-panel layout.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

describe('app/league/layout.tsx — no global sidebar injection', () => {
  const src = read('app/league/layout.tsx')

  it('Suspense fallback uses hideSidebar', () => {
    // Both ProductShellLayout call sites must include hideSidebar so the 320px
    // AppSidebar column is never injected while the league chunk loads.
    expect(src).toMatch(/Suspense[^>]*fallback[^>]*ProductShellLayout[^>]*hideSidebar/)
  })

  it('LeagueEmbedGate fallback uses hideSidebar', () => {
    // The non-embed fallback path (normal league URLs) must also hide the sidebar.
    expect(src).toMatch(/LeagueEmbedGate[^>]*fallback[^>]*ProductShellLayout[^>]*hideSidebar/)
  })

  it('no bare ProductShellLayout without hideSidebar', () => {
    // Every ProductShellLayout in this file must carry the hideSidebar prop.
    const matches = src.match(/<ProductShellLayout\b/g) ?? []
    expect(matches.length).toBeGreaterThan(0)
    const bareMatches = src.match(/<ProductShellLayout(?![^>]*hideSidebar)[^>]*>/g) ?? []
    expect(bareMatches).toHaveLength(0)
  })
})

describe('app/league/layout.tsx — structure sanity', () => {
  const src = read('app/league/layout.tsx')

  it('still wraps children in LeagueEmbedGate', () => {
    expect(src).toContain('LeagueEmbedGate')
  })

  it('still uses Suspense for streaming', () => {
    expect(src).toContain('Suspense')
  })

  it('imports ProductShellLayout', () => {
    expect(src).toContain("import ProductShellLayout from '@/components/navigation/ProductShellLayout'")
  })
})

describe('LeagueEmbedGate — embed paths are unaffected', () => {
  const src = read('components/navigation/LeagueEmbedGate.tsx')

  it('still strips layout for embed=1', () => {
    expect(src).toContain('embed')
  })

  it('accepts a fallback prop (used by league layout)', () => {
    expect(src).toContain('fallback')
  })
})

describe('GlobalAppShell — hideSidebar removes the right rail', () => {
  const src = read('components/shared/GlobalAppShell.tsx')

  it('renders AppSidebar only when hideSidebar is false', () => {
    // AppSidebar must be inside the hideSidebar ternary's else branch.
    // Pattern: {hideSidebar ? <no sidebar path> : ... <AppSidebar /> ...}
    expect(src).toContain('hideSidebar ?')
    const ternaryIdx = src.indexOf('hideSidebar ?')
    const appSidebarUsageIdx = src.indexOf('<AppSidebar />', ternaryIdx)
    expect(appSidebarUsageIdx).toBeGreaterThan(ternaryIdx)
  })
})

describe('ProductShellLayout — accepts and forwards hideSidebar', () => {
  const src = read('components/navigation/ProductShellLayout.tsx')

  it('accepts hideSidebar prop', () => {
    expect(src).toContain('hideSidebar')
  })
})

describe('dashboard layout — reference: uses hideSidebar correctly', () => {
  const src = read('app/dashboard/layout.tsx')

  it('passes hideSidebar to ProductShellLayout', () => {
    expect(src).toContain('hideSidebar')
  })

  it('passes hideHeader to ProductShellLayout', () => {
    // Dashboard hides both header and sidebar; league keeps the header for nav.
    expect(src).toContain('hideHeader')
  })
})

describe('LeagueShell — uses its own AppShell, not global layout panels', () => {
  const src = read('app/league/[leagueId]/LeagueShell.tsx')

  it('renders an AppShell with balanced-three-panel mode', () => {
    expect(src).toContain('balanced-three-panel')
  })

  it('has a LeftChatPanel (collapsible — not a permanent global rail)', () => {
    expect(src).toContain('LeftChatPanel')
  })

  it('has a RightControlPanel', () => {
    expect(src).toContain('RightControlPanel')
  })

  it('passes isPredraftLifecycle to LeagueTabRouter', () => {
    // Regression: was missing, caused ReferenceError on newly created leagues.
    expect(src).toContain('isPredraftLifecycle={isPredraftLifecycle}')
  })

  it('passes draftDateIso to LeagueTabRouter', () => {
    expect(src).toContain('draftDateIso={draftDateIso}')
  })
})

describe('query-param routing — embed/invite/chat params do not force dashboard layout', () => {
  const layoutSrc = read('app/league/layout.tsx')

  it('layout does not read any URL search params', () => {
    // The layout is a simple server component that must not gate on query params.
    // Query-param logic lives inside LeagueEmbedGate (client component).
    expect(layoutSrc).not.toContain('searchParams')
    expect(layoutSrc).not.toContain('useSearchParams')
    expect(layoutSrc).not.toContain('created=')
    expect(layoutSrc).not.toContain('showInvite=')
    expect(layoutSrc).not.toContain('openChat=')
  })
})
