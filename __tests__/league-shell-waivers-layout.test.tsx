import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

describe('League shell layout and waivers integration', () => {
  const leagueShell = read('app/league/[leagueId]/LeagueShell.tsx')
  const appShell = read('app/components/AppShell.tsx')
  const leagueTabs = read('app/league/[leagueId]/LeagueTabs.tsx')
  const waiverWire = read('components/waiver-wire/WaiverWirePage.tsx')
  const waiverAiPanel = read('components/waivers/AIWaiverRecommendationsPanel.tsx')
  const commissionerPanel = read('components/waivers/CommissionerWaiverInsightsPanel.tsx')
  const sportAwareWaiverWire = read('components/waiver-wire/SportAwareWaiverWire.tsx')

  it('uses full-width 3-column shell sizing with fixed desktop rails and flexible center', () => {
    expect(appShell).toContain('md:w-[clamp(300px,24vw,360px)]')
    expect(appShell).toContain('w-[clamp(280px,22vw,340px)]')
    expect(appShell).toContain('md:min-w-0 md:flex-1 xl:min-w-[640px]')
  })

  it('keeps league chat as the default left chat tab for league pages', () => {
    expect(leagueShell).toContain("normalizeOpenChatQueryParam(openChatQuery) ?? 'league'")
  })

  it('sets predraft default center tab to Draft/Draft Setup (draft or home)', () => {
    expect(leagueShell).toContain("const isPredraftLifecycle = useMemo(() =>")
    expect(leagueShell).toContain("if (ids.has('draft')) setActiveTab('draft')")
    expect(leagueShell).toContain("else if (ids.has('home')) setActiveTab('home')")
  })

  it('includes waivers in league tab definitions and nfl redraft core tabs', () => {
    expect(leagueTabs).toContain("{ id: 'waivers', label: 'Waivers' }")
    expect(leagueShell).toContain("{ id: 'waivers', label: 'Waivers' }")
  })

  it('maps waivers deep links to waivers tab instead of players', () => {
    expect(leagueShell).toContain("waivers: 'waivers'")
    expect(leagueShell).not.toContain("waivers: 'players'")
  })

  it('renders WaiverWirePage in the center workspace when waivers tab is selected', () => {
    expect(leagueShell).toContain("case 'waivers':")
    expect(leagueShell).toContain("return <SportAwareWaiverWire leagueId={leagueId} />")
    expect(sportAwareWaiverWire).toContain('return <WaiverWirePage leagueId={leagueId} />')
  })

  it('renders AF Pro waiver AI locked/recommendations panel within waiver page', () => {
    expect(waiverWire).toContain('<AIWaiverRecommendationsPanel leagueId={leagueId} />')
    expect(waiverAiPanel).toContain('AF_PRO_REQUIRED')
    expect(waiverAiPanel).toContain('AI waiver recommendations are an AF Pro feature.')
  })

  it('renders commissioner waiver insights panel with lock state within waiver page', () => {
    expect(waiverWire).toContain('<CommissionerWaiverInsightsPanel leagueId={leagueId} />')
    expect(commissionerPanel).toContain('AF_COMMISSIONER_REQUIRED')
    expect(commissionerPanel).toContain('League-wide AI waiver tools require AF Commissioner.')
  })
})
