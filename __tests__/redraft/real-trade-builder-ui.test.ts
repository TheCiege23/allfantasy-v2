import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
}

const tradeCenterSrc = read('app/league/[leagueId]/tabs/redraft/TradeCenter.tsx')
const redraftTabSrc = read('app/league/[leagueId]/tabs/RedraftTab.tsx')
const clientSrc = read('lib/redraft/client.ts')

describe('redraft real trade builder UI contract', () => {
  it('renders a creation surface for selecting players and picks from both rosters', () => {
    expect(tradeCenterSrc).toContain('Trade Creation')
    expect(tradeCenterSrc).toContain('Roster A')
    expect(tradeCenterSrc).toContain('Roster B')
    expect(tradeCenterSrc).toContain('Select Player')
    expect(tradeCenterSrc).toContain('Select Pick')
    expect(tradeCenterSrc).toContain('Search roster players')
  })

  it('loads actual roster players for the active redraft week', () => {
    expect(tradeCenterSrc).toContain('fetchRedraftRoster')
    expect(tradeCenterSrc).toContain('currentWeek')
    expect(redraftTabSrc).toContain('currentWeek={currentWeek}')
  })

  it('sends selected player and pick assets to the canonical proposal API', () => {
    expect(tradeCenterSrc).toContain('assets: apiAssets')
    expect(tradeCenterSrc).toContain("assetType: 'player'")
    expect(tradeCenterSrc).toContain("assetType: 'draft_pick'")
    expect(clientSrc).toContain('export type RedraftTradeAssetInput')
    expect(clientSrc).toContain('assets?: RedraftTradeAssetInput[]')
  })

  it('shows the pre-submit analyzer fields requested for production', () => {
    expect(tradeCenterSrc).toContain('Fairness score')
    expect(tradeCenterSrc).toContain('Risk score')
    expect(tradeCenterSrc).toContain('Positional impact')
    expect(tradeCenterSrc).toContain('Chimmy Explanation')
    expect(tradeCenterSrc).toContain('analyzeRedraftTradeBuilder')
  })

  it('does not expose dynasty value copy in the redraft builder', () => {
    expect(tradeCenterSrc.toLowerCase()).not.toContain('dynasty value')
    expect(tradeCenterSrc).not.toContain('Dynasty value')
  })
})
