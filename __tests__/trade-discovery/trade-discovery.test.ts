import { describe, it, expect } from 'vitest'
import { needsSurplus, findPartners, findPackages, type DiscoveryRoster, type DiscoveryPlayer } from '@/lib/trade-discovery/redraftTradeDiscovery'

function pl(playerId: string, position: string, value: number | null, isLocked = false): DiscoveryPlayer {
  return { playerId, playerName: `${position} ${playerId}`, position, value, isLocked }
}

// Contender weak at WR, surplus at RB.
const myRoster: DiscoveryRoster = {
  rosterId: 'me', teamName: 'My Team', stance: 'contender',
  weakPositions: ['WR'], strongPositions: ['RB'], faabBalance: 50, recentTradeCount: 1,
  players: [pl('r1', 'RB', 4000), pl('r2', 'RB', 3500), pl('r3', 'RB', 3000), pl('q1', 'QB', 4500), pl('t1', 'TE', 2500)],
}
// Rebuilder weak at RB, surplus at WR.
const partner: DiscoveryRoster = {
  rosterId: 'p1', teamName: 'Partner', managerDisplayName: 'Manager P', stance: 'rebuilder',
  weakPositions: ['RB'], strongPositions: ['WR'], faabBalance: 30, recentTradeCount: 2,
  players: [pl('w1', 'WR', 3800), pl('w2', 'WR', 3400), pl('w3', 'WR', 3000), pl('q2', 'QB', 4000), pl('t2', 'TE', 2400)],
}

describe('needsSurplus', () => {
  it('flags below-need positions as needs and 2+ over need as surpluses', () => {
    const ns = needsSurplus(myRoster.players)
    expect(ns.needs).toContain('WR') // 0 WR < need 2
    expect(ns.surpluses).toContain('RB') // 3 RB >= 2+2
  })
})

describe('findPartners', () => {
  it('scores a complementary contender↔rebuilder match highly with reasons', () => {
    const [match] = findPartners({ myRoster, otherRosters: [partner], sport: 'NFL' })
    expect(match.rosterId).toBe('p1')
    expect(match.matchScore).toBeGreaterThan(60)
    expect(match.matchReasons.join(' ')).toMatch(/surplus|need|Complementary/i)
    expect(match.warningFlags).toContain('TRADE_BLOCK_UNAVAILABLE')
  })
  it('reduces score + flags NCAAF limited data', () => {
    const nfl = findPartners({ myRoster, otherRosters: [partner], sport: 'NFL' })[0]
    const ncaaf = findPartners({ myRoster, otherRosters: [partner], sport: 'NCAAF' })[0]
    expect(ncaaf.matchScore).toBeLessThan(nfl.matchScore)
    expect(ncaaf.warningFlags).toContain('NCAAF_LIMITED_DATA')
  })
})

describe('findPackages', () => {
  it('suggests deterministic packages and never includes unowned or locked assets', () => {
    const pkgs = findPackages({ myRoster, partnerRoster: partner, sport: 'NFL', faabSupported: true, draftPickTrading: false })
    expect(pkgs.length).toBeGreaterThan(0)
    const myIds = new Set(myRoster.players.map((p) => p.playerId))
    const partnerIds = new Set(partner.players.map((p) => p.playerId))
    for (const pkg of pkgs) {
      for (const g of pkg.giveAssets) if (g.kind === 'player') expect(myIds.has(g.playerId!)).toBe(true)
      for (const r of pkg.receiveAssets) if (r.kind === 'player') expect(partnerIds.has(r.playerId!)).toBe(true)
    }
  })
  it('omits locked players from suggestions', () => {
    const locked: DiscoveryRoster = { ...myRoster, players: [pl('r1', 'RB', 4000, true), pl('r2', 'RB', 3500), pl('r3', 'RB', 3000)] }
    const pkgs = findPackages({ myRoster: locked, partnerRoster: partner, sport: 'NFL', faabSupported: true, draftPickTrading: false })
    for (const pkg of pkgs) expect(pkg.giveAssets.every((g) => g.playerId !== 'r1')).toBe(true)
  })
  it('assigns balanced band to near-equal value swaps and flags lopsided gaps', () => {
    const pkgs = findPackages({ myRoster, partnerRoster: partner, sport: 'NFL', faabSupported: true, draftPickTrading: false })
    expect(pkgs.some((p) => p.fairnessBand === 'balanced')).toBe(true)
    for (const p of pkgs) if (p.fairnessBand === 'lopsided') expect(p.warningFlags).toContain('VALUE_GAP_HIGH')
  })
  it('returns low confidence + no canStartProposal when a value is missing', () => {
    const noVal: DiscoveryRoster = { ...partner, players: [pl('w1', 'WR', null), pl('w2', 'WR', null), pl('w3', 'WR', null)] }
    const pkgs = findPackages({ myRoster, partnerRoster: noVal, sport: 'NFL', faabSupported: true, draftPickTrading: false })
    for (const p of pkgs) {
      expect(p.fairnessBand).toBe('low confidence')
      expect(p.canStartProposal).toBe(false)
      expect(p.warningFlags).toContain('LOW_DATA_CONFIDENCE')
    }
  })
  it('returns a safe empty list when there is nothing tradeable', () => {
    const empty: DiscoveryRoster = { ...partner, players: [] }
    expect(findPackages({ myRoster, partnerRoster: empty, sport: 'NFL', faabSupported: true, draftPickTrading: false })).toEqual([])
  })
  it('contains no PII', () => {
    const json = JSON.stringify(findPackages({ myRoster, partnerRoster: partner, sport: 'NFL', faabSupported: true, draftPickTrading: false })).toLowerCase()
    for (const banned of ['email', 'token', 'session', 'password', '@', 'authorization']) expect(json.includes(banned)).toBe(false)
  })
})
